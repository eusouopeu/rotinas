// Main process: janela, storage em disco (mesmo formato do Capacitor), tray e boot do servidor MCP.
"use strict";

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const syncEngine = require("../sync/engine.js");

app.setName("Brita"); // define o nome antes de qualquer app.getPath("userData")

const DATA_DIR = path.join(app.getPath("userData"), "brita");
const MCP_CONFIG_PATH = path.join(app.getPath("userData"), "mcp-config.json");
const MCP_LOG_LIMIT = 50;
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

let mainWindow = null;
let tray = null;
let mcpConfig = null;
let mcpCallLog = [];
let mcpServerHandle = null;
const pendingMcpCalls = new Map();
let mcpCallSeq = 0;
let syncIntervalHandle = null;

/* ---------------- Storage: um arquivo JSON por chave, igual ao Capacitor Filesystem no APK ---------------- */

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
function keyPath(key) {
  if (!/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error("chave de storage inválida: " + key);
  return path.join(DATA_DIR, key + ".json");
}

ipcMain.handle("storage:getAll", async () => {
  ensureDataDir();
  let files = [];
  try { files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json")); } catch (e) { return []; }
  const out = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, f), "utf8");
      out.push([f.slice(0, -5), JSON.parse(raw)]);
    } catch (e) { /* arquivo corrompido: ignora, não derruba o boot */ }
  }
  return out;
});
ipcMain.handle("storage:set", async (_e, key, val) => {
  ensureDataDir();
  fs.writeFileSync(keyPath(key), JSON.stringify(val));
});
ipcMain.handle("storage:del", async (_e, key) => {
  try { fs.unlinkSync(keyPath(key)); } catch (e) { /* já não existe */ }
});

/* ---------------- Config do servidor MCP (porta, token, modo) ---------------- */

function loadMcpConfig() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, "utf8")); } catch (e) { /* primeira execução */ }
  if (typeof cfg !== "object" || cfg === null) cfg = {};
  let changed = false;
  if (!cfg.token) { cfg.token = crypto.randomBytes(24).toString("hex"); changed = true; }
  if (!cfg.port) { cfg.port = 8765; changed = true; }
  if (!cfg.mode) { cfg.mode = "read"; changed = true; } // off | read | write
  if (changed) saveMcpConfig(cfg);
  return cfg;
}
function saveMcpConfig(cfg) {
  fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function logMcpCall(entry) {
  mcpCallLog.push({ ...entry, ts: Date.now() });
  if (mcpCallLog.length > MCP_LOG_LIMIT) mcpCallLog = mcpCallLog.slice(-MCP_LOG_LIMIT);
}

/* Encaminha uma chamada de tool para o renderer (onde vive a lógica de negócio real do app)
   e espera a resposta de volta via IPC — ver electron/preload.js e o bridge __britaMCP no index.html. */
function callRenderer(tool, args) {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) return reject(new Error("janela do Brita não está disponível"));
    const id = String(++mcpCallSeq);
    const timer = setTimeout(() => {
      if (pendingMcpCalls.has(id)) { pendingMcpCalls.delete(id); reject(new Error("tempo esgotado esperando o app")); }
    }, 15000);
    pendingMcpCalls.set(id, { resolve, reject, timer });
    mainWindow.webContents.send("mcp:call", { id, tool, args });
  });
}
ipcMain.on("app:show", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.on("mcp:result", (_e, { id, result, error }) => {
  const p = pendingMcpCalls.get(id);
  if (!p) return;
  pendingMcpCalls.delete(id);
  clearTimeout(p.timer);
  if (error) p.reject(new Error(error)); else p.resolve(result);
});

/* ---------------- Bridge da mini-player (janela separada, sempre-no-topo) ----------------
   Mesmo padrão round-trip do bridge MCP acima, canal próprio ("player:*") pra
   não depender do modo desligado/leitura/escrita do servidor MCP: a mini-
   player pergunta o estado do player e manda pausar/concluir etapa através
   do main process, que repassa pra janela PRINCIPAL (onde playerState de
   verdade vive) e devolve a resposta. */
const pendingPlayerCalls = new Map();
let playerCallSeq = 0;
function callRendererPlayer(tool, args) {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) return reject(new Error("janela principal do Brita não está disponível"));
    const id = String(++playerCallSeq);
    const timer = setTimeout(() => {
      if (pendingPlayerCalls.has(id)) { pendingPlayerCalls.delete(id); reject(new Error("tempo esgotado esperando o app")); }
    }, 4000);
    pendingPlayerCalls.set(id, { resolve, reject, timer });
    mainWindow.webContents.send("player:call", { id, tool, args });
  });
}
ipcMain.on("player:result", (_e, { id, result, error }) => {
  const p = pendingPlayerCalls.get(id);
  if (!p) return;
  pendingPlayerCalls.delete(id);
  clearTimeout(p.timer);
  if (error) p.reject(new Error(error)); else p.resolve(result);
});
ipcMain.handle("player:getState", () => callRendererPlayer("getState", null));
ipcMain.handle("player:control", (_e, action) => callRendererPlayer("control", action));

/* ---------------- IPC para a tela de Configurações → Integrações ---------------- */

ipcMain.handle("mcp:getStatus", () => ({
  mode: mcpConfig.mode,
  port: mcpConfig.port,
  token: mcpConfig.token,
  running: !!mcpServerHandle,
  log: mcpCallLog.slice().reverse()
}));
ipcMain.handle("mcp:setMode", async (_e, mode) => {
  if (!["off", "read", "write"].includes(mode)) throw new Error("modo inválido");
  mcpConfig.mode = mode;
  saveMcpConfig(mcpConfig);
  await applyMcpServerState();
  return { mode: mcpConfig.mode };
});
ipcMain.handle("mcp:setPort", async (_e, port) => {
  port = +port;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("porta inválida");
  mcpConfig.port = port;
  saveMcpConfig(mcpConfig);
  await applyMcpServerState();
  return { port: mcpConfig.port };
});
ipcMain.handle("mcp:regenerateToken", async () => {
  mcpConfig.token = crypto.randomBytes(24).toString("hex");
  saveMcpConfig(mcpConfig);
  return { token: mcpConfig.token };
});

/* ---------------- Servidor MCP: sobe/desce conforme o modo escolhido em Configurações ---------------- */

async function applyMcpServerState() {
  const shouldRun = mcpConfig.mode !== "off";
  if (shouldRun && !mcpServerHandle) {
    const { startMcpServer } = require("../mcp-server/server.js");
    try {
      mcpServerHandle = await startMcpServer({
        getConfig: () => mcpConfig,
        callRenderer,
        logCall: logMcpCall
      });
    } catch (e) {
      console.error("Falha ao subir servidor MCP:", e);
      mcpServerHandle = null;
    }
  } else if (!shouldRun && mcpServerHandle) {
    await mcpServerHandle.stop();
    mcpServerHandle = null;
  } else if (shouldRun && mcpServerHandle && mcpServerHandle.port !== mcpConfig.port) {
    await mcpServerHandle.stop();
    mcpServerHandle = null;
    await applyMcpServerState();
  }
}

/* ---------------- Sync com Google Drive (seção 5 do plano) ---------------- */

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function runSyncCycle() {
  return syncEngine.syncOnce({
    onApplied: (key, value) => sendToRenderer("sync:applied", { key, value }),
    onConflict: (key, remoteValue) => sendToRenderer("sync:conflict", { key, remoteValue }),
    log: (msg) => console.error("[sync]", msg)
  });
}

ipcMain.handle("sync:getStatus", () => syncEngine.getStatus());
ipcMain.handle("sync:saveClientCreds", (_e, clientId, clientSecret) => {
  syncEngine.saveClientCreds(clientId, clientSecret);
});
ipcMain.handle("sync:connect", async () => { await syncEngine.connect(); return true; });
ipcMain.handle("sync:disconnect", () => { syncEngine.disconnect(); });
ipcMain.handle("sync:syncNow", () => runSyncCycle());
ipcMain.handle("sync:resolveConflict", (_e, key, choice) => syncEngine.resolveConflict(key, choice, {
  onApplied: (k, v) => sendToRenderer("sync:applied", { key: k, value: v })
}));

function startSyncScheduler() {
  if (syncIntervalHandle) return;
  syncIntervalHandle = setInterval(() => {
    if (!syncEngine.isConnected()) return;
    runSyncCycle().catch((e) => console.error("Falha no ciclo de sync:", e));
  }, SYNC_INTERVAL_MS);
}

/* ---------------- Calendário externo (URL secreta iCal, só leitura) ----------------
   Busca feita aqui (main process) porque o fetch do renderer bateria em CORS na
   maioria dos provedores (o endpoint ICS é pensado pra clientes de calendário,
   não pra JS de página) — o Node não tem essa restrição. Sem OAuth, sem estado:
   o renderer manda a URL a cada chamada, nada fica guardado aqui. */
ipcMain.handle("ical:fetch", async (_e, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) throw new Error("URL inválida");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
});

/* ---------------- Janela + tray ---------------- */

// Tamanho/posição lembrados entre aberturas — arquivo próprio (não passa pelo
// storageBackend genérico, que é por CHAVE de app; isto é estado da janela do
// SO, não dado do usuário, e não deve entrar em backup/sync).
const BOUNDS_PATH = path.join(app.getPath("userData"), "window-bounds.json");
function loadWindowBounds() {
  try { return JSON.parse(fs.readFileSync(BOUNDS_PATH, "utf8")); } catch (e) { return null; }
}
function saveWindowBounds(win) {
  try { fs.writeFileSync(BOUNDS_PATH, JSON.stringify(win.getBounds())); } catch (e) { /* não é crítico perder isso */ }
}

function createWindow() {
  const bounds = loadWindowBounds();
  mainWindow = new BrowserWindow({
    width: (bounds && bounds.width) || 1280,
    height: (bounds && bounds.height) || 860,
    x: bounds ? bounds.x : undefined,
    y: bounds ? bounds.y : undefined,
    minWidth: 720,
    minHeight: 560,
    title: "Brita",
    backgroundColor: "#F5F5F8",
    // título nativo escondido: a sidebar flutuante (index.html/app.css, ver
    // body.is-desktop-shell) vira a área de arrasto da janela no lugar dele —
    // "hiddenInset" é macOS-only, no Windows/Linux cai pra "hidden" (Electron
    // ignora trafficLightPosition fora do macOS, sem erro).
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: 18 } }
      : { titleBarStyle: "hidden" }),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "..", "webapp-dist", "index.html"));

  let boundsSaveTimer = null;
  const scheduleBoundsSave = () => {
    clearTimeout(boundsSaveTimer);
    boundsSaveTimer = setTimeout(() => saveWindowBounds(mainWindow), 400);
  };
  mainWindow.on("resize", scheduleBoundsSave);
  mainWindow.on("move", scheduleBoundsSave);

  // Fechar a janela só esconde — o sync (fase futura) e o servidor MCP continuam rodando em segundo plano.
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "..", "icon-512.png");
  let image = nativeImage.createFromPath(iconPath);
  if (!image.isEmpty()) image = image.resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip("Brita");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir Brita", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: "separator" },
    { label: "Sair", click: () => { app.isQuitting = true; app.quit(); } }
  ]));
  tray.on("click", () => { mainWindow.show(); mainWindow.focus(); });
}

/* ---------------- Mini player: janela pequena, sempre no topo ----------------
   Página própria (electron/mini-player.html), NÃO o index.html do app — o
   app inteiro é grande demais pra abrir de novo só pra mostrar um cronômetro;
   a mini-player só fala com a janela principal pelo bridge player:* acima
   (getState a cada 1s, control pra pausar/concluir etapa). */
let miniWindow = null;
function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) { miniWindow.show(); miniWindow.focus(); return; }
  miniWindow = new BrowserWindow({
    width: 300,
    height: 140,
    minWidth: 260,
    minHeight: 120,
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    title: "Brita — player",
    backgroundColor: "#00000000",
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  miniWindow.setAlwaysOnTop(true, "floating");
  miniWindow.loadFile(path.join(__dirname, "mini-player.html"));
  miniWindow.on("closed", () => { miniWindow = null; });
}
ipcMain.on("miniplayer:open", () => createMiniWindow());
ipcMain.on("miniplayer:close", () => { if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close(); });

/* ---------------- Menu nativo ----------------
   Cada item manda uma ação por IPC pro renderer da janela principal (ver
   onMenuAction no preload.js) em vez de reimplementar qualquer lógica aqui —
   mesmo princípio das tools do servidor MCP: o main process não conhece o
   app, só encaminha. */
function sendMenuAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send("menu:action", action);
  }
}
function buildAppMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{
      label: app.name,
      submenu: [
        { role: "about" }, { type: "separator" },
        { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" },
        { role: "quit" }
      ]
    }] : []),
    {
      label: "Arquivo",
      submenu: [
        { label: "Nova rotina", accelerator: "CmdOrCtrl+Shift+R", click: () => sendMenuAction("novaRotina") },
        { label: "Nova nota", accelerator: "CmdOrCtrl+N", click: () => sendMenuAction("novaNota") },
        { label: "Nova tarefa", accelerator: "CmdOrCtrl+Shift+T", click: () => sendMenuAction("novaTarefa") },
        { type: "separator" },
        { label: "Buscar em tudo…", accelerator: "CmdOrCtrl+F", click: () => sendMenuAction("buscar") },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }
      ]
    },
    {
      label: "Ver",
      submenu: [
        { label: "Rotinas", accelerator: "CmdOrCtrl+1", click: () => sendMenuAction("abaRotinas") },
        { label: "Metas", accelerator: "CmdOrCtrl+2", click: () => sendMenuAction("abaMetas") },
        { label: "Modelos", accelerator: "CmdOrCtrl+3", click: () => sendMenuAction("abaModelos") },
        { label: "Ajustes", accelerator: "CmdOrCtrl+4", click: () => sendMenuAction("abaAjustes") },
        { type: "separator" },
        { label: "Mini player sempre no topo", click: () => createMiniWindow() },
        { type: "separator" },
        { role: "reload" }, { role: "toggleDevTools" }
      ]
    },
    { label: "Janela", role: "windowMenu" }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  mcpConfig = loadMcpConfig();
  createWindow();
  createTray();
  buildAppMenu();
  await applyMcpServerState();
  startSyncScheduler();
  if (syncEngine.isConnected()) {
    setTimeout(() => { runSyncCycle().catch((e) => console.error("Falha no sync inicial:", e)); }, 15000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on("window-all-closed", () => {
  // fica vivo (tray) mesmo no Windows/Linux — é o mesmo app rodando o servidor MCP
});
app.on("before-quit", () => { app.isQuitting = true; });
