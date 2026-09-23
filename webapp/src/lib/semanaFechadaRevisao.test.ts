import { describe, expect, it } from "vitest";
import { metasProximasSemana, notaRevisaoSemana, rotinasAtrasadasSemana } from "./semanaFechada";
import { addDaysISO, localKey } from "./gamificacao";
import type { HistoryEntry } from "./history";
import type { Routine } from "./types";

function rotina(id: string, days: number[]): Routine {
  return {
    id,
    name: "Rotina " + id,
    steps: [{ id: "s", name: "Etapa", type: "timer", seconds: 600 }],
    schedule: { enabled: true, anchor: "start", time: "07:00", days },
  };
}

function exec(id: string, date: string): HistoryEntry {
  return {
    date,
    ts: 0,
    startedTs: 0,
    routineId: id,
    routineName: "Rotina " + id,
    plannedSec: 600,
    actualSec: 600,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [],
  };
}

describe("rotinasAtrasadasSemana", () => {
  const inicio = "2026-09-07"; // segunda-feira

  it("lista só as rotinas com menos execuções que o planejado, maior falta primeiro", () => {
    const routines = [rotina("a", [1, 3, 5]), rotina("b", [2]), rotina("c", [1, 2, 3, 4, 5])];
    const history = [exec("a", "2026-09-07"), exec("b", "2026-09-08"), exec("c", "2026-09-07")];
    const r = rotinasAtrasadasSemana(inicio, routines, history, []);
    expect(r.map((x) => [x.id, x.feitas, x.planejadas])).toEqual([
      ["c", 1, 5],
      ["a", 1, 3],
    ]);
  });
});

describe("metasProximasSemana", () => {
  it("devolve metas abertas que vencem em até 14 dias, por data", () => {
    const hoje = localKey();
    const templates = [
      {
        type: "countdown",
        targets: [
          { id: "1", title: "Longe", date: addDaysISO(hoje, 40), createdAt: 0, topics: 5, done: 0 },
          { id: "2", title: "Perto", date: addDaysISO(hoje, 3), createdAt: 0, topics: 5, done: 1 },
          { id: "3", title: "Feita", date: addDaysISO(hoje, 2), createdAt: 0, topics: 5, done: 5 },
          { id: "4", title: "Amanhã", date: addDaysISO(hoje, 1), createdAt: 0 },
        ],
      },
      { type: "note" },
    ];
    expect(metasProximasSemana(templates).map((t) => t.title)).toEqual(["Amanhã", "Perto"]);
  });
});

describe("notaRevisaoSemana", () => {
  it("monta seções só com o que foi preenchido", () => {
    expect(notaRevisaoSemana({ reflexao: " dormi cedo ", ajustes: ["Rotina a: seg → ter"], foco: "" })).toBe(
      "## O que levo da semana\ndormi cedo\n\n## Ajustes nas rotinas\n- Rotina a: seg → ter"
    );
    expect(notaRevisaoSemana({ reflexao: "", ajustes: [], foco: "" })).toBe("");
  });
});
