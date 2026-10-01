import { describe, expect, it } from "vitest";
import { energiaDoDia, energiaXCumprimento } from "./energia";

describe("energia do dia", () => {
  it("lê só valores de 1 a 5", () => {
    const d = { "energia:2026-10-01": "4", "energia:2026-10-02": "9", "dia:2026-10-01": "texto" };
    expect(energiaDoDia(d, "2026-10-01")).toBe(4);
    expect(energiaDoDia(d, "2026-10-02")).toBeNull();
    expect(energiaDoDia(d, "2026-10-03")).toBeNull();
  });

  it("agrupa o cumprimento por faixa de energia", () => {
    const diario = { "energia:2026-10-01": "1", "energia:2026-10-02": "5", "energia:2026-10-03": "4" };
    const f = energiaXCumprimento(diario, [
      { key: "2026-10-01", feitas: 1, faltas: 3 },
      { key: "2026-10-02", feitas: 2, faltas: 0 },
      { key: "2026-10-03", feitas: 1, faltas: 1 },
      { key: "2026-10-04", feitas: 5, faltas: 0 },
    ]);
    expect(f[0]).toEqual({ rotulo: "baixa (1–2)", dias: 1, taxa: 25 });
    expect(f[1]).toEqual({ rotulo: "média (3)", dias: 0, taxa: null });
    expect(f[2]).toEqual({ rotulo: "alta (4–5)", dias: 2, taxa: 75 });
  });
});
