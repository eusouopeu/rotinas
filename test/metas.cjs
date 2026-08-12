/* Testes das funções puras de pontuação de Metas: crédito proporcional por
   item concluído, e como um estorno maior que o período corrente "desce"
   para os períodos anteriores sem deixar o razão (`t.creditos`) e o total
   (`gam.metasPontos`) divergirem — é a parte mais fácil de acertar errado
   (CLAUDE.md fala disso explicitamente).

   Mesma abordagem dos outros testes: extrai as funções do índex.html e roda
   num vm sandbox. "Hoje" é fixado via um Date sobrescrito no sandbox (só o
   `new Date()` sem argumento vira a data fixa; datas explícitas continuam
   reais), pra aplicarDeltaMeta/metaRecPeriodoAtual serem determinísticos. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (!ok && extra ? " :: " + extra : ""));
  if (!ok) failures++;
}
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  check(label, a === e, "esperado " + e + ", veio " + a);
}
function near(label, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= (tol === undefined ? 1e-9 : tol);
  check(label, ok, "esperado ~" + expected + ", veio " + actual);
}

function extractFn(name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) throw new Error("função não encontrada no index.html: " + name);
  let i = src.indexOf("{", start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error("chaves desbalanceadas em " + name);
}
function extractConst(name) {
  const re = new RegExp("^\\s*const " + name + "\\s*=.*$", "m");
  const m = src.match(re);
  if (!m) throw new Error("const não encontrada no index.html: " + name);
  return m[0];
}

const NAMES = [
  "localKey", "isoToDate", "addDaysISO", "inicioSemanaISO", "weekStartDow",
  "trimestreDe", "metaEscopo", "periodoDeEscopo", "metaConcluida",
  "metaPontosTotais", "metaCreditado", "metaPontosDevidos", "aplicarDeltaMeta",
  "metaRecPeriodoAtual", "metaRecProgresso", "metaRecFeitas", "metaRecExcesso"
];
const CONSTS = ["ESCOPO_META_LABEL"];

// "hoje" fixo: 2026-08-07 (sexta), meio-dia local — calculado com o Date real
// antes de sobrescrever globalThis.Date no sandbox.
const FIXED_NOW = new Date(2026, 7, 7, 12, 0, 0).getTime();

const sandbox = {
  K_WEEKSTART: "weekstart",
  _store: {},
  load(k, fallback) { return (k in sandbox._store) ? sandbox._store[k] : fallback; },
  save(k, v) { sandbox._store[k] = v; },
  K_GAMIFICACAO: "gam",
  gam: {
    config: {
      multiplicadores: { baixo: 1.0, medio: 1.75, alto: 3.0 },
      pontosMeta: { mensal: 10, trimestral: 20, anual: 30 }
    },
    metasPontos: {}
  },
  tagMultiplicador(t) { return sandbox.gam.config.multiplicadores[t] ?? 1.75; },
  console
};
vm.createContext(sandbox);
// Date sobrescrito: sem argumento cai na data fixa; com argumentos, é o Date real.
vm.runInContext(`
  class FixedDate extends Date {
    constructor(...args){ if(args.length === 0) super(${FIXED_NOW}); else super(...args); }
    static now(){ return ${FIXED_NOW}; }
  }
  globalThis.Date = FixedDate;
`, sandbox);
vm.runInContext(
  CONSTS.map(extractConst).join("\n") + "\n" +
  NAMES.map(extractFn).join("\n") + "\n" +
  CONSTS.map(n => "globalThis." + n + " = " + n + ";").join("\n"),
  sandbox);
const F = sandbox;

/* ---------------- escopo pelo prazo ---------------- */
eq("prazo em menos de 30 dias é mensal", F.metaEscopo({ criadoEm: "2026-08-01T00:00:00", date: "2026-08-20" }), "mensal");
eq("prazo entre 30 e 90 dias é trimestral", F.metaEscopo({ criadoEm: "2026-08-01T00:00:00", date: "2026-10-15" }), "trimestral");
eq("prazo acima de 90 dias é anual", F.metaEscopo({ criadoEm: "2026-08-01T00:00:00", date: "2027-06-01" }), "anual");

/* ---------------- peso multiplica o total do escopo ---------------- */
near("peso alto (padrão) multiplica ×3", F.metaPontosTotais({ criadoEm: "2026-08-01T00:00:00", date: "2026-08-20" }), 30);
near("peso baixo multiplica ×1", F.metaPontosTotais({ criadoEm: "2026-08-01T00:00:00", date: "2026-08-20", tagValor: "baixo" }), 10);

/* ---------------- crédito proporcional ---------------- */
{
  const t = { criadoEm: "2026-08-01T00:00:00", date: "2026-08-20", topics: 4, done: 1 };
  near("1 de 4 tópicos credita 1/4 do total", F.metaPontosDevidos(t), 30 / 4);
  t.done = 4;
  near("tudo feito credita o total", F.metaPontosDevidos(t), 30);
  t.topics = 0;
  eq("sem tópicos não credita nada", F.metaPontosDevidos(t), 0);
}

/* ---------------- aplicarDeltaMeta: crédito vai pro período corrente ---------------- */
{
  const t = { criadoEm: "2026-08-01T00:00:00", date: "2026-08-20", creditos: {} };
  F.aplicarDeltaMeta(t, 5);
  eq("crédito soma no período corrente (mês de 'hoje')", t.creditos, { "2026-08": 5 });
  eq("gam.metasPontos acompanha", F.gam.metasPontos, { "2026-08": 5 });
  F.aplicarDeltaMeta(t, 2.5);
  near("segundo crédito acumula no mesmo período", t.creditos["2026-08"], 7.5);
}

/* ---------------- estorno maior que o período corrente desce pros anteriores ---------------- */
{
  const t = { criadoEm: "2026-08-01T00:00:00", date: "2026-08-20", creditos: { "2026-06": 4, "2026-07": 6, "2026-08": 3 } };
  F.gam.metasPontos = { "2026-06": 4, "2026-07": 6, "2026-08": 3 };
  // estorna 5: tira os 3 do mês corrente (08) e mais 2 do mais recente anterior (07)
  F.aplicarDeltaMeta(t, -5);
  eq("mês corrente zerado e removido do razão", t.creditos["2026-08"], undefined);
  near("mês anterior mais recente perde o restante", t.creditos["2026-07"], 4);
  near("mês mais antigo não é tocado enquanto sobra em outro período", t.creditos["2026-06"], 4);
  near("gam.metasPontos acompanha a mesma descida", F.gam.metasPontos["2026-07"], 4);
  eq("período zerado some de gam.metasPontos", F.gam.metasPontos["2026-08"], undefined);
}

{
  // delta ~0 (ruído de arredondamento) não mexe em nada
  const t = { criadoEm: "2026-08-01T00:00:00", date: "2026-08-20", creditos: { "2026-08": 5 } };
  F.gam.metasPontos = { "2026-08": 5 };
  F.aplicarDeltaMeta(t, 1e-12);
  eq("delta desprezível não altera o razão", t.creditos, { "2026-08": 5 });
}

/* ---------------- metas recorrentes: progresso reinicia sozinho (lazy reset) ---------------- */
{
  const rec = { tipo: "diaria", vezes: 3, progresso: { periodo: "dia:2026-08-06", feitas: 2 } };
  eq("progresso de um período antigo é descartado (novo dia)", F.metaRecFeitas(rec), 0);
  eq("progresso já aponta pro período de hoje", rec.progresso.periodo, "dia:2026-08-07");

  rec.progresso.feitas = 2;
  eq("progresso do período corrente não é mexido", F.metaRecFeitas(rec), 2);
  eq("ainda sem excesso (2 de um limite de 3)", F.metaRecExcesso(rec), 0);

  rec.progresso.feitas = 5;
  eq("excesso é o que passou do limite (5 - 3 = 2)", F.metaRecExcesso(rec), 2);
}

console.log(failures === 0 ? "\nMETAS OK" : "\n" + failures + " FALHA(S) EM METAS");
process.exit(failures === 0 ? 0 : 1);
