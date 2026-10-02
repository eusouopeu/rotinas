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

/** Próxima rotina de hoje (02/10/2026): a primeira, pela ordem de horário,
 *  agendada para hoje, não pausada/arquivada e ainda sem execução no dia —
 *  a tela de conclusão oferece começá-la direto, sem voltar à lista. */
export function proximaRotinaDeHoje(
  routines: Routine[],
  history: HistoryEntry[],
  excetoId: string | null,
  hoje = new Date()
): Routine | null {
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const feitas = new Set(history.filter((h) => h.date === iso).map((h) => h.routineId));
  return (
    rotinasOrdenadas(routines).find(
      (r) =>
        r.id !== excetoId &&
        !r.arquivada &&
        rotinaAgendadaEm(r, hoje) &&
        !rotinaPausadaEm(r, hoje) &&
        !feitas.has(r.id)
    ) ?? null
  );
}

/** "Nunca falhar dois dias" (02/10/2026, opção em Ajustes): a rotina é devida
 *  hoje, ainda não foi feita, e a ocorrência anterior (até 14 dias atrás,
 *  pulando dias pausados — da rotina ou da agenda inteira) ficou sem
 *  execução. Rotina sem horário/dias marcados não tem "ocorrência anterior". */
export function falhouUltimaVez(
  r: Routine,
  history: HistoryEntry[],
  pausasGerais: Array<{ from: number; to: number }> = [],
  hoje = new Date()
): boolean {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const pausado = (d: Date) => {
    if (rotinaPausadaEm(r, d)) return true;
    const meio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    return pausasGerais.some((p) => meio >= p.from && meio <= p.to);
  };
  if (r.arquivada || !rotinaAgendadaEm(r, hoje) || pausado(hoje)) return false;
  const feitos = new Set(history.filter((h) => h.routineId === r.id).map((h) => h.date));
  if (feitos.has(iso(hoje))) return false;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    if (r.createdAt && d.getTime() + 86400000 <= r.createdAt) return false;
    if (!rotinaAgendadaEm(r, d) || pausado(d)) continue;
    return !feitos.has(iso(d));
  }
  return false;
}

/* Variantes A/B (02/10/2026): a rotina guarda uma segunda lista de etapas
   (`stepsB`) e alterna sozinha a cada execução — Treino A, Treino B, Treino
   A... A variante feita fica no histórico (`HistoryEntry.variante`); a
   próxima é a oposta da última execução. Agenda, duração e xp continuam
   calculados pela versão A. */
export function temVarianteB(r: Pick<Routine, "stepsB">): boolean {
  return !!r.stepsB && r.stepsB.length > 0;
}

export function proximaVariante(r: Routine, history: HistoryEntry[]): "A" | "B" | null {
  if (!temVarianteB(r)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.routineId !== r.id || h.minima) continue;
    return h.variante === "A" ? "B" : "A";
  }
  return "A";
}

/** A rotina com as etapas da variante pedida (B sem etapas cai na A). */
export function rotinaDaVariante(r: Routine, v: "A" | "B" | null | undefined): Routine {
  return v === "B" && temVarianteB(r) ? { ...r, steps: r.stepsB! } : r;
}
