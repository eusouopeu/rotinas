/* Testes das funções puras do Diário: time-blocking (parse + distribuição em
   colunas quando os blocos se sobrepõem) e as chaves/rótulos de período.

   Mesma abordagem dos outros testes: extrai as funções do próprio index.html
   e roda num vm sandbox. Cobre o que já foi bug antes (CLAUDE.md): bloco sem
   hora de fim é SEMPRE 1h fixa (não "até o próximo bloco"), e blocos
   sobrepostos dividem a largura em colunas sem se atropelar. */
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
function extractConst(name) {
  const re = new RegExp("^\\s*const " + name + "\\s*=.*$", "m");
  const m = src.match(re);
  if (!m) throw new Error("const não encontrada no index.html: " + name);
  return m[0];
}

const NAMES = [
  "localKey", "isoToDate", "inicioSemanaISO", "addDaysISO", "weekStartDow",
  "parseTimeBlocks", "distribuirColunas", "diarioChave", "diarioRotulo", "escopoDoPer"
];
const CONSTS = ["RE_TIMEBLOCK", "MESES_PT", "DIAS_PT"];

const sandbox = {
  K_WEEKSTART: "weekstart",
  _store: {},
  load(k, fallback) { return (k in sandbox._store) ? sandbox._store[k] : fallback; },
  console
};
vm.createContext(sandbox);
vm.runInContext(
  CONSTS.map(extractConst).join("\n") + "\n" +
  NAMES.map(extractFn).join("\n") + "\n" +
  CONSTS.map(n => "globalThis." + n + " = " + n + ";").join("\n"),
  sandbox);
const F = sandbox;

/* ---------------- time-blocking: parse ---------------- */
eq("bloco com hora de fim",
  F.parseTimeBlocks("- [ ] 08:00 - 09:30 Estudar").map(b => [b.ini, b.fim, b.texto]),
  [[480, 570, "Estudar"]]);

// sem hora de fim: SEMPRE 1h fixa, nunca "até o próximo bloco"
eq("bloco sem hora de fim vira 1h fixa, mesmo com outro bloco logo depois",
  F.parseTimeBlocks("- [ ] 08:00 Estudar\n- [ ] 08:15 Reunião").map(b => [b.ini, b.fim]),
  [[480, 540], [495, 555]]);

eq("hora de fim antes da de início também vira 1h fixa (engano de digitação)",
  F.parseTimeBlocks("- [ ] 10:00 - 09:00 Tarefa").map(b => [b.ini, b.fim]),
  [[600, 660]]);

eq("estado feito/adiado reconhecido", F.parseTimeBlocks(
  "- [x] 08:00 Feito\n- [>] 09:00 Adiado\n- [ ] 10:00 Aberto"
).map(b => [b.feito, b.adiado]), [[true, false], [false, true], [false, false]]);

eq("linha sem checklist não vira bloco", F.parseTimeBlocks("apenas um texto qualquer").length, 0);

eq("hora >= 24h é ignorada", F.parseTimeBlocks("- [ ] 25:00 Impossível").length, 0);

eq("blocos saem ordenados por horário, não pela ordem no texto",
  F.parseTimeBlocks("- [ ] 14:00 Tarde\n- [ ] 08:00 Manhã").map(b => b.texto),
  ["Manhã", "Tarde"]);

/* ---------------- distribuição em colunas ---------------- */
function colsDe(texto) {
  const blocos = F.parseTimeBlocks(texto);
  blocos.sort((a, b) => a.ini - b.ini || a.linha - b.linha);
  F.distribuirColunas(blocos);
  return blocos.map(b => [b.texto, b.col, b.cols]);
}

eq("blocos sem sobreposição ficam sozinhos numa coluna só",
  colsDe("- [ ] 08:00 - 09:00 A\n- [ ] 10:00 - 11:00 B"),
  [["A", 0, 1], ["B", 0, 1]]);

eq("dois blocos sobrepostos dividem em 2 colunas",
  colsDe("- [ ] 08:00 - 09:00 A\n- [ ] 08:30 - 09:30 B"),
  [["A", 0, 2], ["B", 1, 2]]);

eq("três blocos sobrepostos entre si dividem em 3 colunas",
  colsDe("- [ ] 08:00 - 10:00 A\n- [ ] 08:30 - 09:30 B\n- [ ] 09:00 - 09:45 C"),
  [["A", 0, 3], ["B", 1, 3], ["C", 2, 3]]);

eq("bloco que termina antes de outro começar reaproveita a coluna livre",
  colsDe("- [ ] 08:00 - 09:00 A\n- [ ] 08:30 - 09:30 B\n- [ ] 09:00 - 10:00 C"),
  [["A", 0, 2], ["B", 1, 2], ["C", 0, 2]]);

eq("grupos de sobreposição distintos não se misturam",
  colsDe("- [ ] 08:00 - 09:00 A\n- [ ] 08:30 - 09:30 B\n- [ ] 12:00 - 13:00 C"),
  [["A", 0, 2], ["B", 1, 2], ["C", 0, 1]]);

/* ---------------- chave/rótulo de período ---------------- */
eq("chave do dia", F.diarioChave("dia", "2026-08-07"), "dia:2026-08-07");
eq("chave do mês", F.diarioChave("mes", "2026-08-07"), "mes:2026-08");
eq("chave do ano", F.diarioChave("ano", "2026-08-07"), "ano:2026");
// domingo é o início padrão (K_WEEKSTART não setado): semana de 07/08/2026
// (sexta) começa no domingo 02/08/2026
eq("chave da semana usa o início configurado", F.diarioChave("semana", "2026-08-07"), "semana:2026-08-02");

eq("escopo a partir da chave", F.escopoDoPer("mes:2026-08"), "mes");
eq("escopo cai em 'dia' por padrão", F.escopoDoPer(""), "dia");

eq("rótulo do dia é só o dia da semana (data já aparece no seletor)", F.diarioRotulo("dia", "2026-08-07"), "sexta-feira");
eq("rótulo do mês", F.diarioRotulo("mes", "2026-08-07"), "agosto de 2026");
eq("rótulo do ano", F.diarioRotulo("ano", "2026-08-07"), "ano de 2026");

console.log(failures === 0 ? "\nDIARIO OK" : "\n" + failures + " FALHA(S) EM DIARIO");
process.exit(failures === 0 ? 0 : 1);
