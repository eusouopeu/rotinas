import { describe, expect, it } from "vitest";
import { criarEstadoGamificacaoInicial, inicioSemanaISO } from "./gamificacao";
import { congelarSemana, pontosPorExecucao } from "./scoring";
import type { Routine } from "./types";

const r: Routine = {
  id: "r1",
  name: "Manhã",
  tagValor: "medio",
  steps: [
    { id: "a", name: "Notícias", type: "timer", seconds: 600 },
    { id: "b", name: "Check", type: "checklist" },
  ],
  schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
};

describe("pontosPorExecucao (xp do cartão)", () => {
  it("é a soma dos pontos que as etapas da rotina valem num dia da agenda congelada", () => {
    const gam = congelarSemana([r], criarEstadoGamificacaoInicial(), inicioSemanaISO(new Date()));
    const doDia = gam.semanaAtual!.agendaCongelada.filter((a) => a.dia === 0).reduce((t, a) => t + a.pontos, 0);
    expect(doDia).toBeGreaterThan(0);
    expect(pontosPorExecucao(r, gam)).toBeCloseTo(doDia, 6);
  });

  it("peso 'nenhum' não rende xp", () => {
    const gam = congelarSemana([r], criarEstadoGamificacaoInicial(), inicioSemanaISO(new Date()));
    expect(pontosPorExecucao({ ...r, tagValor: "nenhum" }, gam)).toBe(0);
  });
});
