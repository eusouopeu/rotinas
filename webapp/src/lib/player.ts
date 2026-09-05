// Porta parcial do player (index.html:11140-11828) — etapas tipo "tempo" e
// "exercicio" (sub-loop de séries, ver freshExState/parseRepsRange, porta de
// index.html:11271-11276). Fica para depois: modo zen, anotações
// (journaling), nota vinculada, adiar/não-fazer etapa, repescagem — dependem
// de módulos que ainda não existem no React (streak). Registro de histórico
// (K_HISTORY) e pontuação (registrarConclusaoStep) JÁ estão ligados — ver
// lib/scoring.ts e as ações startPlayer/advanceStep/goPrevStep na store.
import type { Routine, RoutineStep, Tag } from "./types";

export interface StepActual {
  id: string;
  tag: Tag;
  name: string;
  isRest: boolean;
  planned: number | null;
  actual: number;
  skipped: boolean;
  gamItemId?: string;
  exercicioId?: string;
  series?: Array<{ reps: number; peso: number }>;
}

// Sub-loop de séries dentro de uma etapa "exercicio" (index.html:11271) —
// `phase` alterna "set" (registrando a série atual) e "rest" (descanso
// cronometrado entre séries, ver `routine.restSeconds`).
export interface ExPlayerState {
  setIdx: number;
  phase: "set" | "rest";
  results: Array<{ reps: number; peso: number }>;
  restEndTs: number | null;
}

export function freshExState(): ExPlayerState {
  return { setIdx: 0, phase: "set", results: [], restEndTs: null };
}

/** Porta de parseRepsRange (index.html:11272-11276) — "8-12" vira {min:8,
 * max:12}; um número solto vira {min:n,max:n}; texto inválido vira {0,0}. */
export function parseRepsRange(reps: string | undefined): { min: number; max: number } {
  const m = String(reps || "").match(/(\d+)\s*-\s*(\d+)/);
  if (m) return { min: +m[1], max: +m[2] };
  const n = parseInt(reps || "", 10);
  return { min: n || 0, max: n || 0 };
}

/** Porta de expandSteps+playbackSteps (index.html:11140-11165), sem o tipo
 * "routine" (sub-rotina referenciada) — não existe no editor atual. */
export function playbackSteps(routine: Routine): RoutineStep[] {
  const base = routine.steps.map((s) => ({ ...s }));
  const rest = routine.restSeconds || 0;
  if (!rest || base.length < 2) return base;
  const out: RoutineStep[] = [];
  base.forEach((s, i) => {
    out.push(s);
    if (i < base.length - 1) {
      out.push({ id: "rest-" + i, name: "Descanso", type: "timer", seconds: rest, isRest: true });
    }
  });
  return out;
}

export interface PlayerState {
  routineId: string;
  routineName: string;
  steps: RoutineStep[];
  idx: number;
  paused: boolean;
  pausedAt: number | null;
  pausedTotalMs: number;
  stepStart: number;
  stepEndTs: number | null;
  startedAt: number;
  pauseCount: number;
  stepActuals: Array<StepActual | undefined>;
  pontosGanhos: number;
  ex: ExPlayerState | null;
}

export function novoPlayerState(routine: Routine): PlayerState | null {
  const steps = playbackSteps(routine);
  if (steps.length === 0) return null;
  const first = steps[0];
  const now = Date.now();
  return {
    routineId: routine.id,
    routineName: routine.name,
    steps,
    idx: 0,
    paused: false,
    pausedAt: null,
    pausedTotalMs: 0,
    stepStart: now,
    stepEndTs: first.type === "timer" ? now + (first.seconds || 0) * 1000 : null,
    startedAt: now,
    pauseCount: 0,
    stepActuals: [],
    pontosGanhos: 0,
    ex: first.type === "exercicio" ? freshExState() : null,
  };
}

/** Porta de computeRemaining (index.html:11247-11252). */
export function computeRemaining(state: PlayerState): number {
  const step = state.steps[state.idx];
  if (!step || step.type !== "timer" || !state.stepEndTs) return 0;
  const ref = state.paused && state.pausedAt ? state.pausedAt : Date.now();
  return Math.round((state.stepEndTs - ref) / 1000);
}

/** Porta do cálculo inline de descanso entre séries (index.html:12266,
 * 12345) — usa `pausedAt` como referência quando pausado, igual ao timer de
 * etapa acima. */
export function computeExRestRemaining(state: PlayerState): number {
  const restEndTs = state.ex?.restEndTs;
  if (state.ex?.phase !== "rest" || !restEndTs) return 0;
  const ref = state.paused && state.pausedAt ? state.pausedAt : Date.now();
  return Math.max(0, Math.round((restEndTs - ref) / 1000));
}
