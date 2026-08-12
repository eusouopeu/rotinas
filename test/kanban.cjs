/* Testes das funções puras de pontuação do Kanban do Diário: quanto um
   cartão vale por escopo (dia/semana/mês/ano) e para onde esse valor vai —
   dia/semana entram na semana corrente (e respeitam a fatia de área da roda
   da vida), mês/ano viram bônus fora da semana. Ver a seção "Kanban por
   escopo do Diário" do CLAUDE.md — é bastante fácil de acertar a fórmula e
   errar o destino, ou vice-versa.

   Mesma abordagem dos outros testes: extrai as funções do index.html e roda
   num vm sandbox. */
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
  const ok = Math.abs(actual - expected) <= (tol === undefined ? 1e-6 : tol);
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
  "tagMultiplicador", "pesoBruto", "fatorDaArea",
  "escopoDoPer", "cartaoVaiParaSemana", "periodoBonusDoCartao", "pontosCartao"
];
const CONSTS = ["KB_ESCOPO_MULT"];

const sandbox = {
  gam: {
    config: { multiplicadores: { nenhum: 0, baixo: 1.0, medio: 1.75, alto: 3.0 }, divisorDuracao: 30 },
    semanaAtual: { fatorNormalizacao: 2, fatoresArea: { idiomas: 5 } }
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(
  CONSTS.map(extractConst).join("\n") + "\n" +
  NAMES.map(extractFn).join("\n") + "\n" +
  CONSTS.map(n => "globalThis." + n + " = " + n + ";").join("\n"),
  sandbox);
const F = sandbox;

/* ---------------- escopo → destino ---------------- */
eq("dia entra na semana", F.cartaoVaiParaSemana("dia:2026-08-07"), true);
eq("semana entra na semana", F.cartaoVaiParaSemana("semana:2026-08-02"), true);
eq("mês vira bônus fora da semana", F.cartaoVaiParaSemana("mes:2026-08"), false);
eq("ano vira bônus fora da semana", F.cartaoVaiParaSemana("ano:2026"), false);

eq("período de bônus do mês é o próprio mês", F.periodoBonusDoCartao("mes:2026-08"), "2026-08");
eq("período de bônus do ano é o próprio ano", F.periodoBonusDoCartao("ano:2026"), "2026");

/* ---------------- peso "nenhum" (padrão) não pontua ---------------- */
eq("peso nenhum não pontua em nenhum escopo", F.pontosCartao("nenhum", "dia:2026-08-07", null), 0);
eq("tag vazia/undefined também não pontua", F.pontosCartao(undefined, "dia:2026-08-07", null), 0);

/* ---------------- escopo mais longo pesa mais (KB_ESCOPO_MULT) ---------------- */
{
  const dia = F.pontosCartao("baixo", "dia:2026-08-07", null);
  const semana = F.pontosCartao("baixo", "semana:2026-08-02", null);
  const mes = F.pontosCartao("baixo", "mes:2026-08", null);
  const ano = F.pontosCartao("baixo", "ano:2026", null);
  near("semana vale o dobro do dia", semana, dia * 2);
  near("mês vale o triplo do dia", mes, dia * 3);
  near("ano vale o quádruplo do dia", ano, dia * 4);
}

/* ---------------- dia/semana respeitam a fatia da área; mês/ano usam o fator único ---------------- */
{
  const comArea = F.pontosCartao("medio", "dia:2026-08-07", "idiomas");
  const semArea = F.pontosCartao("medio", "dia:2026-08-07", "outra-area-sem-fatia");
  near("área com fatia própria usa o fator da área (5), não o único (2)",
    comArea, F.pesoBruto("medio", 30) * 5 * F.KB_ESCOPO_MULT.dia);
  near("área sem fatia cai no fator único da semana",
    semArea, F.pesoBruto("medio", 30) * 2 * F.KB_ESCOPO_MULT.dia);

  const mesComArea = F.pontosCartao("medio", "mes:2026-08", "idiomas");
  near("mês IGNORA a fatia da área — usa sempre o fator único",
    mesComArea, F.pesoBruto("medio", 30) * 2 * F.KB_ESCOPO_MULT.mes);
}

/* ---------------- cartão não tem duração: vale um bloco da referência ---------------- */
near("peso bruto do cartão = multiplicador puro (sqrt(1))",
  F.pesoBruto("alto", 30), F.tagMultiplicador("alto"));

console.log(failures === 0 ? "\nKANBAN OK" : "\n" + failures + " FALHA(S) EM KANBAN");
process.exit(failures === 0 ? 0 : 1);
