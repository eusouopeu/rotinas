import { describe, expect, it } from "vitest";
import { planoLembreteGasto } from "./lembreteGasto";

describe("lembrete de gastos", () => {
  it("pula o dia que já tem despesa e o horário que já passou", () => {
    const agora = new Date(2026, 9, 1, 10, 0); // 01/10 10h
    const plano = planoLembreteGasto(new Set(["2026-10-01", "2026-10-03"]), agora, 4);
    expect(plano.map((p) => p.iso)).toEqual(["2026-10-02", "2026-10-04"]);
    expect(new Date(plano[0].at).getHours()).toBe(21);
  });

  it("depois das 21h começa no dia seguinte", () => {
    const plano = planoLembreteGasto(new Set(), new Date(2026, 9, 1, 22, 0), 2);
    expect(plano.map((p) => p.iso)).toEqual(["2026-10-02"]);
  });
});
