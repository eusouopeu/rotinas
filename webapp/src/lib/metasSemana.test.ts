import { describe, expect, it } from "vitest";
import { computeGridDragTarget } from "./dnd";
import { ajustarProgressoMetaRec, semanaDaMeta, sequenciaMetaPrazo } from "./metas";
import type { MetaRecorrente } from "./types";

describe("semanaDaMeta (bolinhas do cartão)", () => {
  it("marca feito, feito fora do previsto, perdido e previsto", () => {
    // quarta, 07/10/2026; semana começando no domingo (padrão)
    const hoje = new Date(2026, 9, 7, 12);
    const feitos: Record<string, number> = { "2026-10-05": 1, "2026-10-06": 2 };
    const dias = semanaDaMeta([1, 3, 5], (iso) => feitos[iso] || 0, hoje);
    expect(dias).toHaveLength(7);
    const por = Object.fromEntries(dias.map((d) => [d.dow, d.estado]));
    expect(por[1]).toBe("feitoPrevisto"); // seg previsto e feito
    expect(por[2]).toBe("feito"); // ter fora do previsto
    expect(por[3]).toBe("previsto"); // qua = hoje, ainda não perdido
    expect(por[0]).toBe("livre");
    expect(semanaDaMeta([0], () => 0, hoje).find((d) => d.dow === 0)!.estado).toBe("perdido");
  });
});

describe("sequenciaMetaPrazo", () => {
  it("conta dias corridos desde o primeiro registro e quebra em previsto vazio", () => {
    const prog = { "2026-10-07": 3, "2026-10-05": 1, "2026-10-04": 2 };
    // todo dia previsto: 06 vazio quebra → só hoje
    expect(sequenciaMetaPrazo({ progressoDias: prog }, "2026-10-07")).toEqual({ dias: 1, execucoes: 1 });
    // só seg/qua previstos: ter (06) em branco não quebra; dom (04) também não é previsto
    const r = sequenciaMetaPrazo({ progressoDias: prog, dias: [1, 3] }, "2026-10-07");
    expect(r.execucoes).toBeGreaterThanOrEqual(3);
    expect(r.dias).toBeGreaterThanOrEqual(4);
  });
});

describe("ajustarProgressoMetaRec registra o dia", () => {
  it("guarda o +1 em progressoDias", () => {
    const rec: MetaRecorrente = { id: "m", titulo: "x", tipo: "semanal", vezes: 5, criadoEm: 0 };
    const data = new Date(2026, 9, 7, 12);
    const { rec: r1 } = ajustarProgressoMetaRec(rec, 1, data);
    expect(r1.progressoDias).toEqual({ "2026-10-07": 1 });
  });
});

describe("computeGridDragTarget", () => {
  it("escolhe o cartão de centro mais próximo em 2 colunas", () => {
    const r = (left: number, top: number) => ({ left, top, width: 100, height: 100 }) as DOMRect;
    const rects = [r(0, 0), r(110, 0), r(0, 110), r(110, 110)];
    expect(computeGridDragTarget(rects, 0, 160, 160)).toBe(3);
    expect(computeGridDragTarget(rects, 3, 40, 50)).toBe(0);
  });
});
