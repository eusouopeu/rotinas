import { describe, expect, it } from "vitest";
import { metasProximasSemana, metasRecSemana, notaRevisaoSemana, rotinasAtrasadasSemana } from "./semanaFechada";
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

describe("metasRecSemana", () => {
  const agora = new Date(2026, 8, 23, 10); // qua 23/09; semana anterior dom 13 – sáb 19
  const doc = {
    type: "countdown",
    recorrentes: [
      {
        id: "a",
        titulo: "Água",
        tipo: "diaria",
        vezes: 1,
        criadoEm: 0,
        sequencia: 0,
        progresso: { periodo: "dia:2026-09-23", feitas: 0 },
        historico: ["13", "14", "15", "16", "17", "18", "19"].map((d, i) => ({
          periodo: "dia:2026-09-" + d,
          feitas: i === 2 ? 0 : 1,
        })),
      },
      {
        id: "t",
        titulo: "Treinar",
        tipo: "semanal",
        vezes: 3,
        criadoEm: 0,
        progresso: { periodo: "semana:2026-09-20", feitas: 0 },
        historico: [{ periodo: "semana:2026-09-13", feitas: 3 }],
      },
      {
        id: "n",
        titulo: "Nova",
        tipo: "diaria",
        vezes: 1,
        criadoEm: 0,
        progresso: { periodo: "dia:2026-09-23", feitas: 0 },
      },
    ],
  };

  it("resume cada meta com período na semana e ignora a que não tinha", () => {
    const r = metasRecSemana("2026-09-13", [doc], agora);
    expect(r.map((x) => [x.titulo, x.resumo, x.ok])).toEqual([
      ["Água", "6 de 7 dias", false],
      ["Treinar", "3 de 3", true],
    ]);
    expect(r[1].unidade).toBe("semana");
  });
});
