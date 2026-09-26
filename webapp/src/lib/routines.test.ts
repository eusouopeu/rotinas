import { describe, expect, it } from "vitest";
import { duracaoSerieEstimada, EXERCICIO_SET_SEG, routineDurationRaw, estimadorSerie } from "./routines";
import type { HistoryEntry } from "./history";
import type { Routine } from "./types";

function exec(ts: number, elapsedSec: number, series: number): HistoryEntry {
  return {
    date: "2026-09-01",
    ts,
    startedTs: ts,
    routineId: "r1",
    routineName: "Treino",
    plannedSec: 0,
    actualSec: 0,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [
      {
        id: "s1",
        name: "Supino",
        tag: "medio",
        isRest: false,
        planned: 0,
        actual: 0,
        skipped: false,
        exercicioId: "ex1",
        elapsedSec,
        series: Array.from({ length: series }, () => ({ reps: 10, peso: 20 })),
      },
    ],
  };
}

describe("duracaoSerieEstimada", () => {
  const step = { id: "s1", exercicioId: "ex1" };

  it("usa a estimativa inicial até ter três execuções medidas", () => {
    expect(duracaoSerieEstimada(step, [])).toBe(EXERCICIO_SET_SEG);
    expect(duracaoSerieEstimada(step, [exec(1, 300, 3), exec(2, 300, 3)])).toBe(EXERCICIO_SET_SEG);
  });

  it("média das três execuções mais recentes (tempo / séries)", () => {
    const h = [exec(1, 999, 1), exec(2, 300, 3), exec(3, 240, 3), exec(4, 360, 3)];
    expect(duracaoSerieEstimada(step, h)).toBe(100);
    const r: Routine = {
      id: "r1",
      name: "Treino",
      steps: [{ id: "s1", name: "Supino", type: "exercicio", exercicioId: "ex1", sets: 4 }],
    };
    expect(routineDurationRaw(r, estimadorSerie(h))).toBe(400);
  });
});
