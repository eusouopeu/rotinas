import type { HistoryEntry } from "./history";
import type { Routine, RoutineStep } from "./types";
import { computeSchedule, rotinaAgendadaEm } from "./schedule";

// Estimativa inicial de UMA série de exercício (execução + descanso), usada
// até o exercício ter EXECUCOES_PARA_ESTIMAR execuções com tempo real
// (pedido de 26/09/2026; antes era fixa em 60s, index.html:1086).
export const EXERCICIO_SET_SEG = 75;
export const EXECUCOES_PARA_ESTIMAR = 3;

/** Duração média de uma série do exercício da etapa: média (tempo real /
 * séries feitas) das últimas três execuções dele em qualquer rotina; com
 * menos de três execuções medidas, a estimativa inicial. */
export function duracaoSerieEstimada(step: Pick<RoutineStep, "id" | "exercicioId">, history: HistoryEntry[]): number {
  const amostras: number[] = [];
  const ordenado = [...history].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  for (const h of ordenado) {
    for (const a of h.steps || []) {
      const mesmo = step.exercicioId ? a.exercicioId === step.exercicioId : a.id === step.id;
      const n = a.series?.length || 0;
      if (mesmo && n > 0 && (a.elapsedSec || 0) > 0) amostras.push(a.elapsedSec! / n);
      if (amostras.length >= EXECUCOES_PARA_ESTIMAR) break;
    }
    if (amostras.length >= EXECUCOES_PARA_ESTIMAR) break;
  }
  if (amostras.length < EXECUCOES_PARA_ESTIMAR) return EXERCICIO_SET_SEG;
  return Math.round(amostras.reduce((x, y) => x + y, 0) / amostras.length);
}

/** Estimador por etapa para routineDurationRaw/segundosRestantesEstimados. */
export function estimadorSerie(history: HistoryEntry[]): (step: RoutineStep) => number {
  const cache = new Map<string, number>();
  return (step) => {
    const k = step.exercicioId || "step:" + step.id;
    if (!cache.has(k)) cache.set(k, duracaoSerieEstimada(step, history));
    return cache.get(k)!;
  };
}

/**
 * Versão simplificada de routineDuration (index.html:1087+): soma os passos
 * como estão salvos, sem passar por playbackSteps (que expande descansos
 * automáticos entre etapas — ainda não portado). Suficiente para o card da
 * lista mostrar uma duração aproximada; não é a duração exata de execução.
 * `exercicioSetSeg` pode ser fixo ou um estimador por etapa (estimadorSerie).
 */
export function routineDurationRaw(
  r: Routine,
  exercicioSetSeg: number | ((step: RoutineStep) => number) = EXERCICIO_SET_SEG
): number {
  const serie = typeof exercicioSetSeg === "function" ? exercicioSetSeg : () => exercicioSetSeg;
  return r.steps.reduce((acc, s) => {
    if (s.type === "timer") return acc + (s.seconds || 0);
    if (s.type === "exercicio") return acc + (s.sets || 1) * serie(s);
    return acc;
  }, 0);
}

/* Porta de rotinaSemDiaFixo/rotinaCabeEmHoje (index.html:3227-3228) — o filtro
   "hoje" da Home: entra a rotina agendada para hoje E a que não tem dia fixo
   (sem agendamento não há dia devido, então ela nunca deveria sumir). */
export function rotinaSemDiaFixo(r: Routine): boolean {
  return !r || !r.schedule || !r.schedule.enabled;
}
export function rotinaCabeEmHoje(r: Routine, hoje = new Date()): boolean {
  return rotinaAgendadaEm(r, hoje) || rotinaSemDiaFixo(r);
}

/* Porta de rotinasOrdenadas (index.html:3259-3269) — a lista da Home fica
   sempre em ordem de horário de início; rotina sem agendamento vai depois das
   agendadas, com a ordem de criação como desempate (sort estável). */
export function rotinasOrdenadas(routines: Routine[]): Routine[] {
  return routines
    .map((r, i) => ({ r, i, min: computeSchedule(r)?.startMin }))
    .sort((a, b) => {
      if (a.min == null && b.min == null) return a.i - b.i;
      if (a.min == null) return 1;
      if (b.min == null) return -1;
      return a.min - b.min || a.i - b.i;
    })
    .map((x) => x.r);
}
