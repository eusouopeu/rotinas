/* Testes da pasta de dados configurável (nativo): sanitização do nome e a
   migração de arquivos entre pastas. Mesma abordagem dos outros testes: extrai
   as funções reais do index.html e roda num escopo controlado, com um
   Filesystem falso em memória no lugar do plugin do Capacitor — assim o teste
   pega regressão de verdade sem precisar de um APK rodando. */
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
  check(label, actual === expected, "esperado " + JSON.stringify(expected) + ", veio " + JSON.stringify(actual));
}

function extractFn(name) {
  // "async function X(" — sem isso, migrarPastaDados perde o "async" e os
  // await internos viram erro de sintaxe no vm
  const asyncStart = src.indexOf("async function " + name + "(");
  const plainStart = src.indexOf("function " + name + "(");
  const start = asyncStart !== -1 ? asyncStart : plainStart;
  if (start === -1) throw new Error("função não encontrada no index.html: " + name);
  let i = src.indexOf("{", start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error("chaves desbalanceadas em " + name);
}

function extractConst(name) {
  const re = new RegExp("^\\s*const " + name + "\\s*=[\\s\\S]*?^\\s*\\};", "m");
  const m = src.match(re);
  if (!m) throw new Error("const não encontrada no index.html: " + name);
  return m[0];
}

const NAMES = ["sanitizeFolderName", "migrarPastaDados", "subpastasConhecidas"];
const CONSTS = ["TIPO_SUBPASTA"];

/* Filesystem falso: um Map plano "pasta/arquivo.json" -> conteúdo, imitando
   readdir/readFile/writeFile/deleteFile do plugin real o suficiente para
   migrarPastaDados (que só lista, lê texto, escreve texto e apaga). */
function criarFsFalso(arquivosIniciais) {
  const files = new Map(Object.entries(arquivosIniciais));
  return {
    files,
    async readdir({ path: p }) {
      const prefix = p + "/";
      const names = [...files.keys()]
        .filter(k => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
        .map(k => k.slice(prefix.length));
      return { files: names };
    },
    async readFile({ path: p }) {
      if (!files.has(p)) throw new Error("ENOENT: " + p);
      return { data: files.get(p) };
    },
    async writeFile({ path: p, data }) { files.set(p, data); },
    async deleteFile({ path: p }) { files.delete(p); }
  };
}

function novoSandbox(arquivosIniciais) {
  const fsFalso = criarFsFalso(arquivosIniciais || {});
  const sandbox = {
    isNative: true,
    window: { Capacitor: { Plugins: { Filesystem: fsFalso } } },
    console,
    _fs: fsFalso
  };
  vm.createContext(sandbox);
  vm.runInContext(
    CONSTS.map(extractConst).join("\n") + "\n" +
    NAMES.map(extractFn).join("\n") + "\n" +
    CONSTS.map(n => "globalThis." + n + " = " + n + ";").join("\n"),
    sandbox);
  return sandbox;
}

/* ---------------- sanitizeFolderName ---------------- */
{
  const F = novoSandbox({});
  eq("nome comum passa direto", F.sanitizeFolderName("Rotinas"), "Rotinas");
  eq("espaços nas pontas são cortados", F.sanitizeFolderName("  Meus Dados  "), "Meus Dados");
  eq("barra é removida (evitaria criar subpasta)", F.sanitizeFolderName("a/b"), "ab");
  eq("caracteres inválidos no Android são removidos", F.sanitizeFolderName('a:b*c?d"e<f>g|h'), "abcdefgh");
  eq("vazio cai no padrão", F.sanitizeFolderName(""), "Rotinas");
  eq("só espaço cai no padrão", F.sanitizeFolderName("   "), "Rotinas");
  eq("nome muito longo é cortado em 60", F.sanitizeFolderName("x".repeat(200)).length, 60);
}

/* ---------------- migrarPastaDados ---------------- */
(async () => {
  {
    const F = novoSandbox({
      "Rotinas/backup1.json": '{"a":1}',
      "Rotinas/backup2.json": '{"a":2}',
      "Rotinas/Notas/nota-abc.md": "# Nota"
    });
    const movidos = await F.migrarPastaDados("Rotinas", "Dados Pessoais");
    eq("conta os 3 arquivos movidos (raiz + Notas)", movidos, 3);
    check("backup1 saiu da pasta antiga", !F._fs.files.has("Rotinas/backup1.json"));
    check("backup1 chegou na pasta nova", F._fs.files.has("Dados Pessoais/backup1.json"));
    check("nota chegou em Notas/ dentro da pasta nova", F._fs.files.has("Dados Pessoais/Notas/nota-abc.md"));
    eq("conteúdo preservado na migração", F._fs.files.get("Dados Pessoais/backup2.json"), '{"a":2}');
  }
  {
    // pasta antiga vazia/inexistente: não é erro, só não move nada
    const F = novoSandbox({});
    const movidos = await F.migrarPastaDados("Rotinas", "Nova Pasta");
    eq("pasta antiga vazia devolve 0 movidos, sem lançar erro", movidos, 0);
  }
  {
    // nome igual: não faz nada (evita reescrever tudo à toa)
    const F = novoSandbox({ "Rotinas/backup1.json": "{}" });
    const movidos = await F.migrarPastaDados("Rotinas", "Rotinas");
    eq("mesmo nome não migra nada", movidos, 0);
    check("arquivo original intacto", F._fs.files.has("Rotinas/backup1.json"));
  }
  {
    // cada subpasta por categoria migra junto — não só a raiz e a "Notas" legada
    const F = novoSandbox({
      "Rotinas/Rotinas/estudar-mandarim.json": "{}",
      "Rotinas/Backups/rotinas-backup-2026-08-07.json": "{}",
      "Rotinas/Dados/rotinas-estatisticas.csv": "data;valor",
      "Rotinas/Listas de mercado/mercado-feira.md": "# Feira",
      "Rotinas/Anotações de Rotinas/diario-corrida-2026-08-07.md": "# Corrida"
    });
    const movidos = await F.migrarPastaDados("Rotinas", "Dados Pessoais");
    eq("migra as 5 subpastas por categoria de uma vez", movidos, 5);
    check("rotina exportada chega na pasta nova", F._fs.files.has("Dados Pessoais/Rotinas/estudar-mandarim.json"));
    check("backup chega na pasta nova", F._fs.files.has("Dados Pessoais/Backups/rotinas-backup-2026-08-07.json"));
    check("CSV de dados chega na pasta nova", F._fs.files.has("Dados Pessoais/Dados/rotinas-estatisticas.csv"));
    check("espelho de modelo (mercado) chega na pasta nova", F._fs.files.has("Dados Pessoais/Listas de mercado/mercado-feira.md"));
    check("anotação de rotina chega na pasta nova", F._fs.files.has("Dados Pessoais/Anotações de Rotinas/diario-corrida-2026-08-07.md"));
  }

  console.log(failures === 0 ? "\nDATAFOLDER OK" : "\n" + failures + " FALHA(S)");
  process.exit(failures === 0 ? 0 : 1);
})();
