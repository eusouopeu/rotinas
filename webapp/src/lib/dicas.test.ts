import { describe, expect, it } from "vitest";
import { gerarDicas } from "./stats";
import { localKey } from "./gamificacao";
import type { HistoryEntry } from "./history";
import type { MetaTarget, Routine } from "./types";

const hoje = new Date(2026, 8, 14, 12); // segunda-feira

function rotina(days: number[]): Routine {
  return {
    id: "r1",
    name: "Academia",
    steps: [{ id: "s1", name: "Treino", type: "timer", seconds: 1800 }],
    schedule: { enabled: true, anchor: "start", time: "07:00", days },
  };
}

function exec(d: Date, over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    date: localKey(d),
    ts: d.getTime(),
    startedTs: d.getTime(),
    routineId: "r1",
    routineName: "Academia",
    plannedSec: 1800,
    actualSec: 1800,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [],
    ...over,
  };
}

describe("gerarDicas", () => {
  it("aponta o dia da semana em que a rotina falha bem mais que nos outros", () => {
    const history: HistoryEntry[] = [];
    // últimas 8 semanas: faz toda quarta, nunca faz segunda
    for (let k = 1; k <= 56; k++) {
      const d = new Date(2026, 8, 14 - k, 12);
      if (d.getDay() === 3) history.push(exec(d));
    }
    const dicas = gerarDicas([rotina([1, 3])], history, [], [], hoje);
    expect(dicas).toHaveLength(1);
    expect(dicas[0]).toContain("<b>Academia</b> falha em 100% das segundas");
  });

  it("não aponta dia quando a falta é igual em todos os dias", () => {
    const dicas = gerarDicas([rotina([1, 3])], [], [], [], hoje);
    expect(dicas.some((d) => d.includes("falha"))).toBe(false);
  });

  it("aponta o período do dia em que a rotina sai mais completa", () => {
    const history: HistoryEntry[] = [];
    for (let k = 1; k <= 3; k++) {
      history.push(exec(new Date(2026, 8, 14 - k, 8), { skippedCount: 0 }));
      history.push(exec(new Date(2026, 8, 14 - k, 21), { skippedCount: 3 }));
    }
    const dicas = gerarDicas([], history, [], [], hoje);
    expect(dicas[0]).toContain("rende mais de manhã: em média 3 etapas puladas a menos que à noite");
  });

  it("aponta meta parada e meta atrás do ritmo", () => {
    const dia = 86400000;
    const metas: MetaTarget[] = [
      { id: "m1", title: "Ler 12 livros", date: "2026-12-31", createdAt: hoje.getTime() - 30 * dia, topics: 12, done: 0 },
      { id: "m2", title: "Curso", date: "2026-09-24", createdAt: hoje.getTime() - 90 * dia, topics: 10, done: 2 },
    ];
    const dicas = gerarDicas([], [], [], metas, hoje);
    expect(dicas).toContain("A meta <b>Ler 12 livros</b> não andou desde que foi criada, há 30 dias.");
    expect(dicas.some((d) => d.startsWith("<b>Curso</b> está atrás do ritmo: 20% feito"))).toBe(true);
  });
});
