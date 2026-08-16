/* Testes unitários do merge3Way (Fase 2 do sync — merge granular item-a-item),
   isolado do ciclo de sync completo: chama a função pura direto, sem precisar
   do stub de electron/Drive que test/sync.cjs monta (aquele cobre a INTEGRAÇÃO
   — que o engine chama merge3Way no momento certo e aplica o resultado; este
   cobre o ALGORITMO — os casos de borda de identidade/exclusão/conflito). */
"use strict";

const os = require("os");
const path = require("path");

// engine.js lê app.getPath() no topo do arquivo (fora de qualquer função) —
// precisa de um stub de "electron" ANTES do require, mesmo só testando
// merge3Way (que não toca em disco/rede). Mesmo truque de test/sync.cjs.
const electronPath = require.resolve("electron");
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: { app: { getPath: () => os.tmpdir() }, safeStorage: { isEncryptionAvailable: () => false }, shell: { openExternal: () => {} } }
};

const engine = require(path.join(__dirname, "..", "sync", "engine.js"));

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (!ok && extra ? " :: " + extra : ""));
  if (!ok) failures++;
}
function deepEq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  check(label, a === e, "esperado " + e + ", veio " + a);
}
const j = (v) => JSON.stringify(v);

/* ---------------- arrays com id ---------------- */

{
  // item adicionado só no local sobrevive; item adicionado só no remoto entra
  const base = [{ id: "a", v: 1 }];
  const local = [{ id: "a", v: 1 }, { id: "b-local", v: 1 }];
  const remote = [{ id: "a", v: 1 }, { id: "c-remoto", v: 1 }];
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("adição em cada lado: merge resolve", r.ok);
  deepEq("adição em cada lado: os dois itens sobrevivem", r.merged.map(x => x.id).sort(), ["a", "b-local", "c-remoto"]);
}

{
  // exclusão só no local se propaga; item intocado permanece
  const base = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const local = [{ id: "a", v: 1 }]; // removeu "b"
  const remote = [{ id: "a", v: 1 }, { id: "b", v: 1 }]; // não mexeu em nada
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("exclusão só no local: merge resolve", r.ok);
  deepEq("exclusão só no local: item removido não volta", r.merged.map(x => x.id), ["a"]);
}

{
  // exclusão só no remoto se propaga
  const base = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const local = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const remote = [{ id: "a", v: 1 }]; // removeu "b"
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("exclusão só no remoto: merge resolve", r.ok);
  deepEq("exclusão só no remoto: item removido não volta", r.merged.map(x => x.id), ["a"]);
}

{
  // edição só de um lado, no MESMO item, sobrevive — não é conflito
  const base = [{ id: "a", v: 1 }];
  const local = [{ id: "a", v: 2 }]; // só o local editou
  const remote = [{ id: "a", v: 1 }]; // remoto intocado
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("edição só de um lado no mesmo item: merge resolve", r.ok);
  deepEq("edição só de um lado: valor editado prevalece", r.merged, [{ id: "a", v: 2 }]);
}

{
  // os dois lados removem o mesmo item — sem conflito, resultado sem ele
  const base = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  const local = [{ id: "a", v: 1 }];
  const remote = [{ id: "a", v: 1 }];
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("exclusão nos dois lados do mesmo item: merge resolve", r.ok);
  deepEq("exclusão nos dois lados: item some", r.merged.map(x => x.id), ["a"]);
}

{
  // conflito de verdade: o MESMO item mudou dos dois lados, para coisas diferentes
  const base = [{ id: "a", v: 1 }];
  const local = [{ id: "a", v: 2 }];
  const remote = [{ id: "a", v: 3 }];
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("mesmo item editado diferente nos dois lados: NÃO resolve sozinho", !r.ok);
}

{
  // item sem id estável: não dá pra rastrear identidade — não mescla
  const base = [{ nome: "x" }];
  const local = [{ nome: "y" }];
  const remote = [{ nome: "z" }];
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("item sem id: não tenta mesclar (evita perder dado por engano)", !r.ok);
}

{
  // ordem: segue o local, itens só do remoto entram no fim
  const base = [{ id: "a" }, { id: "b" }];
  const local = [{ id: "b" }, { id: "a" }]; // reordenou manualmente
  const remote = [{ id: "a" }, { id: "b" }, { id: "c-novo-remoto" }];
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("reordenação local + adição remota: merge resolve", r.ok);
  deepEq("ordem final segue o local, novo item remoto vai pro fim", r.merged.map(x => x.id), ["b", "a", "c-novo-remoto"]);
}

/* ---------------- mapa período→texto (diário) ---------------- */

{
  const base = { "dia:2026-08-01": "oi" };
  const local = { "dia:2026-08-01": "oi", "dia:2026-08-02": "novo local" };
  const remote = { "dia:2026-08-01": "oi", "dia:2026-08-03": "novo remoto" };
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("diário: períodos novos em cada lado mesclam", r.ok);
  deepEq("diário: os dois períodos novos sobrevivem", r.merged, {
    "dia:2026-08-01": "oi", "dia:2026-08-02": "novo local", "dia:2026-08-03": "novo remoto"
  });
}

{
  // mesmo período editado nos dois lados, para textos diferentes: conflito de verdade
  const base = { "dia:2026-08-01": "original" };
  const local = { "dia:2026-08-01": "editado no celular" };
  const remote = { "dia:2026-08-01": "editado no desktop" };
  const r = engine.merge3Way(j(base), j(local), j(remote));
  check("diário: mesmo período editado diferente nos dois lados NÃO resolve sozinho", !r.ok);
}

/* ---------------- formatos que não mesclam (escalares, JSON inválido) ---------------- */

{
  const r = engine.merge3Way(j("dark"), j("light"), j("dark"));
  check("escalar (tema): sem merge granular, cai no fluxo de sempre", !r.ok);
}
{
  const r = engine.merge3Way("{not json", j([{ id: "a" }]), j([{ id: "a" }]));
  check("base corrompida: sem merge granular, sem lançar exceção", !r.ok);
}

console.log(failures === 0 ? "\nSYNC-MERGE OK" : "\n" + failures + " FALHA(S) EM SYNC-MERGE");
if (failures > 0) process.exitCode = 1;
