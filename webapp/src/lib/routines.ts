import type { HistoryEntry } from "./history";
import type { Routine, RoutineStep } from "./types";
import { computeSchedule, rotinaAgendadaEm, rotinaPausadaEm } from "./schedule";

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
/* Memo por referência do histórico (27/09/2026): o histórico é imutável na
   store (cada mudança gera um array novo), então o mesmo array devolve o
   mesmo estimador e as médias já calculadas. O player redesenha a cada
   segundo e a agenda chama isto por dia — sem o memo, cada chamada
   reordenava o histórico inteiro. WeakMap: some junto com o array antigo. */
const memoSerie = new WeakMap<HistoryEntry[], (step: RoutineStep) => number>();
const memoEtapa = new WeakMap<HistoryEntry[], Map<string, (step: RoutineStep) => number>>();

export function estimadorSerie(history: HistoryEntry[]): (step: RoutineStep) => number {
  const pronto = memoSerie.get(history);
  if (pronto) return pronto;
  const cache = new Map<string, number>();
  const fn = (step: RoutineStep) => {
    const k = step.exercicioId || "step:" + step.id;
    if (!cache.has(k)) cache.set(k, duracaoSerieEstimada(step, history));
    return cache.get(k)!;
  };
  memoSerie.set(history, fn);
  return fn;
}

/** Duração aprendida das etapas de tempo (e descansos) de uma rotina
 * (recomendação 7 de 27/09/2026): média do tempo real das últimas três vezes
 * que a etapa foi concluída nessa rotina; com menos de três, o planejado.
 * Etapa pulada ou "não fazer" não entra na média. */
export function estimadorEtapaTempo(history: HistoryEntry[], routineId: string): (step: RoutineStep) => number {
  let porRotina = memoEtapa.get(history);
  if (!porRotina) memoEtapa.set(history, (porRotina = new Map()));
  const pronto = porRotina.get(routineId);
  if (pronto) return pronto;
  const fn = criarEstimadorEtapaTempo(history, routineId);
  porRotina.set(routineId, fn);
  return fn;
}

function criarEstimadorEtapaTempo(history: HistoryEntry[], routineId: string): (step: RoutineStep) => number {
  const ordenado = history.filter((h) => h.routineId === routineId).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const cache = new Map<string, number>();
  return (step) => {
    if (cache.has(step.id)) return cache.get(step.id)!;
    const amostras: number[] = [];
    for (const h of ordenado) {
      const a = (h.steps || []).find((x) => x.id === step.id);
      if (a && !a.skipped && a.actual > 0) amostras.push(a.actual);
      if (amostras.length >= EXECUCOES_PARA_ESTIMAR) break;
    }
    const v =
      amostras.length < EXECUCOES_PARA_ESTIMAR
        ? step.seconds || 0
        : Math.round(amostras.reduce((x, y) => x + y, 0) / amostras.length);
    cache.set(step.id, v);
    return v;
  };
}

/**
 * Versão simplificada de routineDuration (index.html:1087+): soma os passos
 * como estão salvos, sem passar por playbackSteps (que expande descansos
 * automáticos entre etapas — ainda não portado). Suficiente para o card da
 * lista mostrar uma duração aproximada; não é a duração exata de execução.
 * `exercicioSetSeg` pode ser fixo ou um estimador por etapa (estimadorSerie);
 * omitido, vale a estimativa inicial fixa — quem tem o histórico passa o
 * estimador (agenda, card, detalhe, boletim). Não há mais padrão global.
 */
export function routineDurationRaw(r: Routine, exercicioSetSeg?: number | ((step: RoutineStep) => number)): number {
  const serie =
    exercicioSetSeg === undefined
      ? () => EXERCICIO_SET_SEG
      : typeof exercicioSetSeg === "function"
        ? exercicioSetSeg
        : () => exercicioSetSeg;
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
  return (rotinaAgendadaEm(r, hoje) && !rotinaPausadaEm(r, hoje)) || rotinaSemDiaFixo(r);
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
