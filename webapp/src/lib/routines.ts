import type { Routine } from "./types";
import { computeSchedule, rotinaAgendadaEm } from "./schedule";

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
