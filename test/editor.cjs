/* Testes das funções puras do editor markdown contínuo (live preview).

   Mesma abordagem do test/gamificacao.cjs: em vez de duplicar a lógica aqui,
   o teste EXTRAI as funções do próprio index.html e as avalia num escopo
   controlado. As partes que dependem do DOM (foco, seleção, eventos de teclado)
   ficam de fora — o que se cobre aqui é a manipulação de texto, que é onde os
   erros silenciosos custam caro: Enter partindo a linha no lugar errado,
   Backspace juntando linhas errado, continuação de lista, offsets. */
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
/* consts de uma linha só (as expressões regulares do markdown) */
function extractConst(name) {
  const re = new RegExp("^\\s*const " + name + "\\s*=.*$", "m");
  const m = src.match(re);
  if (!m) throw new Error("const não encontrada no index.html: " + name);
  return m[0];
}

const NAMES = [
  "liveLines", "liveOffset", "livePos", "liveAplicar",
  "livePrefixoContinuacao", "liveListaVazia", "estadoCheck",
  "setCheckStateInText", "toggleCheckLineInText"
];
const CONSTS = ["RE_CHECK", "RE_OL", "RE_UL"];

/* fonte de texto de mentira: o editor real recebe isso via liveCtx */
let TEXTO = "";
const sandbox = {
  liveCtx: {
    getText: () => TEXTO,
    setText: t => { TEXTO = t; },
    id: () => "teste",
    sinkChecked: () => false
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(
  CONSTS.map(extractConst).join("\n") + "\n" +
  NAMES.map(extractFn).join("\n") + "\n" +
  // `const` no topo de um script do vm fica no escopo léxico, não vira
  // propriedade do sandbox: exporta explicitamente para o teste enxergar
  CONSTS.map(n => "globalThis." + n + " = " + n + ";").join("\n"),
  sandbox);
const F = sandbox;

function comTexto(t) { TEXTO = t; return F.liveLines(); }

/* ---------------- offsets <-> linha/coluna ---------------- */
const L = comTexto("abc\ndefg\nhi");
eq("offset da primeira linha", F.liveOffset(L, { line: 0, col: 2 }), 2);
eq("offset da segunda linha soma o \\n", F.liveOffset(L, { line: 1, col: 0 }), 4);
eq("offset da terceira linha", F.liveOffset(L, { line: 2, col: 2 }), 11);
eq("posição de volta (meio)", F.livePos("abc\ndefg\nhi", 6), { line: 1, col: 2 });
eq("posição de volta (início de linha)", F.livePos("abc\ndefg\nhi", 4), { line: 1, col: 0 });
eq("posição de volta (fim do texto)", F.livePos("abc\ndefg\nhi", 11), { line: 2, col: 2 });
eq("texto vazio tem uma linha vazia", comTexto(""), [""]);

/* ---------------- Enter: parte a linha ---------------- */
comTexto("uma linha");
let caret = F.liveAplicar({ line: 0, col: 3 }, { line: 0, col: 3 }, "\n");
eq("Enter parte a linha em duas", TEXTO, "uma\n linha");
eq("cursor vai para o começo da linha nova", caret, { line: 1, col: 0 });

/* ---------------- Enter com continuação de lista ---------------- */
eq("checklist com hífen continua como checklist", F.livePrefixoContinuacao("- [ ] comprar pão"), "- [ ] ");
eq("checklist marcada continua desmarcada", F.livePrefixoContinuacao("- [x] feito"), "- [ ] ");
eq("checklist adiada continua desmarcada", F.livePrefixoContinuacao("- [>] adiado"), "- [ ] ");
eq("lista numerada incrementa", F.livePrefixoContinuacao("3. terceiro"), "4. ");
eq("lista com marcador continua", F.livePrefixoContinuacao("- item"), "- ");
eq("parágrafo comum não gera prefixo", F.livePrefixoContinuacao("texto solto"), "");
eq("título não vira lista", F.livePrefixoContinuacao("## Seção"), "");

comTexto("- [ ] primeiro");
caret = F.liveAplicar({ line: 0, col: 14 }, { line: 0, col: 14 }, "\n" + F.livePrefixoContinuacao("- [ ] primeiro"));
eq("Enter no fim de um item cria o próximo já como item", TEXTO, "- [ ] primeiro\n- [ ] ");
eq("cursor fica depois do marcador", caret, { line: 1, col: 6 });

/* ---------------- item vazio + Enter sai da lista ---------------- */
check("item de checklist vazio é detectado", F.liveListaVazia("- [ ] ") === true);
check("item numerado vazio é detectado", F.liveListaVazia("2. ") === true);
check("item com marcador vazio é detectado", F.liveListaVazia("- ") === true);
check("item preenchido não conta como vazio", F.liveListaVazia("- [ ] algo") === false);
check("parágrafo não conta como item vazio", F.liveListaVazia("texto") === false);

comTexto("- [ ] cheio\n- [ ] ");
F.liveAplicar({ line: 1, col: 0 }, { line: 1, col: 6 }, "");
eq("sair da lista limpa o marcador da linha", TEXTO, "- [ ] cheio\n");

/* ---------------- Backspace no começo junta com a linha anterior ---------------- */
comTexto("primeira\nsegunda");
caret = F.liveAplicar({ line: 0, col: 8 }, { line: 1, col: 0 }, "");
eq("Backspace no col 0 junta as duas linhas", TEXTO, "primeirasegunda");
eq("cursor fica na emenda", caret, { line: 0, col: 8 });

/* ---------------- seleção cruzando linhas ---------------- */
comTexto("aaa\nbbb\nccc");
caret = F.liveAplicar({ line: 0, col: 1 }, { line: 2, col: 2 }, "");
eq("apagar seleção de várias linhas", TEXTO, "ac");
eq("cursor no ponto do corte", caret, { line: 0, col: 1 });

comTexto("aaa\nbbb");
caret = F.liveAplicar({ line: 0, col: 1 }, { line: 1, col: 1 }, "X");
eq("substituir seleção multi-linha por texto", TEXTO, "aXbb");
eq("cursor depois do texto inserido", caret, { line: 0, col: 2 });

/* seleção invertida (arrastada de baixo para cima) precisa dar no mesmo */
comTexto("aaa\nbbb");
F.liveAplicar({ line: 1, col: 1 }, { line: 0, col: 1 }, "X");
eq("seleção invertida é normalizada", TEXTO, "aXbb");

/* ---------------- colar várias linhas ---------------- */
comTexto("antes depois");
caret = F.liveAplicar({ line: 0, col: 6 }, { line: 0, col: 6 }, "1\n2\n3");
eq("colar texto multi-linha", TEXTO, "antes 1\n2\n3depois");
eq("cursor no fim do que foi colado", caret, { line: 2, col: 1 });

/* ---------------- estados da checklist ---------------- */
eq("estado aberto", F.estadoCheck("- [ ] x".match(sandbox.RE_CHECK)), "aberto");
eq("estado feito", F.estadoCheck("- [x] x".match(sandbox.RE_CHECK)), "feito");
eq("estado adiado", F.estadoCheck("- [>] x".match(sandbox.RE_CHECK)), "adiado");
eq("marcar adiado a partir de aberto",
  F.setCheckStateInText("- [ ] tarefa", 0, ">"), "- [>] tarefa");
eq("arrastar de novo desfaz o adiado",
  F.setCheckStateInText("- [>] tarefa", 0, ">"), "- [ ] tarefa");
eq("tocar na caixa de um item adiado marca como feito",
  F.toggleCheckLineInText("- [>] tarefa", 0), "- [x] tarefa");
eq("tocar na caixa de um item feito desmarca",
  F.toggleCheckLineInText("- [x] tarefa", 0), "- [ ] tarefa");

console.log(failures === 0 ? "\nEDITOR OK" : "\n" + failures + " FALHA(S)");
process.exit(failures === 0 ? 0 : 1);
