/* Testes de rotina recorrente "a cada N dias" (schedule.mode==="intervalo"),
   alternativa ao agendamento por dia-da-semana. Cobre o ponto único de
   verdade (rotinaAgendadaEm) e o cálculo de próximas ocorrências usado tanto
   pela notificação nativa quanto pelo export .ics — ver seção correspondente
   no CLAUDE.md. Mesma abordagem dos outros testes: extrai as funções do
   index.html e roda num vm sandbox. */
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

const NAMES = [
  "localKey", "isoToDate", "diasDaRotina", "rotinaAgendadaEm",
  "proximaOcorrenciaIntervalo", "proximasOcorrenciasIntervalo",
  "algumaRotinaDevidaEm", "computeStreak", "computeStreakFor"
];

function key(y, m, d) {
  const p = n => String(n).padStart(2, "0");
  return y + "-" + p(m + 1) + "-" + p(d);
}

function run(routines, history, fixedNow) {
  class FakeDate extends Date {
    constructor(...args) { if (args.length === 0) super(fixedNow.getTime()); else super(...args); }
  }
  const sandbox = { routines, history: history || [], console, Date: FakeDate };
  vm.createContext(sandbox);
  vm.runInContext(NAMES.map(extractFn).join("\n") + "\n" +
    NAMES.map(n => "globalThis." + n + " = " + n + ";").join("\n"), sandbox);
  return sandbox;
}

const Y = 2026, M = 7; // agosto/2026 (mês 0-indexado)
const ref = key(Y, M, 1); // 2026-08-01, sábado

const rIntervalo = { id: "ri", schedule: { enabled: true, mode: "intervalo", intervaloDias: 3, intervaloInicio: ref } };

/* ---------------- rotinaAgendadaEm bate exatamente a cada 3 dias a partir da referência ---------------- */
{
  const F = run([rIntervalo], [], new Date(Y, M, 1));
  const esperado = { 1: true, 2: false, 3: false, 4: true, 5: false, 6: false, 7: true, 30: false, 31: true };
  Object.keys(esperado).forEach(dia => {
    eq("dia " + dia + " de agosto " + (esperado[dia] ? "É" : "NÃO é") + " ocorrência",
      F.rotinaAgendadaEm(rIntervalo, new Date(Y, M, +dia)), esperado[dia]);
  });
}

/* ---------------- antes da data de início não ocorre nunca ---------------- */
{
  const F = run([rIntervalo], [], new Date(Y, M, 1));
  check("dia anterior ao início (31/jul) não é ocorrência", !F.rotinaAgendadaEm(rIntervalo, new Date(Y, M, 0)));
}

/* ---------------- próxima ocorrência a partir de uma data qualquer ---------------- */
{
  const F = run([rIntervalo], [], new Date(Y, M, 1));
  eq("próxima ocorrência vista no dia 2 (fora do ciclo) é o dia 4",
    F.localKey(F.proximaOcorrenciaIntervalo(rIntervalo, new Date(Y, M, 2))), key(Y, M, 4));
  eq("próxima ocorrência vista no dia 4 (já é ocorrência) é o próprio dia 4",
    F.localKey(F.proximaOcorrenciaIntervalo(rIntervalo, new Date(Y, M, 4))), key(Y, M, 4));
  eq("próxima ocorrência vista ANTES do início é a própria data de início",
    F.localKey(F.proximaOcorrenciaIntervalo(rIntervalo, new Date(Y, M, 0))), key(Y, M, 1));
}

/* ---------------- as N próximas ocorrências vêm espaçadas certinho ---------------- */
{
  const F = run([rIntervalo], [], new Date(Y, M, 1));
  const datas = F.proximasOcorrenciasIntervalo(rIntervalo, 4).map(d => F.localKey(d));
  eq("4 próximas ocorrências a partir do dia 1", datas, [key(Y, M, 1), key(Y, M, 4), key(Y, M, 7), key(Y, M, 10)]);
}

/* ---------------- streak por rotina de intervalo: dias fora do ciclo não contam nem quebram ---------------- */
{
  // cumpriu no dia 1, 4 e 7 — visto no dia 6 (fora do ciclo, entre o 4 e o 7)
  const hist = [
    { routineId: "ri", date: key(Y, M, 1) },
    { routineId: "ri", date: key(Y, M, 4) },
    { routineId: "ri", date: key(Y, M, 7) }
  ];
  const F = run([rIntervalo], hist, new Date(Y, M, 6));
  eq("streak da rotina de intervalo conta as 2 ocorrências cumpridas até aqui (dia 6 ainda não é ocorrência)",
    F.computeStreakFor("ri"), 2);
}

/* ---------------- streak quebra de verdade quando uma ocorrência real é perdida ---------------- */
{
  const hist = [
    { routineId: "ri", date: key(Y, M, 1) }
    // faltou o dia 4, que já passou
  ];
  const F = run([rIntervalo], hist, new Date(Y, M, 7));
  eq("perder a ocorrência do dia 4 quebra a sequência (dia 7 não conta mais)",
    F.computeStreakFor("ri"), 0);
}

console.log(failures === 0 ? "\nAGENDAMENTO-INTERVALO OK" : "\n" + failures + " FALHA(S) EM AGENDAMENTO-INTERVALO");
if (failures > 0) process.exitCode = 1;
