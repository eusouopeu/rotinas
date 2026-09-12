// Descanso entre séries por tipo de exercício (12/09/2026).
import { describe, expect, it } from "vitest";
import { descansoEntreSeries } from "./exercicios";
import { totalPlanejadoSegundos } from "./scoring";
import type { Exercicio, Routine } from "./types";

const composto: Exercicio = { id: "c", nome: "Agachamento", grupos: [], pesoAtual: 0, composto: true };
const isolado: Exercicio = { id: "i", nome: "Rosca direta", grupos: [], pesoAtual: 0, composto: false };
const antigo: Exercicio = { id: "a", nome: "Sem classificação", grupos: [], pesoAtual: 0 };

describe("descansoEntreSeries", () => {
  it("composto usa o descanso cheio e isolado 0,75x dele", () => {
    expect(descansoEntreSeries(120, composto)).toBe(120);
    expect(descansoEntreSeries(120, isolado)).toBe(90);
  });

  it("exercício sem classificação conta como composto (comportamento anterior)", () => {
    expect(descansoEntreSeries(120, antigo)).toBe(120);
    expect(descansoEntreSeries(120, undefined)).toBe(120);
  });
});

describe("totalPlanejadoSegundos", () => {
  it("usa o descanso de cada exercício ao somar a duração planejada", () => {
    const routine = {
      id: "r",
      name: "treino",
      steps: [
        { id: "s1", name: "agacho", type: "exercicio", sets: 2, exercicioId: "c" },
        { id: "s2", name: "rosca", type: "exercicio", sets: 2, exercicioId: "i" },
      ],
      restSeconds: 120,
    } as unknown as Routine;
    // playbackSteps ainda intercala UM descanso entre as duas etapas (120s);
    // o que muda aqui é só o descanso ENTRE SÉRIES de cada exercício
    expect(totalPlanejadoSegundos(routine, [composto, isolado])).toBe(120 + 2 * 120 + 2 * 90);
    // sem a biblioteca, tudo conta como composto
    expect(totalPlanejadoSegundos(routine)).toBe(120 + 4 * 120);
  });
});
