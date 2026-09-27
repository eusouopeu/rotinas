import { describe, expect, it } from "vitest";
import {
  duracaoSerieEstimada,
  EXERCICIO_SET_SEG,
  routineDurationRaw,
  estimadorSerie,
  estimadorEtapaTempo,
} from "./routines";
import { segundosRestantesEstimados, type PlayerState } from "./player";
import { sugestaoCarga } from "./exercicios";
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
    // sem estimador: a inicial fixa (não há mais padrão global)
    expect(routineDurationRaw(r)).toBe(4 * EXERCICIO_SET_SEG);
    // memo pela referência do histórico
    expect(estimadorSerie(h)).toBe(estimadorSerie(h));
    expect(estimadorSerie([...h])).not.toBe(estimadorSerie(h));
  });
});

describe("sugestaoCarga", () => {
  const comSeries = (ts: number, series: Array<{ reps: number; peso: number }>) => {
    const e = exec(ts, 300, series.length);
    e.steps[0].series = series;
    return e;
  };

  it("todas as séries no topo da faixa sobem um incremento", () => {
    const h = [comSeries(1, [{ reps: 8, peso: 20 }]), comSeries(2, Array(3).fill({ reps: 12, peso: 20 }))];
    const s = sugestaoCarga(null, "ex1", { min: 8, max: 12 }, h);
    expect(s?.ultima).toBe("3×12 · 20 kg");
    expect(s?.peso).toBe(22.5);
    expect(sugestaoCarga({ id: "ex1", nome: "x", composto: false } as never, "ex1", { min: 8, max: 12 }, h)?.peso).toBe(
      21
    );
  });

  it("série abaixo do mínimo mantém a carga; sem histórico não sugere", () => {
    const h = [
      comSeries(1, [
        { reps: 12, peso: 20 },
        { reps: 6, peso: 20 },
      ]),
    ];
    expect(sugestaoCarga(null, "ex1", { min: 8, max: 12 }, h)?.peso).toBeNull();
    expect(sugestaoCarga(null, "ex1", { min: 8, max: 12 }, [])).toBeNull();
  });
});

describe("estimadorEtapaTempo / previsão com etapas de tempo", () => {
  const entrada = (ts: number, actual: number, skipped = false): HistoryEntry => ({
    ...exec(ts, 0, 0),
    steps: [{ id: "t1", name: "Meditar", tag: "medio", isRest: false, planned: 600, actual, skipped }],
  });

  it("planejado até três execuções; depois a média do real, sem as puladas", () => {
    const step = { id: "t1", name: "Meditar", type: "timer" as const, seconds: 600 };
    expect(estimadorEtapaTempo([entrada(1, 700), entrada(2, 800)], "r1")(step)).toBe(600);
    const h = [entrada(1, 700), entrada(2, 800), entrada(3, 0, true), entrada(4, 900)];
    expect(estimadorEtapaTempo(h, "r1")(step)).toBe(800);
    expect(estimadorEtapaTempo(h, "outra")(step)).toBe(600);

    const agora = 1_000_000;
    const p = {
      steps: [step, { ...step, id: "t2", seconds: 60 }],
      idx: 0,
      paused: false,
      pausedAt: null,
      stepStart: agora - 300_000, // 5 min decorridos
      stepEndTs: agora + 300_000,
      ex: null,
    } as unknown as PlayerState;
    // aprendido 800 - 300 decorridos + 60 da próxima (sem histórico = planejado)
    expect(segundosRestantesEstimados(p, () => 75, agora, estimadorEtapaTempo(h, "r1"))).toBe(560);
    expect(segundosRestantesEstimados(p, () => 75, agora)).toBe(360);
  });
});
