// Porta parcial do player (index.html:11140-11828) — só o caminho de etapas
// tipo "tempo", que é tudo que o RoutineEditor cria hoje. Fica para depois:
// etapa "exercicio"/"checklist", modo zen, anotações (journaling), nota
// vinculada, adiar/não-fazer etapa — dependem de módulos que ainda não
// existem no React (exercícios, streak). Registro de histórico (K_HISTORY) e
// pontuação (registrarConclusaoStep) JÁ estão ligados — ver lib/scoring.ts e
// as ações startPlayer/advanceStep/goPrevStep na store.
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
  series?: Array<{ reps?: number; peso?: number; carga?: number }>;
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
  };
}

/** Porta de computeRemaining (index.html:11247-11252). */
export function computeRemaining(state: PlayerState): number {
  const step = state.steps[state.idx];
  if (!step || step.type !== "timer" || !state.stepEndTs) return 0;
  const ref = state.paused && state.pausedAt ? state.pausedAt : Date.now();
  return Math.round((state.stepEndTs - ref) / 1000);
}
