import type { Routine } from "./types";

// index.html:1086 — estimativa fixa de tempo de UMA série de exercício.
export const EXERCICIO_SET_SEG = 60;

/**
 * Versão simplificada de routineDuration (index.html:1087+): soma os passos
 * como estão salvos, sem passar por playbackSteps (que expande descansos
 * automáticos entre etapas — ainda não portado). Suficiente para o card da
 * lista mostrar uma duração aproximada; não é a duração exata de execução.
 */
export function routineDurationRaw(r: Routine, exercicioSetSeg = EXERCICIO_SET_SEG): number {
  return r.steps.reduce((acc, s) => {
    if (s.type === "timer") return acc + (s.seconds || 0);
    if (s.type === "exercicio") return acc + (s.sets || 1) * exercicioSetSeg;
    return acc;
  }, 0);
}
