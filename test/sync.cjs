// Testa sync/engine.js (last-write-wins por chave + detecção de conflito de
// verdade) sem depender do Electron real nem da API do Google Drive: stuba
// "electron", "./google-drive" e "./token-store" via require.cache ANTES de
// carregar o engine — os três módulos reais só tocam nessas dependências
// dentro de funções, exceto engine.js, que lê app.getPath() no topo do
// arquivo (por isso o stub de "electron" precisa entrar primeiro de todos).
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error("FALHOU: " + msg);
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "brita-sync-test-"));

const electronPath = require.resolve("electron");
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    app: { getPath: () => tmpDir },
    safeStorage: { isEncryptionAvailable: () => false },
    shell: { openExternal: () => {} }
  }
};

// "Drive" fake: mapa em memória name -> {id, content, modifiedTime}, com
// modifiedTime controlável pelo teste (o motor real usa o modifiedTime que o
// Drive devolve por arquivo em vez de manter um manifest — ver comentário no
// topo de engine.js).
const driveFiles = new Map();
let idSeq = 1;
const fakeDrive = {
  async ensureSyncFolder() { return "folder-fake"; },
  async listSyncFiles() {
    return [...driveFiles.values()].map(f => ({ id: f.id, name: f.name, modifiedTime: new Date(f.modifiedTime).toISOString() }));
  },
  async downloadFileContent(_token, id) {
    return [...driveFiles.values()].find(f => f.id === id).content;
  },
  async createFile(_token, _folderId, name, content) {
    const f = { id: "f" + (idSeq++), name, content, modifiedTime: Date.now() };
    driveFiles.set(name, f);
    return { id: f.id, modifiedTime: new Date(f.modifiedTime).toISOString() };
  },
  async updateFileContent(_token, id, content) {
    const f = [...driveFiles.values()].find(x => x.id === id);
    f.content = content;
    f.modifiedTime = Date.now();
    return { modifiedTime: new Date(f.modifiedTime).toISOString() };
  },
  async refreshAccessToken() { return { access_token: "fake-token", expires_in: 3600 }; }
};
const SYNC_DIR = path.join(__dirname, "..", "sync");
const drivePath = require.resolve(path.join(SYNC_DIR, "google-drive.js"));
require.cache[drivePath] = { id: drivePath, filename: drivePath, loaded: true, exports: fakeDrive };

let fakeTokens = { access_token: "fake-token", refresh_token: "fake-refresh", expiresAt: Date.now() + 3600000 };
const fakeTokenStore = {
  loadTokens: () => fakeTokens,
  saveTokens: (t) => { fakeTokens = t; },
  clearTokens: () => { fakeTokens = null; }
};
const tokenStorePath = require.resolve(path.join(SYNC_DIR, "token-store.js"));
require.cache[tokenStorePath] = { id: tokenStorePath, filename: tokenStorePath, loaded: true, exports: fakeTokenStore };

const engine = require(path.join(SYNC_DIR, "engine.js"));

const KEY = "rotinas_v2_routines";
const localPath = path.join(tmpDir, "brita", KEY + ".json");

(async () => {
  // 1) só existe local -> sobe
  fs.mkdirSync(path.join(tmpDir, "brita"), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify([{ id: "r1" }]));
  let res = await engine.syncOnce();
  assert(res.uploaded.includes(KEY), "primeiro sync com só local deveria subir a chave");
  assert(driveFiles.has(KEY + ".json"), "upload deveria ter criado o arquivo no Drive fake");

  // 2) nada mudou -> pula
  res = await engine.syncOnce();
  assert(res.skipped.includes(KEY), "sem mudança nos dois lados deveria pular");

  // 3) só o remoto mudou -> baixa (last-write-wins, sem conflito) e aplica no renderer
  const remoteFile = driveFiles.get(KEY + ".json");
  remoteFile.content = JSON.stringify([{ id: "r1" }, { id: "r2-outro-aparelho" }]);
  remoteFile.modifiedTime = Date.now() + 5000;
  let applied = null;
  res = await engine.syncOnce({ onApplied: (k, v) => { applied = { k, v }; } });
  assert(res.downloaded.includes(KEY), "só remoto mudou deveria baixar");
  assert(applied && applied.k === KEY && applied.v.length === 2, "onApplied deveria receber o conteúdo remoto novo");
  assert(JSON.parse(fs.readFileSync(localPath, "utf8")).length === 2, "arquivo local deveria ter sido sobrescrito com o conteúdo remoto");

  // 4) só o local mudou -> sobe
  fs.writeFileSync(localPath, JSON.stringify([{ id: "r1" }, { id: "r2-outro-aparelho" }, { id: "r3-local" }]));
  const futuro1 = new Date(Date.now() + 5000);
  fs.utimesSync(localPath, futuro1, futuro1); // mtime real pode ter resolução baixa demais pra distinguir do último sync
  res = await engine.syncOnce();
  assert(res.uploaded.includes(KEY), "só local mudou deveria subir");
  assert(JSON.parse(driveFiles.get(KEY + ".json").content).length === 3, "conteúdo remoto deveria refletir a mudança local");

  // 5) conflito de verdade: os dois lados mudam desde o último sync
  fs.writeFileSync(localPath, JSON.stringify([{ id: "local-only" }]));
  const futuro2 = new Date(Date.now() + 10000);
  fs.utimesSync(localPath, futuro2, futuro2);
  const rf = driveFiles.get(KEY + ".json");
  rf.content = JSON.stringify([{ id: "remote-only" }]);
  rf.modifiedTime = Date.now() + 10000;
  let conflictKey = null, conflictContent = null;
  res = await engine.syncOnce({ onConflict: (k, c) => { conflictKey = k; conflictContent = c; } });
  assert(res.conflicts.includes(KEY), "os dois lados mudando deveria virar conflito, não last-write-wins silencioso");
  assert(conflictKey === KEY, "onConflict deveria disparar para a chave em conflito");
  assert(JSON.parse(conflictContent)[0].id === "remote-only", "onConflict deveria trazer o conteúdo remoto");
  assert(JSON.parse(fs.readFileSync(localPath, "utf8"))[0].id === "local-only", "conflito não deve sobrescrever o arquivo local sozinho");
  let conflictFiles = fs.readdirSync(path.join(tmpDir, "brita")).filter(f => f.includes(".conflict-"));
  assert(conflictFiles.length === 1, "deveria ter gravado um .conflict-<timestamp>.json ao lado do arquivo real");

  // 6) mesmo conflito de novo, nada mudou -> não repete arquivo nem aviso
  res = await engine.syncOnce();
  assert(res.conflicts.includes(KEY), "conflito ainda pendente deveria continuar aparecendo em results.conflicts");
  conflictFiles = fs.readdirSync(path.join(tmpDir, "brita")).filter(f => f.includes(".conflict-"));
  assert(conflictFiles.length === 1, "conflito já sinalizado sem mudança nova não deveria gerar um segundo arquivo");

  // 7) resolver escolhendo "local" -> local vence, remoto é sobrescrito, conflito sai de pendentes
  await engine.resolveConflict(KEY, "local");
  const status = engine.getStatus();
  assert(!status.pendingConflicts.includes(KEY), "resolver o conflito deveria tirá-lo de pendingConflicts");
  assert(JSON.parse(driveFiles.get(KEY + ".json").content)[0].id === "local-only", 'escolher "local" deveria sobrescrever o remoto com o conteúdo local');

  if (failures) {
    console.error(failures + " teste(s) falharam em test/sync.cjs");
    process.exit(1);
  }
  console.log("sync.cjs: todos os testes passaram ✓");
})().catch(e => {
  console.error("Erro inesperado em test/sync.cjs:", e);
  process.exit(1);
});
