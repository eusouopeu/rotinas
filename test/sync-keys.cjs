/* Paridade das chaves sincronizadas — rec. 8 do plano de melhorias.
   Já divergiu de verdade uma vez: `exercicios`/`compromissos` entraram em
   backupData() e no SYNCED_KEYS do desktop, e ficaram de fora do motor do
   Android por semanas sem ninguém notar. O sintoma de uma divergência dessas é
   silencioso — a chave simplesmente não viaja, e só aparece quando o dado some
   de um dispositivo. Estes testes existem para transformar esse silêncio num
   erro de build.

   Quatro invariantes:
   1. SYNCED_KEYS (sync/engine.js, desktop) == SYNCED_KEYS (SyncEngine.java, Android)
   2. toda coleção devolvida por backupData() tem uma chave em SYNCED_KEYS
   3. toda chave de SYNCED_KEYS é tratada por applySyncedKey() no index.html
   4. toda coleção devolvida por backupSnapshot() (webapp/src/store/useAppStore.ts,
      React) tem uma chave K_* conhecida em SYNCED_KEYS — mesma classe de bug,
      lado React (rec. 4 de docs/react-migration.md) */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const RAIZ = path.join(__dirname, "..");
/* Tudo aqui é leitura de FONTE, não de módulo carregado: o que precisa ficar em
   paridade são as três listas literais, e engine.js lê app.getPath() no topo
   (exigiria stubar o Electron só para ler uma constante). */
const ENGINE = fs.readFileSync(path.join(RAIZ, "sync", "engine.js"), "utf8");
const INDEX = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const JAVA = fs.readFileSync(
  path.join(RAIZ, "android/app/src/main/java/com/pedro/rotinas/SyncEngine.java"), "utf8");

let falhas = 0;
function ok(cond, msg){
  console.log((cond ? "PASS" : "FALHA") + " - " + msg);
  if(!cond) falhas++;
}
function listaIgual(a, b, msg){
  const fa = a.filter(x => !b.includes(x)), fb = b.filter(x => !a.includes(x));
  ok(fa.length === 0 && fb.length === 0,
     msg + (fa.length ? " | só no primeiro: " + fa.join(", ") : "")
         + (fb.length ? " | só no segundo: " + fb.join(", ") : ""));
}

/* ---- 1) desktop x Android ---- */
const engBloco = ENGINE.match(/const SYNCED_KEYS = \[([\s\S]*?)\];/);
assert(engBloco, "SYNCED_KEYS não encontrado em sync/engine.js");
const SYNCED_KEYS = [...engBloco[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);

const javaBloco = JAVA.match(/static final String\[\] SYNCED_KEYS = \{([\s\S]*?)\};/);
assert(javaBloco, "SYNCED_KEYS não encontrado em SyncEngine.java");
const javaKeys = [...javaBloco[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
listaIgual(SYNCED_KEYS, javaKeys, "SYNCED_KEYS do desktop e do Android são a mesma lista");

/* ---- mapa nomeDaVariavelGlobal -> chave de storage, lido do próprio index.html ---- */
const constK = {};
for(const m of INDEX.matchAll(/const (K_[A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) constK[m[1]] = m[2];
const varParaChave = {};
for(const m of INDEX.matchAll(/let ([a-zA-Z][a-zA-Z0-9]*)\s*=\s*load\((K_[A-Z0-9_]+)/g)){
  if(constK[m[2]]) varParaChave[m[1]] = constK[m[2]];
}

/* ---- 2) backupData() ---- */
const bd = INDEX.match(/return \{ version: \d+, exportedAt: new Date\(\)\.toISOString\(\),([\s\S]*?)\};/);
assert(bd, "backupData() não encontrado no index.html");
const colecoes = bd[1].split(",").map(s => s.trim()).filter(Boolean);
ok(colecoes.length > 0, "backupData() lista " + colecoes.length + " coleção(ões): " + colecoes.join(", "));
colecoes.forEach(nome => {
  const chave = varParaChave[nome];
  ok(!!chave, "coleção \"" + nome + "\" de backupData() tem uma chave K_* conhecida");
  if(chave) ok(SYNCED_KEYS.includes(chave),
    "coleção \"" + nome + "\" (" + chave + ") está em SYNCED_KEYS — senão ela sai do sync em silêncio");
});

/* ---- 3) applySyncedKey ---- */
const ask = INDEX.match(/function applySyncedKey\(key, value\)\{([\s\S]*?)\n  \}/);
assert(ask, "applySyncedKey() não encontrado no index.html");
const tratadas = [...ask[1].matchAll(/case (K_[A-Z0-9_]+):/g)].map(m => constK[m[1]]).filter(Boolean);
listaIgual(SYNCED_KEYS, tratadas,
  "toda chave de SYNCED_KEYS é aplicada ao vivo por applySyncedKey()");

/* ---- 4) backupSnapshot() do React ---- */
const STORE = fs.readFileSync(path.join(RAIZ, "webapp/src/store/useAppStore.ts"), "utf8");
const CONSTANTS = fs.readFileSync(path.join(RAIZ, "webapp/src/lib/constants.ts"), "utf8");

const constKReact = {};
for (const m of CONSTANTS.matchAll(/export const (K_[A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) constKReact[m[1]] = m[2];

// nome do campo em backupSnapshot() -> constante K_* correspondente em constants.ts
const CAMPO_PARA_K = {
  routines: "K_ROUTINES",
  notes: "K_NOTES",
  history: "K_HISTORY",
  templates: "K_TEMPLATES",
  diario: "K_DIARIO",
  diaKanban: "K_DIAKANBAN",
  compromissos: "K_COMPROMISSOS",
  snoozes: "K_SNOOZES",
  exercicios: "K_EXERCICIOS",
};

const snap = STORE.match(/backupSnapshot: \(\) => \{[\s\S]*?return \{([\s\S]*?)\};\s*\},/);
assert(snap, "backupSnapshot() não encontrado em webapp/src/store/useAppStore.ts");
const camposSnap = [...snap[1].matchAll(/^\s*([a-zA-Z][a-zA-Z0-9]*):/gm)]
  .map((m) => m[1])
  .filter((c) => c !== "version" && c !== "exportedAt");
ok(camposSnap.length > 0, "backupSnapshot() lista " + camposSnap.length + " coleção(ões): " + camposSnap.join(", "));
camposSnap.forEach((campo) => {
  const constName = CAMPO_PARA_K[campo];
  ok(!!constName, "coleção \"" + campo + "\" de backupSnapshot() tem uma constante K_* mapeada no teste");
  const chave = constName && constKReact[constName];
  ok(!!chave, "constante " + constName + " existe em webapp/src/lib/constants.ts");
  if (chave) ok(SYNCED_KEYS.includes(chave),
    "coleção \"" + campo + "\" (" + chave + ", React) está em SYNCED_KEYS — senão ela sai do sync em silêncio");
});

console.log(falhas === 0 ? "\nSYNC-KEYS OK" : "\n" + falhas + " FALHA(S)");
process.exit(falhas === 0 ? 0 : 1);
