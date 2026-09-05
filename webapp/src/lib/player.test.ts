import { describe, expect, it } from "vitest";
import { computeExRestRemaining, computeRemaining, freshExState, novoPlayerState, parseRepsRange, playbackSteps } from "./player";
import type { Routine } from "./types";

const base: Routine = {
  id: "r1",
  name: "Teste",
  restSeconds: 30,
  steps: [
    { id: "s1", name: "A", type: "timer", seconds: 60 },
    { id: "s2", name: "B", type: "timer", seconds: 90 },
  ],
};

describe("playbackSteps", () => {
  it("insere descanso entre etapas quando restSeconds > 0", () => {
    const steps = playbackSteps(base);
    expect(steps.map((s) => s.name)).toEqual(["A", "Descanso", "B"]);
    expect(steps[1].isRest).toBe(true);
    expect(steps[1].seconds).toBe(30);
  });
  it("sem restSeconds não insere nada", () => {
    const steps = playbackSteps({ ...base, restSeconds: 0 });
    expect(steps).toHaveLength(2);
  });
  it("uma etapa só nunca ganha descanso", () => {
    const steps = playbackSteps({ ...base, steps: [base.steps[0]] });
    expect(steps).toHaveLength(1);
  });
});

describe("novoPlayerState / computeRemaining", () => {
  it("primeira etapa timer já tem stepEndTs no futuro", () => {
    const st = novoPlayerState({ ...base, restSeconds: 0 })!;
    expect(st.idx).toBe(0);
    expect(st.stepEndTs).toBeGreaterThan(Date.now());
    expect(computeRemaining(st)).toBeGreaterThan(55);
  });
  it("rotina sem etapas devolve null", () => {
    expect(novoPlayerState({ ...base, steps: [] })).toBeNull();
  });
  it("pausado usa pausedAt como referência (não avança)", () => {
    const st = novoPlayerState({ ...base, restSeconds: 0 })!;
    st.paused = true;
    st.pausedAt = st.stepStart + 5000;
    const rem = computeRemaining(st);
    expect(rem).toBe(55);
  });
  it("primeira etapa exercicio já vem com estado de série zerado", () => {
    const routine: Routine = { ...base, steps: [{ id: "e1", name: "Supino", type: "exercicio", exercicioId: "ex1", sets: 3, reps: "10" }] };
    const st = novoPlayerState(routine)!;
    expect(st.ex).toEqual({ setIdx: 0, phase: "set", results: [], restEndTs: null });
    expect(st.stepEndTs).toBeNull();
  });
});

describe("parseRepsRange", () => {
  it("faixa 'min-max'", () => {
    expect(parseRepsRange("8-12")).toEqual({ min: 8, max: 12 });
  });
  it("número solto", () => {
    expect(parseRepsRange("10")).toEqual({ min: 10, max: 10 });
  });
  it("texto inválido ou vazio vira zero", () => {
    expect(parseRepsRange("")).toEqual({ min: 0, max: 0 });
    expect(parseRepsRange(undefined)).toEqual({ min: 0, max: 0 });
    expect(parseRepsRange("falha")).toEqual({ min: 0, max: 0 });
  });
});

describe("freshExState", () => {
  it("começa na série 1, fase 'set', sem resultados", () => {
    expect(freshExState()).toEqual({ setIdx: 0, phase: "set", results: [], restEndTs: null });
  });
});

describe("computeExRestRemaining", () => {
  const routine: Routine = { ...base, steps: [{ id: "e1", name: "Supino", type: "exercicio", exercicioId: "ex1", sets: 3, reps: "10" }] };
  it("zero fora da fase de descanso", () => {
    const st = novoPlayerState(routine)!;
    expect(computeExRestRemaining(st)).toBe(0);
  });
  it("conta regressivo até restEndTs na fase de descanso", () => {
    const st = novoPlayerState(routine)!;
    st.ex = { setIdx: 1, phase: "rest", results: [{ reps: 10, peso: 20 }], restEndTs: Date.now() + 60000 };
    expect(computeExRestRemaining(st)).toBeGreaterThan(55);
  });
  it("pausado usa pausedAt como referência", () => {
    const st = novoPlayerState(routine)!;
    const restEndTs = Date.now() + 60000;
    st.ex = { setIdx: 1, phase: "rest", results: [{ reps: 10, peso: 20 }], restEndTs };
    st.paused = true;
    st.pausedAt = restEndTs - 10000;
    expect(computeExRestRemaining(st)).toBe(10);
  });
});
