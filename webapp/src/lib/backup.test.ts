import { describe, expect, it } from "vitest";
import { mergeById, mergeDiario, mergeHistory, pareceBackup, sanitizeBackup } from "./backup";

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
