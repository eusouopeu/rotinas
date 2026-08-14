// Motor de sync — Fase 1 (last-write-wins por chave), seção 5.3 do plano.
//
// Desvio deliberado do plano: em vez de manter um manifest.json próprio no Drive
// para comparar timestamps sem baixar cada arquivo, usamos o `modifiedTime` que o
// próprio Drive já guarda por arquivo (devolvido de graça em `files.list`). Isso
// elimina uma segunda fonte de verdade (o manifest podia divergir do conteúdo real)
// sem custar chamadas extras de API. O que falta a um manifest — saber o que mudou
// "desde o último sync" para detectar conflito de verdade — fica num estado local
// (`sync-state.json`, só neste processo, nunca sobe pro Drive) que guarda por chave
// o mtime local e o modifiedTime remoto do último sync bem-sucedido.
"use strict";

const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const drive = require("./google-drive");
const tokenStore = require("./token-store");
const embeddedOAuthClient = require("./oauth-client");

const DATA_DIR = path.join(app.getPath("userData"), "brita");
const STATE_PATH = path.join(app.getPath("userData"), "sync-state.json");
const CLIENT_CREDS_PATH = path.join(app.getPath("userData"), "google-oauth-client.json");
const SYNC_FOLDER_NAME = "brita-sync";
const PLACEHOLDER_CLIENT_ID = "SUBSTITUA_AQUI.apps.googleusercontent.com";

/* As mesmas 9 coleções que backupData() leva no index.html (routines, notes,
   history, templates, snoozes, tarefas, tarefasHist, diario, diaKanban) — é o
   conjunto que o próprio app já trata como "os dados que importam" para
   backup/restore. Coleção nova entrando em backupData() e nos dois handlers de
   import (CLAUDE.md) também precisa entrar aqui, senão sai do sync.

   Desvio deliberado: as 3 chaves de preferência de UI abaixo (tema, densidade,
   início da semana) NÃO estão em backupData() — não fazem sentido num backup
   de dados, e um restore não deveria mudar a aparência do app — mas ainda
   valem a pena sincronizar entre desktop e celular, porque são escalares
   pequenos sem necessidade de merge (last-write-wins é sempre correto aqui,
   ao contrário de arrays/objetos onde perder o lado que não venceu importa).
   O lado do app que aplica a chave baixada ao vivo é applySyncedKey() no
   index.html. */
const SYNCED_KEYS = [
  "rotinas_v2_routines",
  "rotinas_v2_notes",
  "rotinas_v2_history",
  "rotinas_v2_templates",
  "rotinas_v2_snoozes",
  "rotinas_v2_tarefas",
  "rotinas_v2_tarefas_hist",
  "rotinas_v2_diario",
  "rotinas_v2_diakanban",
  "rotinas_v2_exercicios",
  "rotinas_v2_compromissos",
  "rotinas_v2_theme",
  "rotinas_v2_densidade",
  "rotinas_v2_weekstart"
];

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); } catch (e) { return { folderId: null, keys: {}, conflicts: {} }; }
}
function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/* Credencial do app: por padrão a embutida em oauth-client.js (mesmo truque do
   Remotely Save com o Dropbox — um client cadastrado uma vez, distribuído com o
   código). Um arquivo em userData, se existir, tem prioridade — só serve como
   válvula de escape manual (ex.: trocar de projeto no Google Cloud sem editar
   código), não é o caminho exposto na UI. */
function loadClientCreds() {
  try {
    const override = JSON.parse(fs.readFileSync(CLIENT_CREDS_PATH, "utf8"));
    if (override && override.clientId) return override;
  } catch (e) { /* sem override: cai pra credencial embutida */ }
  return { clientId: embeddedOAuthClient.CLIENT_ID, clientSecret: embeddedOAuthClient.CLIENT_SECRET };
}
function saveClientCreds(clientId, clientSecret) {
  fs.mkdirSync(path.dirname(CLIENT_CREDS_PATH), { recursive: true });
  fs.writeFileSync(CLIENT_CREDS_PATH, JSON.stringify({ clientId: clientId || "", clientSecret: clientSecret || "" }));
}
function hasClientCreds() {
  const c = loadClientCreds();
  return !!(c && c.clientId && c.clientId !== PLACEHOLDER_CLIENT_ID);
}

let cachedTokens = null;
function loadTokens() {
  if (cachedTokens === null) cachedTokens = tokenStore.loadTokens() || undefined;
  return cachedTokens || null;
}
function persistTokens(t) {
  cachedTokens = t;
  tokenStore.saveTokens(t);
}
function isConnected() {
  const t = loadTokens();
  return !!(t && t.refresh_token);
}

async function ensureAccessToken() {
  const creds = loadClientCreds();
  if (!creds || !creds.clientId) throw new Error("Client ID do Google não configurado");
  let tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) throw new Error("Google Drive não conectado");
  const skewMs = 60_000;
  if (tokens.access_token && tokens.expiresAt && Date.now() < tokens.expiresAt - skewMs) return tokens.access_token;
  const fresh = await drive.refreshAccessToken({ clientId: creds.clientId, clientSecret: creds.clientSecret, refreshToken: tokens.refresh_token });
  tokens = { ...tokens, access_token: fresh.access_token, expiresAt: Date.now() + (fresh.expires_in || 3600) * 1000 };
  persistTokens(tokens);
  return tokens.access_token;
}

async function connect() {
  const creds = loadClientCreds();
  if (!creds || !creds.clientId) throw new Error("Salve o Client ID/Secret antes de conectar");
  const { code, verifier, redirectUri } = await drive.runLoopbackAuth(creds.clientId);
  const tok = await drive.exchangeCode({ clientId: creds.clientId, clientSecret: creds.clientSecret, code, verifier, redirectUri });
  persistTokens({ access_token: tok.access_token, refresh_token: tok.refresh_token, expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 });
  return true;
}

function disconnect() {
  cachedTokens = undefined;
  tokenStore.clearTokens();
  const state = loadState();
  state.folderId = null; // reobtido no próximo connect; não apaga o histórico por chave
  saveState(state);
}

function keyFile(key) { return path.join(DATA_DIR, key + ".json"); }

function readLocal(key) {
  const p = keyFile(key);
  if (!fs.existsSync(p)) return { exists: false, mtime: null, content: null };
  const stat = fs.statSync(p);
  return { exists: true, mtime: stat.mtimeMs, content: fs.readFileSync(p, "utf8") };
}
function writeLocal(key, content) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(keyFile(key), content);
  return fs.statSync(keyFile(key)).mtimeMs;
}
function writeConflictFile(key, content) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(DATA_DIR, `${key}.conflict-${ts}.json`), content);
}

function applyToRenderer(key, content, onApplied) {
  if (!onApplied) return;
  try { onApplied(key, JSON.parse(content)); } catch (e) { /* conteúdo remoto inválido: fica só em disco, não aplica */ }
}

/* Um ciclo completo: para cada chave, decide upload / download / conflito /
   nada a fazer, comparando contra o `sync-state.json` do último ciclo bem-sucedido. */
async function syncOnce({ onApplied, onConflict, log } = {}) {
  if (!isConnected()) throw new Error("Google Drive não conectado");
  const accessToken = await ensureAccessToken();
  const state = loadState();
  state.keys = state.keys || {};
  state.conflicts = state.conflicts || {};
  if (!state.folderId) state.folderId = await drive.ensureSyncFolder(accessToken, SYNC_FOLDER_NAME);

  const remoteFiles = await drive.listSyncFiles(accessToken, state.folderId);
  const remoteByName = new Map(remoteFiles.map((f) => [f.name, f]));
  const results = { uploaded: [], downloaded: [], conflicts: [], skipped: [], errors: [] };

  for (const key of SYNCED_KEYS) {
    try {
      const local = readLocal(key);
      const remote = remoteByName.get(key + ".json");
      const prev = state.keys[key] || null;
      const remoteModMs = remote ? Date.parse(remote.modifiedTime) : null;

      if (!local.exists && !remote) { results.skipped.push(key); continue; }

      if (local.exists && !remote) {
        const up = await drive.createFile(accessToken, state.folderId, key + ".json", local.content);
        state.keys[key] = { localMtime: local.mtime, remoteModifiedTime: Date.parse(up.modifiedTime), syncedAt: Date.now() };
        delete state.conflicts[key];
        results.uploaded.push(key);
        continue;
      }
      if (!local.exists && remote) {
        const content = await drive.downloadFileContent(accessToken, remote.id);
        const mtime = writeLocal(key, content);
        state.keys[key] = { localMtime: mtime, remoteModifiedTime: remoteModMs, syncedAt: Date.now() };
        delete state.conflicts[key];
        applyToRenderer(key, content, onApplied);
        results.downloaded.push(key);
        continue;
      }

      // os dois lados existem
      const localChanged = !prev || local.mtime > prev.localMtime;
      const remoteChanged = !prev || remoteModMs > prev.remoteModifiedTime;

      if (localChanged && remoteChanged) {
        const already = state.conflicts[key];
        if (already && already.localMtimeAtDetect === local.mtime && already.remoteModifiedTimeAtDetect === remoteModMs) {
          results.conflicts.push(key); // já sinalizado, nada mudou desde então — não repete arquivo/aviso
          continue;
        }
        const remoteContent = await drive.downloadFileContent(accessToken, remote.id);
        if (!prev && local.content.trim() === remoteContent.trim()) {
          // primeiro sync e os dois lados já são idênticos — não é conflito de verdade
          state.keys[key] = { localMtime: local.mtime, remoteModifiedTime: remoteModMs, syncedAt: Date.now() };
          results.skipped.push(key);
          continue;
        }
        writeConflictFile(key, remoteContent);
        state.conflicts[key] = { localMtimeAtDetect: local.mtime, remoteModifiedTimeAtDetect: remoteModMs, detectedAt: Date.now() };
        if (onConflict) onConflict(key, remoteContent);
        results.conflicts.push(key);
        continue;
      }
      if (localChanged) {
        const up = await drive.updateFileContent(accessToken, remote.id, local.content);
        state.keys[key] = { localMtime: local.mtime, remoteModifiedTime: Date.parse(up.modifiedTime), syncedAt: Date.now() };
        delete state.conflicts[key];
        results.uploaded.push(key);
        continue;
      }
      if (remoteChanged) {
        const content = await drive.downloadFileContent(accessToken, remote.id);
        const mtime = writeLocal(key, content);
        state.keys[key] = { localMtime: mtime, remoteModifiedTime: remoteModMs, syncedAt: Date.now() };
        delete state.conflicts[key];
        applyToRenderer(key, content, onApplied);
        results.downloaded.push(key);
        continue;
      }
      results.skipped.push(key);
    } catch (e) {
      results.errors.push({ key, message: e.message });
      if (log) log(`Falha ao sincronizar ${key}: ${e.message}`);
    }
  }

  state.lastSyncAt = Date.now();
  saveState(state);
  return results;
}

/* Resolução manual de um conflito sinalizado: "local" mantém o conteúdo local e
   sobrescreve o remoto; "remote" aplica o conteúdo remoto por cima do local. */
async function resolveConflict(key, choice, { onApplied } = {}) {
  if (!SYNCED_KEYS.includes(key)) throw new Error("chave desconhecida: " + key);
  if (!isConnected()) throw new Error("Google Drive não conectado");
  const accessToken = await ensureAccessToken();
  const state = loadState();
  state.keys = state.keys || {};
  state.conflicts = state.conflicts || {};
  const remoteFiles = await drive.listSyncFiles(accessToken, state.folderId);
  const remote = remoteFiles.find((f) => f.name === key + ".json");
  const local = readLocal(key);

  if (choice === "remote") {
    if (!remote) throw new Error("arquivo remoto não encontrado");
    const content = await drive.downloadFileContent(accessToken, remote.id);
    const mtime = writeLocal(key, content);
    state.keys[key] = { localMtime: mtime, remoteModifiedTime: Date.parse(remote.modifiedTime), syncedAt: Date.now() };
    applyToRenderer(key, content, onApplied);
  } else if (choice === "local") {
    if (!local.exists) throw new Error("arquivo local não encontrado");
    const up = remote
      ? await drive.updateFileContent(accessToken, remote.id, local.content)
      : await drive.createFile(accessToken, state.folderId, key + ".json", local.content);
    state.keys[key] = { localMtime: local.mtime, remoteModifiedTime: Date.parse(up.modifiedTime), syncedAt: Date.now() };
  } else {
    throw new Error("escolha inválida: use \"local\" ou \"remote\"");
  }
  delete state.conflicts[key];
  saveState(state);
}

function getStatus() {
  const state = loadState();
  return {
    connected: isConnected(),
    hasClientCreds: hasClientCreds(),
    lastSyncAt: state.lastSyncAt || null,
    pendingConflicts: Object.keys(state.conflicts || {})
  };
}

module.exports = {
  SYNCED_KEYS,
  saveClientCreds,
  loadClientCreds,
  hasClientCreds,
  connect,
  disconnect,
  isConnected,
  syncOnce,
  resolveConflict,
  getStatus
};
