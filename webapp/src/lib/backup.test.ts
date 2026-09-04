import { describe, expect, it } from "vitest";
import {
  ehModeloShare,
  ehRotinaShare,
  mergeById,
  mergeDiario,
  mergeHistory,
  modeloShareData,
  pareceBackup,
  prepararModeloImportado,
  prepararRotinaImportada,
  rotinaShareData,
  sanitizeBackup,
} from "./backup";
import type { CountdownDoc, MatrixDoc, Routine } from "./types";

describe("pareceBackup", () => {
  it("aceita objeto com pelo menos uma coleção em array", () => {
    expect(pareceBackup({ routines: [] })).toBe(true);
  });
  it("rejeita null, string ou objeto sem nenhuma coleção conhecida", () => {
    expect(pareceBackup(null)).toBe(false);
    expect(pareceBackup("texto")).toBe(false);
    expect(pareceBackup({ foo: "bar" })).toBe(false);
  });
});

describe("sanitizeBackup", () => {
  it("descarta itens que não são objeto", () => {
    const out = sanitizeBackup({ routines: [{ id: "1" }, "lixo", null, 42] as never });
    expect(out.routines).toEqual([{ id: "1" }]);
  });
});

describe("mergeById", () => {
  it("mantém o item local quando o id já existe", () => {
    const current = [{ id: "1", name: "local" }];
    const incoming = [{ id: "1", name: "remoto" }, { id: "2", name: "novo" }];
    expect(mergeById(current, incoming)).toEqual([
      { id: "1", name: "local" },
      { id: "2", name: "novo" },
    ]);
  });
  it("sem incoming, devolve current sem alterar", () => {
    const current = [{ id: "1", name: "local" }];
    expect(mergeById(current, undefined)).toBe(current);
  });
});

describe("mergeHistory", () => {
  it("dedupe por ts", () => {
    const current = [{ ts: 100 } as never];
    const incoming = [{ ts: 100 } as never, { ts: 200 } as never];
    expect(mergeHistory(current, incoming)).toHaveLength(2);
  });
});

describe("mergeDiario", () => {
  it("período já escrito no destino não é sobrescrito", () => {
    const current = { "dia:2026-01-01": "local" };
    const incoming = { "dia:2026-01-01": "remoto", "dia:2026-01-02": "novo" };
    expect(mergeDiario(current, incoming)).toEqual({
      "dia:2026-01-01": "local",
      "dia:2026-01-02": "novo",
    });
  });
});

describe("import de item avulso", () => {
  const routine: Routine = {
    id: "r1",
    name: "Manhã",
    steps: [
      { id: "s1", name: "Alongar", type: "timer", seconds: 60 },
      { id: "s2", name: "Sub-rotina", type: "routine", noteId: "n1" },
    ],
    schedule: { enabled: true, anchor: "start", time: "07:00", days: [1] },
  };

  it("ehRotinaShare/ehModeloShare detectam o type e a chave esperados", () => {
    expect(ehRotinaShare({ type: "rotina-share", routine })).toBe(true);
    expect(ehRotinaShare({ type: "rotina-share" })).toBe(false);
    expect(ehModeloShare({ type: "modelo-share", doc: { id: "d1", type: "kanban" } })).toBe(true);
    expect(ehRotinaShare({ type: "modelo-share", doc: {} })).toBe(false);
  });

  it("prepararRotinaImportada troca ids, desativa agendamento, converte sub-rotina e sufixa nome duplicado", () => {
    const r = prepararRotinaImportada(routine, [{ ...routine }], () => "novo-id");
    expect(r.id).toBe("novo-id");
    expect(r.name).toBe("Manhã (importada)");
    expect(r.schedule!.enabled).toBe(false);
    expect(r.steps.every((s) => s.id === "novo-id")).toBe(true);
    expect(r.steps[1].type).toBe("checklist");
    expect(r.steps[1].noteId).toBeUndefined();
  });

  it("prepararModeloImportado troca id e sufixa título duplicado do mesmo tipo", () => {
    const doc = { id: "d1", type: "kanban", title: "Projeto", cols: [], createdAt: 0, updatedAt: 0 } as unknown as MatrixDoc;
    const existente = { ...doc } as unknown as MatrixDoc;
    const d = prepararModeloImportado(doc, [existente], () => "novo-id");
    expect(d.id).toBe("novo-id");
    expect((d as { title: string }).title).toBe("Projeto (importado)");
  });
});

describe("export de item avulso", () => {
  const routine: Routine = {
    id: "r1",
    name: "Treino",
    steps: [{ id: "s1", name: "Aquecer", type: "timer", seconds: 120 }],
    schedule: { enabled: true, anchor: "start", time: "06:30", days: [0, 2, 4] },
  };

  const doc = {
    id: "m1",
    type: "kanban",
    title: "Trabalho",
    cols: [{ title: "A fazer", items: [{ id: "c1", text: "Tarefa 1" }] }],
    createdAt: 123456789,
    updatedAt: 123456789,
  } as unknown as MatrixDoc;

  it("rotinaShareData gera payload com type, version e schedule.enabled forçado a false", () => {
    const payload = rotinaShareData(routine);
    expect(payload).toEqual({
      type: "rotina-share",
      version: 1,
      routine: {
        ...routine,
        schedule: { ...routine.schedule!, enabled: false },
      },
    });
    // Não deve mutar a rotina original
    expect(routine.schedule!.enabled).toBe(true);
  });

  it("rotinaShareData funciona sem schedule", () => {
    const semSched: Routine = { id: "r2", name: "Livre", steps: [] };
    const payload = rotinaShareData(semSched);
    expect(payload.type).toBe("rotina-share");
    expect(payload.version).toBe(1);
    expect(payload.routine.schedule).toBeUndefined();
  });

  it("modeloShareData gera payload com type, version e clone exato do doc", () => {
    const payload = modeloShareData(doc);
    expect(payload).toEqual({
      type: "modelo-share",
      version: 1,
      doc,
    });
    expect(payload.doc).not.toBe(doc);
  });

  it("roundtrip rotina: rotinaShareData -> ehRotinaShare -> prepararRotinaImportada", () => {
    const payload = rotinaShareData(routine);
    expect(ehRotinaShare(payload)).toBe(true);
    if (!ehRotinaShare(payload)) return;

    const importada = prepararRotinaImportada(payload.routine, [routine], () => "id-importada");
    expect(importada.id).toBe("id-importada");
    expect(importada.name).toBe("Treino (importada)");
    expect(importada.schedule!.enabled).toBe(false);
    expect(importada.steps[0].id).toBe("id-importada");
  });

  it("roundtrip modelo: modeloShareData -> ehModeloShare -> prepararModeloImportado", () => {
    const payload = modeloShareData(doc);
    expect(ehModeloShare(payload)).toBe(true);
    if (!ehModeloShare(payload)) return;

    const importado = prepararModeloImportado(payload.doc, [doc], () => "id-importado");
    expect(importado.id).toBe("id-importado");
    expect((importado as { title: string }).title).toBe("Trabalho (importado)");
  });
});

describe("backup e import de metas recorrentes no CountdownDoc", () => {
  it("preserva recorrentes e targets no sanitizeBackup e mergeById", () => {
    const docComRec: CountdownDoc = {
      id: "cd1",
      type: "countdown",
      title: "Metas",
      targets: [{ id: "t1", title: "Prova", date: "2026-12-31", createdAt: 1000 }],
      recorrentes: [
        {
          id: "r1",
          titulo: "Beber água",
          tipo: "diaria",
          vezes: 4,
          criadoEm: 1000,
          negativa: false,
          pontua: true,
          tagValor: "medio",
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const sanitized = sanitizeBackup({ templates: [docComRec] });
    expect((sanitized.templates as CountdownDoc[])[0].recorrentes).toHaveLength(1);
    expect((sanitized.templates as CountdownDoc[])[0].targets).toHaveLength(1);

    // Documento legado (só targets, sem recorrentes)
    const docLegado: CountdownDoc = {
      id: "cd2",
      type: "countdown",
      title: "Metas Antigas",
      targets: [{ id: "t2", title: "Certificação", date: "2026-10-15", createdAt: 2000 }],
      createdAt: 2000,
      updatedAt: 2000,
    };

    const merged = mergeById([docComRec], [docLegado]);
    expect(merged).toHaveLength(2);
    expect((merged[0] as CountdownDoc).recorrentes).toHaveLength(1);
    expect((merged[1] as CountdownDoc).recorrentes).toBeUndefined();
    expect((merged[1] as CountdownDoc).targets).toHaveLength(1);
  });
});


