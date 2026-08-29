import { describe, expect, it } from "vitest";
import { computeRemaining, novoPlayerState, playbackSteps } from "./player";
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
});
