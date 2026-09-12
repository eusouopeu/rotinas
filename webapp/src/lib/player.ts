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
  // "não fazer" (index.html:11542-11548): encerra sem concluir/pontuar E
  // marca a etapa como pendente do dia (naoFeitas) — diferente de "pular
  // etapa (opcional)", que também tem skipped:true mas não vira repescagem.
  naoFeita?: boolean;
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
  // Dispara o aviso de "tempo estourado" (vibração) só uma vez por etapa —
  // sem isso o tick de 1s repetiria a vibração a cada segundo negativo
  // (index.html:11433, overtimeCueFired).
  overtimeCueFired: boolean;
}

/** Porta de podarDescansos (index.html:11176-11184) — remove descanso
 * duplicado/sobrando depois de filtrar por repescagem (nunca duas pausas
 * seguidas, nunca uma pausa sobrando no fim). */
export function podarDescansos(steps: RoutineStep[]): RoutineStep[] {
  const out: RoutineStep[] = [];
  steps.forEach((s) => {
    if (s.isRest && (!out.length || out[out.length - 1].isRest)) return;
    out.push(s);
  });
  while (out.length && out[out.length - 1].isRest) out.pop();
  return out;
}

export interface NovoPlayerStateResult {
  playerState: PlayerState;
  /** true quando a rotina voltou só com as etapas pendentes de hoje
   * (repescagem, index.html:11284-11296) — Player.tsx mostra o aviso. */
  repescagem: boolean;
}

/** `pendentes`: ids de etapa marcados como "não feita" hoje nesta rotina
 * (naoFeitasDe) — se houver alguma, a rotina reabre só com elas (+ pausas),
 * igual ao startPlayer do legado. Sem pendentes, roda a rotina inteira. */
export function novoPlayerState(routine: Routine, pendentes: string[] = []): NovoPlayerStateResult | null {
  let steps = playbackSteps(routine);
  if (steps.length === 0) return null;
  let repescagem = false;
  if (pendentes.length) {
    const filtrados = podarDescansos(steps.filter((s) => s.isRest || pendentes.includes(s.id)));
    if (filtrados.some((s) => !s.isRest)) {
      steps = filtrados;
      repescagem = true;
    }
  }
  const first = steps[0];
  const now = Date.now();
  return {
    playerState: {
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
      overtimeCueFired: false,
    },
    repescagem,
  };
}

export interface ActiveCountdown {
  endTs: number;
  auto: boolean;
  isRest: boolean;
  label: string;
}

/** Porta de activeCountdown (index.html:11265-11276) — só timer de etapa ou
 * descanso ENTRE SÉRIES de exercício têm contagem ativa; checklist e a fase
 * "set" do exercício não. */
export function activeCountdown(state: PlayerState): ActiveCountdown | null {
  const step = state.steps[state.idx];
  if (!step) return null;
  if (step.type === "timer" && state.stepEndTs) {
    return { endTs: state.stepEndTs, auto: false, isRest: !!step.isRest, label: step.name || "" };
  }
  if (step.type === "exercicio" && state.ex?.phase === "rest" && state.ex.restEndTs) {
    // auto:false — o descanso entre séries não avança sozinho (nem no app nem
    // na bolha nativa): zera, avisa e segue contando negativo até o toque.
    return { endTs: state.ex.restEndTs, auto: false, isRest: true, label: "Descanso" + (step.name ? " — " + step.name : "") };
  }
  return null;
}

export interface OverlayQueueItem {
  label: string;
  seconds: number;
  auto: boolean;
}

/** Porta de filaOverlay (index.html:2633-2641) — etapas de tempo a partir da
 * próxima, para o serviço de overlay nativo rolar os descansos sozinho. Para
 * na primeira etapa que não for "timer": dali em diante só o app resolve. */
export function filaOverlay(state: PlayerState): OverlayQueueItem[] {
  const out: OverlayQueueItem[] = [];
  for (let i = state.idx + 1; i < state.steps.length; i++) {
    const s = state.steps[i];
    if (s.type !== "timer") break;
    out.push({ label: s.name || "", seconds: s.seconds || 0, auto: false });
  }
  return out;
}

/** Índice do exercício concluído logo antes da etapa atual (pulando no máximo
 * a pausa entre eles), com séries registradas — alvo do "voltar série" quando
 * a etapa atual ainda não tem série. -1 se não houver. */
export function exercicioAnteriorComSeries(state: PlayerState): number {
  let j = state.idx - 1;
  if (state.steps[j]?.isRest) j--;
  if (j < 0 || state.steps[j]?.type !== "exercicio") return -1;
  const a = state.stepActuals[j];
  return a && !a.skipped && a.series?.length ? j : -1;
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
 * etapa acima. Fica negativo depois do fim (não avança sozinho). */
export function computeExRestRemaining(state: PlayerState): number {
  const restEndTs = state.ex?.restEndTs;
  if (state.ex?.phase !== "rest" || !restEndTs) return 0;
  const ref = state.paused && state.pausedAt ? state.pausedAt : Date.now();
  return Math.round((restEndTs - ref) / 1000);
}

/* ---- Repescagem: etapas marcadas "não feita" hoje (index.html:11192-11223) ----
   Sem cycles (multi-volta) no React ainda, então nunca precisamos de
   idBaseEtapa (que só existia para achar a etapa-base de uma volta repetida
   com id sufixado "-c<n>") — o id do RoutineStep já é a chave estável. */
export interface NaoFeitaRec {
  date: string;
  ids: string[];
}
export type NaoFeitasMap = Record<string, NaoFeitaRec>;

export function naoFeitasDe(map: NaoFeitasMap, routineId: string, hoje: string): string[] {
  const rec = map[routineId];
  return rec && rec.date === hoje ? rec.ids : [];
}

export function marcarNaoFeitaMap(map: NaoFeitasMap, routineId: string, stepId: string, hoje: string): NaoFeitasMap {
  const rec = map[routineId] && map[routineId].date === hoje ? map[routineId] : { date: hoje, ids: [] };
  if (rec.ids.includes(stepId)) return map;
  return { ...map, [routineId]: { date: hoje, ids: [...rec.ids, stepId] } };
}

export function limparNaoFeitaMap(map: NaoFeitasMap, routineId: string, stepId: string, hoje: string): NaoFeitasMap {
  const rec = map[routineId];
  if (!rec || rec.date !== hoje) return map;
  const ids = rec.ids.filter((id) => id !== stepId);
  const novo = { ...map };
  if (ids.length) novo[routineId] = { date: hoje, ids };
  else delete novo[routineId];
  return novo;
}

/** Porta da IIFE podarNaoFeitasDeOutrosDias (index.html:11194-11201) — chamada
 * no boot: descarta registros de dias anteriores (a repescagem só vale hoje). */
export function podarNaoFeitasDeOutrosDias(map: NaoFeitasMap, hoje: string): NaoFeitasMap {
  const novo: NaoFeitasMap = {};
  let mudou = false;
  for (const [rid, rec] of Object.entries(map)) {
    if (rec && rec.date === hoje && rec.ids.length) novo[rid] = rec;
    else mudou = true;
  }
  return mudou ? novo : map;
}

/* ---- Reordenar/adiar etapas em execução (index.html:11626-11809) ----
   Tarefa + a pausa que vem logo depois dela (se houver) sempre andam juntas
   — é o "bloco" que adiarEtapa troca de lugar e que openPlayerStepsOverlay
   reordena; nunca a posição crua no array, que trocaria a tarefa pela PAUSA
   seguinte em vez de alcançar a próxima tarefa de verdade. */
export interface StepGroup {
  reais: number[];
  step: RoutineStep;
}

export function agruparEtapasPlayer(steps: RoutineStep[]): StepGroup[] {
  const grupos: StepGroup[] = [];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].isRest) continue;
    const reais = [i];
    if (steps[i + 1]?.isRest) reais.push(i + 1);
    grupos.push({ reais, step: steps[i] });
  }
  return grupos;
}

/** Troca o grupo `gi` de lugar com o grupo `alvoGi` (ambos índices na lista
 * agrupada de agruparEtapasPlayer) e devolve o array de etapas achatado de
 * volta. `null` se um dos índices for inválido. */
export function moverGrupoPlayer(steps: RoutineStep[], gi: number, alvoGi: number): RoutineStep[] | null {
  const grupos = agruparEtapasPlayer(steps);
  if (gi < 0 || gi >= grupos.length || alvoGi < 0 || alvoGi >= grupos.length) return null;
  const blocos = grupos.map((g) => g.reais.map((i) => steps[i]));
  const tmp = blocos[gi];
  blocos[gi] = blocos[alvoGi];
  blocos[alvoGi] = tmp;
  return blocos.flat();
}

export interface AdiarEtapaResult {
  steps: RoutineStep[];
  adiadaNome: string;
  proximaNome: string;
}

/** Porta de adiarEtapa (index.html:11788-11809) — o bloco da etapa ATUAL
 * troca de lugar com o bloco seguinte inteiro (não com a posição i+1, que
 * podia ser só a pausa dela). `null` se não há próxima etapa para adiar. */
export function adiarEtapaPlayer(steps: RoutineStep[], idx: number): AdiarEtapaResult | null {
  const curLen = !steps[idx].isRest && steps[idx + 1]?.isRest ? 2 : 1;
  const nextStart = idx + curLen;
  if (nextStart >= steps.length) return null;
  const nextLen = !steps[nextStart].isRest && steps[nextStart + 1]?.isRest ? 2 : 1;
  const curBlock = steps.slice(idx, idx + curLen);
  const nextBlock = steps.slice(nextStart, nextStart + nextLen);
  const novo = steps.slice(0, idx).concat(nextBlock, curBlock, steps.slice(nextStart + nextLen));
  return { steps: novo, adiadaNome: curBlock[0].name, proximaNome: nextBlock[0].name };
}
