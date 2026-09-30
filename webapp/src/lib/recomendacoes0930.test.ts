// Testes das recomendações de 30/09/2026: arquivar rotina, despesas
// recorrentes, Mês fechado e primeira abertura guiada.
import { describe, expect, it } from "vitest";
import { deveMostrarBoasVindas } from "./boasVindas";
import { lancamentosRecorrentes } from "./expense";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import { mesFechadoPendente, resumoMes } from "./mesFechado";
import { FIM_ARQUIVO, rotinaPausadaEm } from "./schedule";
import type { ExpenseDoc, Routine } from "./types";

const despesa = (p: Partial<ExpenseDoc>): ExpenseDoc => ({
  id: "d1",
  type: "expense",
  desc: "Aluguel",
  value: 1000,
  cat: "Casa",
  date: "2026-01-31",
  createdAt: 0,
  updatedAt: 0,
  ...p,
});

describe("rotina arquivada", () => {
  it("fica pausada de hoje em diante e não antes", () => {
    const r = { id: "r", name: "x", steps: [], arquivada: true, pausas: [{ de: "2026-09-30", ate: FIM_ARQUIVO }] } as Routine;
    expect(rotinaPausadaEm(r, new Date(2026, 8, 29))).toBe(false);
    expect(rotinaPausadaEm(r, new Date(2031, 0, 1))).toBe(true);
  });
});

describe("lancamentosRecorrentes", () => {
  it("lança um por mês até hoje, no mesmo dia limitado ao fim do mês", () => {
    const { novos, ultimos } = lancamentosRecorrentes([despesa({ recorrente: true })], "2026-04-15", 5);
    expect(novos.map((n) => [n.id, n.date])).toEqual([
      ["d1:2026-02", "2026-02-28"],
      ["d1:2026-03", "2026-03-31"],
    ]);
    expect(novos[0]).toMatchObject({ origemRec: "d1", value: 1000, createdAt: 5 });
    expect(ultimos).toEqual({ d1: "2026-03" });
  });
  it("não relança o que já passou do recUltimo nem despesa não recorrente", () => {
    const docs = [despesa({ recorrente: true, recUltimo: "2026-03" }), despesa({ id: "d2" })];
    expect(lancamentosRecorrentes(docs, "2026-04-15").novos).toEqual([]);
    expect(lancamentosRecorrentes(docs, "2026-04-30").novos.map((n) => n.id)).toEqual(["d1:2026-04"]);
  });
});

describe("Mês fechado", () => {
  it("pendente só para o mês passado ainda não visto", () => {
    const gam = criarEstadoGamificacaoInicial();
    gam.historico.meses = [{ anoMes: "2026-08", nota: 72, badge: null, bonusMetas: 0 }];
    expect(mesFechadoPendente(gam, "2026-09-02")?.anoMes).toBe("2026-08");
    expect(mesFechadoPendente(gam, "2026-10-02")).toBeNull();
    expect(mesFechadoPendente({ ...gam, ultimoMesVisto: "2026-08" }, "2026-09-02")).toBeNull();
  });
  it("resume semanas, rotinas mais feitas, gastos e diferença para o mês anterior", () => {
    const gam = criarEstadoGamificacaoInicial();
    gam.historico.meses = [
      { anoMes: "2026-07", nota: 60, badge: null, bonusMetas: 0 },
      { anoMes: "2026-08", nota: 72, badge: null, bonusMetas: 0 },
    ];
    gam.historico.semanas = [
      { inicioISO: "2026-07-26", nota: 70, badge: null }, // termina em 01/08: conta em agosto
      { inicioISO: "2026-08-30", nota: 80, badge: null }, // termina em setembro
    ];
    const h = (routineId: string, date: string) => ({ routineId, routineName: routineId, date }) as never;
    const r = resumoMes(gam.historico.meses[1], gam, [h("a", "2026-08-02"), h("a", "2026-08-03"), h("b", "2026-08-04"), h("a", "2026-09-01")], [
      despesa({ date: "2026-08-10", value: 50 }),
      despesa({ id: "d2", date: "2026-09-10" }),
    ]);
    expect(r.semanas.map((s) => s.inicioISO)).toEqual(["2026-07-26"]);
    expect(r.execucoes).toBe(3);
    expect(r.topRotinas).toEqual([
      { nome: "a", vezes: 2 },
      { nome: "b", vezes: 1 },
    ]);
    expect(r.gastos).toBe(50);
    expect(r.delta).toBe(12);
  });
});

describe("deveMostrarBoasVindas", () => {
  it("só num app vazio e ainda não visto", () => {
    const gam = criarEstadoGamificacaoInicial();
    const vazio = { routines: [], notes: [], history: [], gam, visto: false };
    expect(deveMostrarBoasVindas(vazio)).toBe(true);
    expect(deveMostrarBoasVindas({ ...vazio, visto: true })).toBe(false);
    expect(deveMostrarBoasVindas({ ...vazio, routines: [{ id: "r" } as Routine] })).toBe(false);
  });
});
