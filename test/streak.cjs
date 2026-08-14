/* Testes da sequência (streak) global (computeStreak): um dia sem NENHUMA
   rotina agendada devida (só rotinas de dias específicos que não incluem
   aquele dow) não pode quebrar a sequência — mesmo critério que
   computeStreakFor já aplicava por rotina, agora também na global usada no
   header da Home. Ver a seção sobre isso no CLAUDE.md.

   Mesma abordagem dos outros testes: extrai as funções do index.html e roda
   num vm sandbox, com Date() fixado para o teste ser determinístico. */
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

const NAMES = ["localKey", "algumaRotinaDevidaEm", "computeStreak", "computeStreakFor"];

// dow local, sem depender do fuso do runner: 0=domingo..6=sábado
function dowOf(y, m, d) { return new Date(y, m, d).getDay(); }
function key(y, m, d) {
  const p = n => String(n).padStart(2, "0");
  return y + "-" + p(m + 1) + "-" + p(d);
}

// ancora numa segunda-feira conhecida e deriva os outros dias por offset —
// não depende de acertar o dia da semana "de cabeça"
let anchor = new Date(2026, 7, 10); // 2026-08-10
while (anchor.getDay() !== 1) anchor.setDate(anchor.getDate() + 1); // garante segunda
const Y = anchor.getFullYear(), M = anchor.getMonth();
const mon = anchor.getDate();
const tue = mon + 1, wed = mon + 2, thu = mon + 3, fri = mon + 4, sat = mon + 5, sun = mon + 6;
const monNext = mon + 7;

const routines = [
  { id: "r1", schedule: { enabled: true, days: [1, 3, 5] } } // seg/qua/sex
];
const history = [
  { routineId: "r1", date: key(Y, M, mon) },
  { routineId: "r1", date: key(Y, M, wed) },
  { routineId: "r1", date: key(Y, M, fri) }
];

function run(fixedNow) {
  class FakeDate extends Date {
    constructor(...args) { if (args.length === 0) super(fixedNow.getTime()); else super(...args); }
  }
  const sandbox = { routines, history, console, Date: FakeDate };
  vm.createContext(sandbox);
  vm.runInContext(NAMES.map(extractFn).join("\n") + "\n" +
    NAMES.map(n => "globalThis." + n + " = " + n + ";").join("\n"), sandbox);
  return sandbox;
}

/* ---------------- visto num dia sem nada devido (sábado), 2 dias após a
   última sexta cumprida — não deveria quebrar por causa de sáb/dom/ter/qui ---------------- */
{
  const F = run(new Date(Y, M, sat));
  eq("streak global conta seg/qua/sex seguidas, ignorando os dias sem nada devido",
    F.computeStreak(), 3);
  eq("streak por rotina bate com a global nesse caso", F.computeStreakFor("r1"), 3);
}

/* ---------------- visto na própria terça (dia sem nada devido, no meio da janela) ---------------- */
{
  const F = run(new Date(Y, M, tue));
  eq("visto numa terça (nada devido) a sequência de seg conta normalmente",
    F.computeStreak(), 1);
}

/* ---------------- perdeu a segunda seguinte (dia realmente devido) — aí quebra de verdade ---------------- */
{
  const routines2 = routines;
  const history2 = history; // não inclui monNext
  const F = run(new Date(Y, M, monNext + 1)); // terça seguinte, segunda ficou pra trás sem cumprir
  eq("faltar um dia REALMENTE devido (a segunda seguinte) quebra a sequência",
    F.computeStreak(), 0);
}

/* ---------------- sem nenhuma rotina agendada (só livres) preserva o comportamento antigo ---------------- */
{
  const sandbox = { routines: [], history, console };
  vm.createContext(sandbox);
  vm.runInContext(NAMES.map(extractFn).join("\n") + "\n" +
    NAMES.map(n => "globalThis." + n + " = " + n + ";").join("\n"), sandbox);
  check("sem rotinas agendadas, algumaRotinaDevidaEm nunca é true", !sandbox.algumaRotinaDevidaEm(1));
}

console.log(failures === 0 ? "\nSTREAK OK" : "\n" + failures + " FALHA(S) EM STREAK");
if (failures > 0) process.exitCode = 1;
