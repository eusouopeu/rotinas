import { describe, expect, it } from "vitest";
import { ehModeloShare, ehRotinaShare, mergeById, mergeDiario, mergeHistory, pareceBackup, prepararModeloImportado, prepararRotinaImportada, sanitizeBackup } from "./backup";
import type { MatrixDoc, Routine } from "./types";

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
