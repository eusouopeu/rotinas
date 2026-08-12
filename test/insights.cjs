/* Testes da função pura de insights proativos da aba Dados (gerarInsights):
   cruza pontualidade, dia da semana e desvio de duração já calculados em
   outros lugares da tela. Cada regra só fala com pelo menos 3 execuções —
   é isso que este teste garante que não regride (silêncio com poucos dados,
   fala clara acima do limiar). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (!ok && extra ? " :: " + extra : ""));
  if (!ok) failures++;
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

const sandbox = {
  escapeHtml(s) { return (s || ""); },
  console
};
vm.createContext(sandbox);
vm.runInContext(extractFn("median") + "\n" + extractFn("gerarInsights"), sandbox);
const F = sandbox;

function contains(list, trecho) { return list.some(t => t.includes(trecho)); }

/* ---------------- silêncio com pouco dado ---------------- */
check("sem execuções não gera insight nenhum", F.gerarInsights([]).length === 0);
check("2 execuções (abaixo do limiar de 3) não fala nada",
  F.gerarInsights([
    { routineName: "Ler", schedDelayMin: 20, ts: Date.parse("2026-08-03") },
    { routineName: "Ler", schedDelayMin: 25, ts: Date.parse("2026-08-04") }
  ]).length === 0);

/* ---------------- atraso mediano alto por rotina ---------------- */
{
  const rich = [
    { routineName: "Estudar mandarim", schedDelayMin: 20, ts: Date.parse("2026-08-03T08:00:00") },
    { routineName: "Estudar mandarim", schedDelayMin: 18, ts: Date.parse("2026-08-04T08:00:00") },
    { routineName: "Estudar mandarim", schedDelayMin: 22, ts: Date.parse("2026-08-05T08:00:00") }
  ];
  const out = F.gerarInsights(rich);
  check("atraso mediano > 10min gera insight nomeando a rotina", contains(out, "Estudar mandarim") && contains(out, "atrasa"));
}
{
  const rich = [
    { routineName: "Pontual", schedDelayMin: 2, ts: Date.parse("2026-08-03T08:00:00") },
    { routineName: "Pontual", schedDelayMin: -1, ts: Date.parse("2026-08-04T08:00:00") },
    { routineName: "Pontual", schedDelayMin: 3, ts: Date.parse("2026-08-05T08:00:00") }
  ];
  check("atraso mediano baixo não gera insight de atraso", !contains(F.gerarInsights(rich), "Pontual"));
}

/* ---------------- dia da semana concentrando atraso ---------------- */
{
  // três terças (2026-08-04, 11, 18) com atraso alto; resto da semana pontual
  const rich = [
    { routineName: "A", schedDelayMin: 30, ts: Date.parse("2026-08-04T08:00:00") }, // terça
    { routineName: "A", schedDelayMin: 28, ts: Date.parse("2026-08-11T08:00:00") }, // terça
    { routineName: "A", schedDelayMin: 32, ts: Date.parse("2026-08-18T08:00:00") }, // terça
    { routineName: "A", schedDelayMin: 0,  ts: Date.parse("2026-08-05T08:00:00") }, // quarta
    { routineName: "A", schedDelayMin: 1,  ts: Date.parse("2026-08-06T08:00:00") }, // quinta
    { routineName: "A", schedDelayMin: -1, ts: Date.parse("2026-08-07T08:00:00") }  // sexta
  ];
  const out = F.gerarInsights(rich);
  check("dia da semana com atraso destacado é apontado", contains(out, "terças"));
}

/* ---------------- estouro/folga de duração ---------------- */
{
  const rich = [
    { routineName: "Corrida", plannedSec: 1800, actualSec: 2400, ts: 1 }, // +33%
    { routineName: "Corrida", plannedSec: 1800, actualSec: 2500, ts: 2 }, // +39%
    { routineName: "Corrida", plannedSec: 1800, actualSec: 2300, ts: 3 }  // +28%
  ];
  check("estouro mediano de duração >= 25% gera insight", contains(F.gerarInsights(rich), "Corrida"));
}
{
  const rich = [
    { routineName: "Rápida", plannedSec: 1800, actualSec: 1200, ts: 1 }, // -33%
    { routineName: "Rápida", plannedSec: 1800, actualSec: 1100, ts: 2 }, // -39%
    { routineName: "Rápida", plannedSec: 1800, actualSec: 1300, ts: 3 }  // -28%
  ];
  const out = F.gerarInsights(rich);
  check("folga mediana >= 25% também vira insight (sugere encurtar)", contains(out, "Rápida") && contains(out, "encurtar"));
}
{
  const rich = [
    { routineName: "No alvo", plannedSec: 1800, actualSec: 1850, ts: 1 },
    { routineName: "No alvo", plannedSec: 1800, actualSec: 1750, ts: 2 },
    { routineName: "No alvo", plannedSec: 1800, actualSec: 1820, ts: 3 }
  ];
  check("desvio pequeno não gera insight de duração", !contains(F.gerarInsights(rich), "No alvo"));
}

/* ---------------- teto de 5 insights ---------------- */
{
  const rich = [];
  for (let i = 1; i <= 8; i++) {
    for (let j = 0; j < 3; j++) {
      rich.push({ routineName: "Rotina" + i, plannedSec: 1800, actualSec: 2600, ts: i * 10 + j });
    }
  }
  check("no máximo 5 insights, mesmo com muitos gatilhos", F.gerarInsights(rich).length <= 5);
}

console.log(failures === 0 ? "\nINSIGHTS OK" : "\n" + failures + " FALHA(S) EM INSIGHTS");
process.exit(failures === 0 ? 0 : 1);
