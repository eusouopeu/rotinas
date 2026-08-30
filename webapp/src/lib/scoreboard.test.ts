import { describe, expect, it } from "vitest";
import { sbLideres, sbNome, sbTotais } from "./scoreboard";
import type { ScoreboardDoc } from "./types";

function doc(partial: Partial<ScoreboardDoc>): ScoreboardDoc {
  return {
    id: "d1",
    type: "scoreboard",
    title: "Jogo",
    players: [],
    rounds: [],
    higherWins: true,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe("sbTotais", () => {
  it("soma só os turnos jogados, célula vazia não conta", () => {
    const d = doc({
      players: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      rounds: [{ id: "r1", scores: { a: 5, b: 3 } }, { id: "r2", scores: { a: 2 } }],
    });
    expect(sbTotais(d)).toEqual({ a: 7, b: 3 });
  });
});

describe("sbLideres", () => {
  it("maior vence por padrão", () => {
    const d = doc({
      players: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      rounds: [{ id: "r1", scores: { a: 5, b: 3 } }],
    });
    expect(sbLideres(d)).toEqual(["a"]);
  });

  it("menor vence quando higherWins é false", () => {
    const d = doc({
      higherWins: false,
      players: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      rounds: [{ id: "r1", scores: { a: 5, b: 3 } }],
    });
    expect(sbLideres(d)).toEqual(["b"]);
  });

  it("empate devolve todos os líderes", () => {
    const d = doc({
      players: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      rounds: [{ id: "r1", scores: { a: 5, b: 5 } }],
    });
    expect(sbLideres(d)).toEqual(["a", "b"]);
  });

  it("sem turnos ainda não há líder", () => {
    const d = doc({ players: [{ id: "a", name: "A" }] });
    expect(sbLideres(d)).toEqual([]);
  });
});

describe("sbNome", () => {
  it("usa o nome quando preenchido", () => {
    expect(sbNome({ name: "Ana" }, 0)).toBe("Ana");
  });
  it("cai em 'Jogador N' quando vazio", () => {
    expect(sbNome({ name: "  " }, 2)).toBe("Jogador 3");
  });
});
