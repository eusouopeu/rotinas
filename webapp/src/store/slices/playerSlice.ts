// Slice do Player (timer/checklist/exercício) e da biblioteca de exercícios —
// extraído de useAppStore.ts em 11/09/2026 (recomendação 5 de
// docs/react-migration.md). Era um dos domínios "acoplados" que a extração
// anterior deixou para depois: depende de registrarConclusaoStep/gamificação e
// dos cues de som/vibração. O que destravou foi mover os helpers
// compartilhados para store/shared.ts; a lógica abaixo é a mesma, sem
// nenhuma mudança de comportamento.
import type { StateCreator } from "zustand";
import { descansoEntreSeries } from "../../lib/exercicios";
import { uid } from "../../lib/uid";

import { save } from "../../lib/storage";
import { K_NAOFEITAS } from "../../lib/constants";
import {
  K_EXERCICIOS,
  K_GAMIFICACAO,
  K_HISTORY,
} from "../../lib/constants";
import { localKey } from "../../lib/gamificacao";
import {
  adiarEtapaPlayer,
  exercicioAnteriorComSeries,
  freshExState,
  limparNaoFeitaMap,
  marcarNaoFeitaMap,
  moverGrupoPlayer,
  naoFeitasDe,
  novoPlayerState,
  type StepActual,
} from "../../lib/player";
import { finishCue, stepTransitionCue } from "../../lib/haptics";
import {
  areaDaRotina,
  desfazerConclusao,
  registrarConclusaoStep,
  totalPlanejadoSegundos,
} from "../../lib/scoring";
import type { HistoryEntry } from "../../lib/history";
import type {
  Exercicio,
  Tag,
} from "../../lib/types";
import type { AppState } from "../useAppStore";

export type PlayerSlice = Pick<
  AppState,
  | "startPlayer"
  | "clearPlayerBanner"
  | "togglePause"
  | "advanceStep"
  | "goPrevStep"
  | "exitPlayer"
  | "naoFazerEtapaAtual"
  | "adiarEtapaAtual"
  | "reiniciarTimerEtapaAtual"
  | "reordenarEtapasPlayer"
  | "concluirSerieExercicio"
  | "pularDescansoExercicio"
  | "voltarSerieExercicio"
  | "upsertExercicio"
  | "deleteExercicio"
>;

export const createPlayerSlice: StateCreator<AppState, [], [], PlayerSlice> = (set, get) => ({
  // index.html:11279-11829 (startPlayer/togglePause/advanceStep/goPrevStep/
  // finishRoutine) — etapas "timer" e "exercicio" (ver comentário no topo de
  // lib/player.ts para o que ainda falta).
  startPlayer: (routineId) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return;
    // Repescagem (index.html:11284-11296): se alguma etapa ficou "não feita"
    // hoje, a rotina volta só com as pendentes.
    const pendentes = naoFeitasDe(get().naoFeitas, routineId, localKey());
    const resultado = novoPlayerState(routine, pendentes);
    if (!resultado) return;
    const { playerState, repescagem } = resultado;
    const n = playerState.steps.filter((s) => !s.isRest).length;
    set({
      playerState,
      view: { tab: "home", screen: "player" },
      playerBanner: repescagem ? `Repescagem: só ${n} etapa${n > 1 ? "s" : ""} não feita${n > 1 ? "s" : ""} de hoje` : null,
    });
  },
  clearPlayerBanner: () => set({ playerBanner: null }),
  togglePause: () => {
    const p = get().playerState;
    if (!p) return;
    if (!p.paused) {
      set({ playerState: { ...p, paused: true, pausedAt: Date.now(), pauseCount: p.pauseCount + 1 } });
    } else {
      const delta = Date.now() - (p.pausedAt || Date.now());
      set({
        playerState: {
          ...p,
          paused: false,
          pausedAt: null,
          pausedTotalMs: p.pausedTotalMs + delta,
          stepEndTs: p.stepEndTs != null ? p.stepEndTs + delta : null,
          stepStart: p.stepStart + delta,
          ex: p.ex && p.ex.restEndTs != null ? { ...p.ex, restEndTs: p.ex.restEndTs + delta } : p.ex,
        },
      });
    }
  },
  advanceStep: (skipped = false, naoFeita = false) => {
    const p = get().playerState;
    if (!p) return;
    const routine = get().routines.find((r) => r.id === p.routineId);
    const step = p.steps[p.idx];
    const endRef = p.paused && p.pausedAt ? p.pausedAt : Date.now();
    const elapsed = Math.round((endRef - p.stepStart) / 1000);

    // Credita a etapa concluída (index.html:11462-11507) — descanso e etapa
    // pulada/não-feita não pontuam.
    let gam = get().gam;
    let pontosGanhos = p.pontosGanhos;
    let actual: StepActual;
    if (step.type === "exercicio") {
      // Pontuação proporcional a séries COMPLETAS, não a tempo gasto: cada
      // série "vale" o descanso planejado (index.html:11476-11491).
      const rest = descansoEntreSeries(routine?.restSeconds ?? 120, get().exercicios.find((e) => e.id === step.exercicioId));
      const results = p.ex?.results || [];
      actual = {
        id: step.id,
        tag: (step.tagValor || routine?.tagValor || "medio") as Tag,
        name: step.name,
        isRest: false,
        planned: (step.sets || 1) * rest,
        actual: skipped ? 0 : results.length * rest,
        skipped,
        naoFeita,
        exercicioId: step.exercicioId,
        series: results,
      };
    } else {
      actual = {
        id: step.id,
        tag: (step.tagValor || routine?.tagValor || "medio") as Tag,
        name: step.name,
        isRest: !!step.isRest,
        planned: step.type === "timer" ? step.seconds ?? null : null,
        actual: skipped ? 0 : elapsed,
        skipped,
        naoFeita,
      };
    }
    // concluir de verdade tira a etapa da repescagem do dia (index.html:11512).
    let naoFeitas = get().naoFeitas;
    if (!skipped && !step.isRest) {
      naoFeitas = limparNaoFeitaMap(naoFeitas, p.routineId, step.id, localKey());
      if (naoFeitas !== get().naoFeitas) save(K_NAOFEITAS, naoFeitas);
    }
    if (routine && !step.isRest && !skipped && actual.planned) {
      const r = registrarConclusaoStep(
        get().routines,
        gam,
        {
          routineId: routine.id,
          stepId: step.id,
          tag: actual.tag,
          minutos: actual.planned / 60,
          area: areaDaRotina(routine, gam),
          rotulo: routine.name,
        },
        new Date()
      );
      gam = r.gam;
      if (r.entry) {
        actual = { ...actual, gamItemId: r.entry.itemId };
        pontosGanhos += r.entry.pontos;
      }
    }
    const stepActuals = [...p.stepActuals];
    stepActuals[p.idx] = actual;
    save(K_GAMIFICACAO, gam);

    if (p.idx >= p.steps.length - 1) {
      // Fim da rotina (finishRoutine, index.html:11828-11884) — sem journaling
      // ainda (sem UI de anotações por etapa nesta fase).
      finishCue();
      if (routine) {
        const grossSec = Math.round((Date.now() - p.startedAt) / 1000);
        const entry: HistoryEntry = {
          date: localKey(new Date()),
          ts: Date.now(),
          startedTs: p.startedAt,
          routineId: routine.id,
          routineName: routine.name,
          plannedSec: totalPlanejadoSegundos(routine, get().exercicios),
          actualSec: Math.max(0, grossSec - Math.round(p.pausedTotalMs / 1000)),
          pauses: p.pauseCount,
          pausedSec: Math.round(p.pausedTotalMs / 1000),
          skippedCount: stepActuals.filter((a) => a?.skipped).length,
          steps: stepActuals.filter((a): a is StepActual => !!a),
        };
        const history = [...get().history, entry];
        save(K_HISTORY, history);
        set({ history, gam, naoFeitas, playerState: null, view: { tab: "home", screen: "done" } });
      } else {
        set({ gam, naoFeitas, playerState: null, view: { tab: "home", screen: "done" } });
      }
      return;
    }

    stepTransitionCue();
    const idx = p.idx + 1;
    const nextStep = p.steps[idx];
    const now = Date.now();
    set({
      gam,
      naoFeitas,
      playerState: {
        ...p,
        idx,
        stepActuals,
        pontosGanhos,
        stepStart: now,
        stepEndTs: nextStep.type === "timer" ? now + (nextStep.seconds || 0) * 1000 : null,
        ex: nextStep.type === "exercicio" ? freshExState() : null,
        overtimeCueFired: false,
      },
    });
  },
  goPrevStep: () => {
    const p = get().playerState;
    if (!p || p.idx <= 0) return;
    const idx = p.idx - 1;
    const step = p.steps[idx];
    const now = Date.now();
    // "voltar" desfaz a etapa que estava concluída ali — estorna os pontos
    // pra ela poder ser refeita (index.html:11804-11826).
    const desfeita = p.stepActuals[idx];
    let gam = get().gam;
    let pontosGanhos = p.pontosGanhos;
    // voltar numa etapa marcada como "não feita" apaga a anotação da
    // repescagem também (index.html:11819-11820) — ela volta a ser tratada
    // como parte normal da rotina, não mais pendente do dia.
    let naoFeitas = get().naoFeitas;
    if (desfeita?.naoFeita) {
      naoFeitas = limparNaoFeitaMap(naoFeitas, p.routineId, desfeita.id, localKey());
      if (naoFeitas !== get().naoFeitas) save(K_NAOFEITAS, naoFeitas);
    }
    if (desfeita?.gamItemId) {
      const creditado = gam.semanaAtual?.concluidos.find((c) => c.itemId === desfeita.gamItemId);
      if (creditado) pontosGanhos = Math.max(0, pontosGanhos - creditado.pontos);
      gam = desfazerConclusao(gam, desfeita.gamItemId);
      save(K_GAMIFICACAO, gam);
    }
    const stepActuals = [...p.stepActuals];
    stepActuals[idx] = undefined;
    set({
      gam,
      naoFeitas,
      playerState: {
        ...p,
        idx,
        stepActuals,
        pontosGanhos,
        paused: false,
        pausedAt: null,
        stepStart: now,
        stepEndTs: step.type === "timer" ? now + (step.seconds || 0) * 1000 : null,
        ex: step.type === "exercicio" ? freshExState() : null,
        overtimeCueFired: false,
      },
    });
  },
  exitPlayer: () => set({ playerState: null, view: { tab: "home", screen: "home" } }),

  naoFazerEtapaAtual: () => {
    const p = get().playerState;
    if (!p) return;
    const step = p.steps[p.idx];
    if (step.isRest) return;
    const naoFeitas = marcarNaoFeitaMap(get().naoFeitas, p.routineId, step.id, localKey());
    save(K_NAOFEITAS, naoFeitas);
    set({ naoFeitas, playerBanner: `"${step.name}" ficou como não feita — refaça hoje pela rotina` });
    get().advanceStep(true, true);
  },

  adiarEtapaAtual: () => {
    const p = get().playerState;
    if (!p) return;
    const resultado = adiarEtapaPlayer(p.steps, p.idx);
    if (!resultado) {
      set({ playerBanner: "Não há próxima etapa para adiar" });
      return;
    }
    stepTransitionCue();
    const novoStep = resultado.steps[p.idx];
    const now = Date.now();
    set({
      playerBanner: `"${resultado.adiadaNome}" vem depois de "${resultado.proximaNome}"`,
      playerState: {
        ...p,
        steps: resultado.steps,
        paused: false,
        pausedAt: null,
        stepStart: now,
        stepEndTs: novoStep.type === "timer" ? now + (novoStep.seconds || 0) * 1000 : null,
        ex: novoStep.type === "exercicio" ? freshExState() : null,
        overtimeCueFired: false,
      },
    });
  },

  reiniciarTimerEtapaAtual: () => {
    const p = get().playerState;
    if (!p) return;
    const step = p.steps[p.idx];
    if (step.type !== "timer") return;
    const now = Date.now();
    set({
      playerState: {
        ...p,
        paused: false,
        pausedAt: null,
        stepStart: now,
        stepEndTs: now + (step.seconds || 0) * 1000,
        overtimeCueFired: false,
      },
    });
  },

  reordenarEtapasPlayer: (gi, alvoGi) => {
    const p = get().playerState;
    if (!p) return;
    const novo = moverGrupoPlayer(p.steps, gi, alvoGi);
    if (!novo) return;
    set({ playerState: { ...p, steps: novo } });
  },

  concluirSerieExercicio: (reps, peso) => {
    const p = get().playerState;
    if (!p || !p.ex || p.ex.phase !== "set") return;
    const step = p.steps[p.idx];
    if (step.type !== "exercicio") return;
    const pesoUsado = Math.max(0, peso || 0);
    const results = [...p.ex.results, { reps: Math.max(0, Math.round(reps || 0)), peso: pesoUsado }];
    // a carga digitada vira a nova predefinição do exercício, pra próxima
    // sessão já sugerir esse peso (index.html:11378-11383)
    if (pesoUsado > 0 && step.exercicioId) {
      const exercicios = get().exercicios.map((e) => (e.id === step.exercicioId ? { ...e, pesoAtual: pesoUsado } : e));
      save(K_EXERCICIOS, exercicios);
      set({ exercicios });
    }
    const isLast = p.ex.setIdx >= (step.sets || 1) - 1;
    if (isLast) {
      set({ playerState: { ...p, ex: { ...p.ex, results } } });
      get().advanceStep();
      return;
    }
    const routine = get().routines.find((r) => r.id === p.routineId);
    stepTransitionCue();
    set({
      playerState: {
        ...p,
        overtimeCueFired: false,
        ex: {
          setIdx: p.ex.setIdx + 1,
          phase: "rest",
          results,
          restEndTs:
            Date.now() +
            descansoEntreSeries(routine?.restSeconds ?? 120, get().exercicios.find((e) => e.id === step.exercicioId)) * 1000,
        },
      },
    });
  },
  pularDescansoExercicio: () => {
    const p = get().playerState;
    if (!p || !p.ex || p.ex.phase !== "rest") return;
    set({ playerState: { ...p, ex: { ...p.ex, phase: "set", restEndTs: null } } });
  },
  voltarSerieExercicio: () => {
    const p = get().playerState;
    if (!p) return;
    if (p.ex && p.ex.results.length) {
      const results = p.ex.results.slice(0, -1);
      set({ playerState: { ...p, ex: { setIdx: Math.max(0, p.ex.setIdx - 1), phase: "set", results, restEndTs: null } } });
      return;
    }
    // Sem série registrada na etapa atual (ex.: a última série concluída sem
    // querer já levou ao descanso/próximo exercício): volta UMA série do
    // exercício anterior — reabre a última série dele com as outras intactas,
    // em vez de goPrevStep, que zera o exercício inteiro.
    const alvo = exercicioAnteriorComSeries(p);
    if (alvo < 0) return;
    const series = p.stepActuals[alvo]!.series!;
    let gam = get().gam;
    let pontosGanhos = p.pontosGanhos;
    let naoFeitas = get().naoFeitas;
    const stepActuals = [...p.stepActuals];
    for (let i = alvo; i <= p.idx; i++) {
      const desfeita = stepActuals[i];
      if (desfeita?.naoFeita) naoFeitas = limparNaoFeitaMap(naoFeitas, p.routineId, desfeita.id, localKey());
      if (desfeita?.gamItemId) {
        const creditado = gam.semanaAtual?.concluidos.find((c) => c.itemId === desfeita.gamItemId);
        if (creditado) pontosGanhos = Math.max(0, pontosGanhos - creditado.pontos);
        gam = desfazerConclusao(gam, desfeita.gamItemId);
      }
      stepActuals[i] = undefined;
    }
    if (gam !== get().gam) save(K_GAMIFICACAO, gam);
    if (naoFeitas !== get().naoFeitas) save(K_NAOFEITAS, naoFeitas);
    set({
      gam,
      naoFeitas,
      playerState: {
        ...p,
        idx: alvo,
        stepActuals,
        pontosGanhos,
        paused: false,
        pausedAt: null,
        stepStart: Date.now(),
        stepEndTs: null,
        overtimeCueFired: false,
        ex: { setIdx: series.length - 1, phase: "set", results: series.slice(0, -1), restEndTs: null },
      },
    });
  },

  upsertExercicio: (ex) => {
    const nome = ex.nome.trim();
    const pesoAtual = Math.max(0, ex.pesoAtual || 0);
    let saved: Exercicio;
    let exercicios: Exercicio[];
    if (ex.id) {
      saved = { id: ex.id, nome, grupos: ex.grupos, pesoAtual, composto: ex.composto !== false };
      exercicios = get().exercicios.map((e) => (e.id === ex.id ? saved : e));
    } else {
      saved = { id: uid(), nome, grupos: ex.grupos, pesoAtual, composto: ex.composto !== false };
      exercicios = [...get().exercicios, saved];
    }
    save(K_EXERCICIOS, exercicios);
    set({ exercicios });
    return saved;
  },
  deleteExercicio: (id) => {
    const exercicios = get().exercicios.filter((e) => e.id !== id);
    save(K_EXERCICIOS, exercicios);
    set({ exercicios });
  },
});
