/* Smoke test do app (npm test): boot em jsdom com IndexedDB simulado.
   Sessão 1: localStorage tem dados antigos -> app migra p/ IndexedDB e renderiza.
   Sessão 2: localStorage vazio, mesmo IndexedDB -> dados sobrevivem.
   Extra: nenhum recurso externo (http) referenciado no <head>. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (!ok && extra ? " :: " + extra : ""));
  if (!ok) failures++;
}

const NOTE = { id: "abc123", title: "Nota migrada", content: "conteúdo de teste", ts: 1750000000000 };

function boot({ seedLocalStorage }) {
  return new Promise((resolve) => {
    const errors = [];
    const dom = new JSDOM(html, {
      url: "http://localhost/",
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window) {
        window.indexedDB = indexedDB;
        window.IDBKeyRange = IDBKeyRange;
        if (seedLocalStorage) {
          window.localStorage.setItem("rotinas_v2_notes", JSON.stringify([NOTE]));
        }
        window.addEventListener("error", (e) => errors.push(e.error ? String(e.error) : e.message));
      },
    });
    setTimeout(() => resolve({ dom, errors }), 1200);
  });
}

(async () => {
  const head = html.slice(0, html.indexOf("</head>"));
  check("head sem recursos externos (offline de verdade)", !/https?:\/\//.test(head.replace(/<!--[\s\S]*?-->/g, "")));

  const s1 = await boot({ seedLocalStorage: true });
  check("sessão 1: sem erros de página", s1.errors.length === 0, s1.errors.join(" | "));
  const app1 = s1.dom.window.document.getElementById("app");
  check("sessão 1: app renderizou", app1 && app1.children.length > 0);
  s1.dom.window.close();

  const s2 = await boot({ seedLocalStorage: false });
  check("sessão 2: sem erros de página", s2.errors.length === 0, s2.errors.join(" | "));
  const app2 = s2.dom.window.document.getElementById("app");
  check("sessão 2: app renderizou", app2 && app2.children.length > 0);

  const dbReq = indexedDB.open("brita", 1);
  dbReq.onsuccess = () => {
    const req = dbReq.result.transaction("kv", "readonly").objectStore("kv").get("rotinas_v2_notes");
    req.onsuccess = () => {
      const notes = req.result;
      check("IndexedDB: nota migrada persistida", Array.isArray(notes) && notes.length === 1 && notes[0].title === "Nota migrada", JSON.stringify(notes || null).slice(0, 120));
      console.log(failures === 0 ? "\nSMOKE OK" : "\nSMOKE FALHOU: " + failures + " check(s)");
      process.exit(failures === 0 ? 0 : 1);
    };
    req.onerror = () => { check("IndexedDB: leitura", false, String(req.error)); process.exit(1); };
  };
  dbReq.onerror = () => { check("IndexedDB: open", false, String(dbReq.error)); process.exit(1); };
})();
