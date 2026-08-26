/* Testes das mensagens motivacionais: o motor de estágio/gatilho (puro, sem
   rede) e o validador anti-alucinação numérica. O redator via API não é
   testado aqui (é rede) — só o fallback local por template e o validador que
   descarta qualquer resposta da IA com número fora dos cartões enviados.

   Mesma abordagem dos outros testes: extrai funções/constantes do index.html
   e roda num vm sandbox. */
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
  const m = new RegExp("const " + name + "\\s*=\\s*([\\[{])").exec(src);
  if (!m) throw new Error("constante não encontrada no index.html: " + name);
  const open = m[1], close = open === "[" ? "]" : "}";
  let i = m.index + m[0].length - 1, depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (depth === 0) return src.slice(m.index, i + 1) + ";"; }
  }
  throw new Error("colchetes/chaves desbalanceados em " + name);
}

const FNS = [
  "motivaJanela", "motivaEstagioPorDias", "motivaEstagio",
  "motivaSelecionarCartoes", "motivaCabecalho", "motivaMensagemTemplate",
  "motivaValidarTexto",
];
const CONSTS = ["EIXOS", "MOTIVA_CORPUS", "MOTIVA_JANELAS"];

const ctx = {};
vm.createContext(ctx);
// `const` não vira propriedade do objeto global do vm (diferente de `var`) —
// trocado aqui só pra ctx.NOME funcionar no teste; o código-fonte real fica intacto.
CONSTS.forEach(n => vm.runInContext(extractConst(n).replace(/^const /, "var "), ctx));
FNS.forEach(n => vm.runInContext(extractFn(n), ctx));

// ---- estágio por dias/domínio ----
eq("exercicios, 5 dias -> estágio 0 (novidade)", ctx.motivaEstagio("exercicios", 5, 1), 0);
eq("exercicios, 20 dias, boa adesão -> estágio 1 (atrito)", ctx.motivaEstagio("exercicios", 20, 0.9), 1);
eq("exercicios, 60 dias, boa adesão -> estágio 2 (platô)", ctx.motivaEstagio("exercicios", 60, 0.9), 2);
eq("exercicios, 100 dias, boa adesão -> estágio 3 (consolidação)", ctx.motivaEstagio("exercicios", 100, 0.9), 3);
eq("domínio desconhecido cai no fallback 'geral'", ctx.motivaEstagio("nao-existe", 60, 0.9), ctx.motivaEstagio("geral", 60, 0.9));

// ---- adesão baixa trava o estágio em 1, mesmo com muito tempo decorrido ----
eq("100 dias mas adesão de 30% -> trava em estágio 1 (atrito arrastado)", ctx.motivaEstagio("exercicios", 100, 0.3), 1);
eq("adesão null não trava nada (comportamento normal por tempo)", ctx.motivaEstagio("exercicios", 100, null), 3);

// ---- seleção de cartões: 1 por tipo, prefere o específico do domínio ao genérico ----
const cartoesExeE1 = ctx.motivaSelecionarCartoes("exercicios", 1);
check("estágio 1 de exercícios tem ao menos um cartão de tempo_ate_resultado", cartoesExeE1.some(c => c.tipo === "tempo_ate_resultado"));
check("nenhum cartão fora do domínio/estágio pedido vaza pra seleção", cartoesExeE1.every(c => (!c.dominio || c.dominio === "exercicios") && c.estagios.includes(1)));
const tipos = cartoesExeE1.map(c => c.tipo);
eq("no máximo 1 cartão por tipo", tipos.length, new Set(tipos).size);

const cartoesDominioInexistente = ctx.motivaSelecionarCartoes("nao-existe", 1);
check("domínio sem cartão específico ainda pega os cartões gerais (sentimento/hábito)", cartoesDominioInexistente.length > 0);
check("domínio sem cartão específico não inventa cartão de outro domínio", cartoesDominioInexistente.every(c => !c.dominio));

// ---- mensagem por template: nunca cita número fora do cartão selecionado ----
const cand = { entidade: "rotina", nome: "Musculação", dominio: "exercicios", dias: 20, streak: 20, gatilho: "sequencia", estagio: 1 };
const msg = ctx.motivaMensagemTemplate(cand);
check("template gera título não vazio", !!msg.titulo);
check("template gera corpo não vazio", !!msg.corpo);
check("cartoesUsados é a mesma lista que foi selecionada para o estágio", JSON.stringify(msg.cartoesUsados.slice().sort()) === JSON.stringify(ctx.motivaSelecionarCartoes("exercicios", 1).map(c => c.id).sort()));
check("template passa no próprio validador (nunca deveria falhar contra seus próprios cartões)",
  ctx.motivaValidarTexto(msg.corpo, ctx.motivaSelecionarCartoes("exercicios", 1)));

// estágio sem nenhum cartão cadastrado -> mensagem de fallback textual, não quebra
const candVazio = { entidade: "rotina", nome: "X", dominio: "exercicios", dias: 1, streak: 0, gatilho: "marco", estagio: 0 };
const cartoesEstagio0 = ctx.motivaSelecionarCartoes("exercicios", 0);
if (cartoesEstagio0.length === 0) {
  const msgVazia = ctx.motivaMensagemTemplate(candVazio);
  check("sem cartão para o estágio, cai no texto de fallback em vez de corpo vazio", msgVazia.corpo.length > 0);
  eq("sem cartão, cartoesUsados fica vazio (não inventa fonte)", msgVazia.cartoesUsados, []);
}

// ---- cabeçalho varia por gatilho ----
check("gatilho de ruptura menciona 'sem'", ctx.motivaCabecalho({ gatilho: "ruptura", nome: "Leitura", dias: 10, streak: 0 }).includes("sem"));
check("gatilho de sequência menciona o streak", ctx.motivaCabecalho({ gatilho: "sequencia", nome: "Leitura", dias: 30, streak: 25 }).includes("25"));
check("gatilho de meta estagnada menciona 'prazo'", ctx.motivaCabecalho({ gatilho: "estagnada", nome: "TCC", dias: 40, streak: 0 }).includes("prazo"));

// ---- validador anti-alucinação: barra qualquer número fora dos cartões enviados ----
const cartaoTeste = { id: "t1", afirmacao: "Isso costuma levar entre 8 e 12 semanas.", faixa: [8, 12] };
check("texto só com números presentes no cartão passa", ctx.motivaValidarTexto("Costuma levar 8 a 12 semanas.", [cartaoTeste]));
check("texto sem nenhum número passa (nada pra validar)", ctx.motivaValidarTexto("Isso é normal, siga em frente.", [cartaoTeste]));
check("texto com número INVENTADO (fora do cartão) é rejeitado", !ctx.motivaValidarTexto("Em apenas 3 dias você já vai sentir 47% de melhora.", [cartaoTeste]));
check("texto citando a faixa bruta do cartão (não só a afirmação) passa", ctx.motivaValidarTexto("A faixa costuma ser 8 a 12.", [cartaoTeste]));
check("sem cartão nenhum, qualquer número é rejeitado", !ctx.motivaValidarTexto("Isso leva 8 semanas.", []));

// ---- corpus: todo cartão tem os campos mínimos, e todo domínio citado existe em EIXOS ou é o fallback 'geral' ----
const idsEixos = new Set(ctx.EIXOS.map(e => e.id));
let corpusOk = true;
ctx.MOTIVA_CORPUS.forEach(c => {
  if (!c.id || !c.tipo || !c.afirmacao || !Array.isArray(c.estagios) || !c.forca || !c.fonte) corpusOk = false;
  if (c.dominio && !idsEixos.has(c.dominio)) corpusOk = false;
});
check("todo cartão do corpus tem id/tipo/afirmacao/estagios/forca/fonte, e domínio (se houver) existe em EIXOS", corpusOk);
const idsUnicos = new Set(ctx.MOTIVA_CORPUS.map(c => c.id));
eq("nenhum id de cartão duplicado no corpus", idsUnicos.size, ctx.MOTIVA_CORPUS.length);

console.log(failures === 0 ? "\nMOTIVACIONAL OK" : "\n" + failures + " FALHA(S)");
process.exit(failures === 0 ? 0 : 1);
