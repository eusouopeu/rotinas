// Preload: única ponte entre o renderer (index.html, sem Node) e o main process.
// contextIsolation:true + nodeIntegration:false no BrowserWindow — nada de ipcRenderer cru no renderer.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronBridge", {
  // storage: um JSON por chave, mesmo formato do branch isNative do storageBackend
  getAll: () => ipcRenderer.invoke("storage:getAll"),
  set: (key, val) => ipcRenderer.invoke("storage:set", key, val),
  del: (key) => ipcRenderer.invoke("storage:del", key),

  mcp: {
    getStatus: () => ipcRenderer.invoke("mcp:getStatus"),
    setMode: (mode) => ipcRenderer.invoke("mcp:setMode", mode),
    setPort: (port) => ipcRenderer.invoke("mcp:setPort", port),
    regenerateToken: () => ipcRenderer.invoke("mcp:regenerateToken")
  },

  // traz a janela para frente (ex.: clique numa notificação nativa com a janela escondida na tray)
  showWindow: () => ipcRenderer.send("app:show"),

  sync: {
    getStatus: () => ipcRenderer.invoke("sync:getStatus"),
    saveClientCreds: (clientId, clientSecret) => ipcRenderer.invoke("sync:saveClientCreds", clientId, clientSecret),
    connect: () => ipcRenderer.invoke("sync:connect"),
    disconnect: () => ipcRenderer.invoke("sync:disconnect"),
    syncNow: () => ipcRenderer.invoke("sync:syncNow"),
    resolveConflict: (key, choice) => ipcRenderer.invoke("sync:resolveConflict", key, choice)
  },
  // aplica no renderer uma chave que o motor de sync baixou do Drive
  onSyncApplied(handler){
    ipcRenderer.on("sync:applied", (_event, { key, value }) => handler(key, value));
  },
  onSyncConflict(handler){
    ipcRenderer.on("sync:conflict", (_event, { key, remoteValue }) => handler(key, remoteValue));
  },

  // calendário externo (URL secreta iCal) — busca no main process pra não bater
  // em CORS, sem guardar nada além do que o renderer já persiste em rotinas_v2_icalurl
  ical: {
    fetch: (url) => ipcRenderer.invoke("ical:fetch", url)
  },

  // registra o handler que atende chamadas de tool vindas do servidor MCP (main process).
  // handler(tool, args) deve devolver uma Promise com o resultado (ou lançar erro).
  onMcpCall(handler) {
    ipcRenderer.on("mcp:call", async (_event, { id, tool, args }) => {
      try {
        const result = await handler(tool, args);
        ipcRenderer.send("mcp:result", { id, result });
      } catch (e) {
        ipcRenderer.send("mcp:result", { id, error: String((e && e.message) || e) });
      }
    });
  },

  // menu nativo (Arquivo/Ver, ver electron/main.js buildAppMenu) — cada item
  // manda uma ação por aqui em vez de duplicar lógica de negócio no main process
  onMenuAction(handler) {
    ipcRenderer.on("menu:action", (_event, action) => handler(action));
  },

  // player: registrado pela janela PRINCIPAL, responde ao que a mini-player
  // (janela separada, sempre-no-topo) pergunta via miniPlayer.getState/control
  // abaixo. Mesmo padrão round-trip do onMcpCall, canal próprio pra não
  // depender do modo (desligado/leitura/escrita) do servidor MCP.
  onPlayerCall(handler) {
    ipcRenderer.on("player:call", async (_event, { id, tool, args }) => {
      try {
        const result = await handler(tool, args);
        ipcRenderer.send("player:result", { id, result });
      } catch (e) {
        ipcRenderer.send("player:result", { id, error: String((e && e.message) || e) });
      }
    });
  },

  // mini-player: chamado pela JANELA SEPARADA (electron/mini-player.html) —
  // open/close pedem ao main process pra criar/fechar a janela; getState/
  // control fazem o round-trip até a janela principal via onPlayerCall acima.
  miniPlayer: {
    open: () => ipcRenderer.send("miniplayer:open"),
    close: () => ipcRenderer.send("miniplayer:close"),
    getState: () => ipcRenderer.invoke("player:getState"),
    control: (action) => ipcRenderer.invoke("player:control", action)
  }
});
