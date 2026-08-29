// Estado reativo — uma store Zustand única espelhando os globais do app
// antigo (index.html:349+). Cada setter escreve através de lib/storage.ts
// (mesmo par load/save de sempre) e atualiza a store, igual ao padrão
// save(K_X, x) + render() do app antigo, só que sem o "+ render()" manual —
// o React re-renderiza sozinho quem lê a fatia que mudou.
import { create } from "zustand";
import { bootStorage, load, save } from "../lib/storage";
import {
  K_DIARIO,
  K_DIGESTSEMANAL,
  K_FONTSCALE,
  K_GAMIFICACAO,
  K_HISTORY,
  K_NUDGE,
  K_NUDGEDAYS,
  K_ROUTINES,
  K_SIDEBARCOLLAPSED,
  K_TEMPLATES,
  K_THEME,
  K_WEEKSTART,
} from "../lib/constants";
import { criarEstadoGamificacaoInicial, localKey } from "../lib/gamificacao";
import { novoDraftSchedule } from "../lib/schedule";
import { novoPlayerState, type PlayerState, type StepActual } from "../lib/player";
import { estornarMeta, sincronizarPontosMeta } from "../lib/metas";
import { areaDaRotina, avancarGamificacaoAteAgora, desfazerConclusao, registrarConclusaoStep, totalPlanejadoSegundos } from "../lib/scoring";
import type { HistoryEntry } from "../lib/history";
import type {
  AppView,
  CountdownDoc,
  DiarioMap,
  GamificacaoConfig,
  GamificacaoState,
  MetaTarget,
  RodaArea,
  Routine,
  Tag,
} from "../lib/types";

// Templates é um array de docs de vários tipos (mercado, kanban, matriz...)
// no app antigo — aqui só sabemos ler/escrever o tipo "countdown" (Metas), o
// resto passa por como está (unknown), pra nunca perder o que o app antigo
// já tiver salvo em K_TEMPLATES quando isto um dia convergir com ele.
type AnyTemplateDoc = CountdownDoc | (Record<string, unknown> & { id: string; type: string });

function isCountdownDoc(d: AnyTemplateDoc): d is CountdownDoc {
  return d.type === "countdown";
}

function criarMetaDoc(): CountdownDoc {
  return { id: uid(), type: "countdown", title: "Metas", targets: [], updatedAt: Date.now(), createdAt: Date.now() };
}

type Theme = "auto" | "light" | "dark";

function novoDraft(): Routine {
  return {
    id: uid(),
    name: "",
    sound: "mudo",
    steps: [{ id: uid(), name: "", seconds: 60, type: "timer" }],
    schedule: novoDraftSchedule(),
    restSeconds: 0,
    tagValor: "medio",
  };
}

interface AppState {
  booted: boolean;
  view: AppView;
  routines: Routine[];
  theme: Theme;
  fontScale: number;
  weekStart: number;
  digestSemanal: boolean;
  nudge: boolean;
  nudgeDias: number[];
  sidebarCollapsed: boolean;
  gam: GamificacaoState;
  editorDraft: Routine | null;
  playerState: PlayerState | null;
  templates: AnyTemplateDoc[];
  diario: DiarioMap;
  history: HistoryEntry[];

  boot: () => Promise<void>;
  goTo: (view: AppView) => void;

  deleteRoutine: (id: string) => void;

  openEditor: (id?: string | null) => void;
  updateDraft: (patch: Partial<Routine>) => void;
  cancelEdit: () => void;
  /** Mesma validação de doSaveEdit (index.html:4707-4720): nome e etapas
   * sem nome vazio são descartados; sem nenhuma etapa restante, não salva. */
  saveDraft: () => boolean;

  setTheme: (t: Theme) => void;
  setFontScale: (n: number) => void;
  setWeekStart: (d: number) => void;
  setDigestSemanal: (v: boolean) => void;
  setNudge: (v: boolean) => void;
  toggleNudgeDia: (d: number) => void;
  toggleSidebarCollapsed: () => void;

  updateGamConfig: (patch: Partial<GamificacaoConfig>) => void;
  addRodaArea: (label: string) => void;
  updateRodaArea: (id: string, patch: Partial<RodaArea>) => void;
  removeRodaArea: (id: string) => void;

  startPlayer: (routineId: string) => void;
  togglePause: () => void;
  advanceStep: () => void;
  goPrevStep: () => void;
  exitPlayer: () => void;

  metaDoc: () => CountdownDoc;
  addMeta: (title: string, date: string) => void;
  updateMeta: (id: string, patch: Partial<MetaTarget>) => void;
  setMetaDone: (id: string, done: number) => void;
  deleteMeta: (id: string) => void;

  setDiarioTexto: (chave: string, texto: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  view: { tab: "home", screen: "home" },
  routines: [],
  theme: "auto",
  fontScale: 1,
  weekStart: 0,
  digestSemanal: true,
  nudge: true,
  nudgeDias: [5],
  sidebarCollapsed: false,
  gam: criarEstadoGamificacaoInicial(),
  editorDraft: null,
  playerState: null,
  templates: [],
  diario: {},
  history: [],

  boot: async () => {
    await bootStorage();
    const routines = load<Routine[]>(K_ROUTINES, []);
    let gam = load<GamificacaoState>(K_GAMIFICACAO, null as unknown as GamificacaoState);
    if (!gam) gam = criarEstadoGamificacaoInicial();
    // index.html:1462 (!gam.semanaAtual congela) + avancarGamificacaoAteAgora
    // no boot (index.html:14444+) — o app pode ter ficado dias fechado.
    gam = avancarGamificacaoAteAgora(routines, gam);
    save(K_GAMIFICACAO, gam);
    set({
      routines,
      theme: load<Theme>(K_THEME, "auto"),
      fontScale: load<number>(K_FONTSCALE, 1),
      weekStart: load<number>(K_WEEKSTART, 0),
      digestSemanal: load<boolean>(K_DIGESTSEMANAL, true),
      nudge: load<boolean>(K_NUDGE, true),
      nudgeDias: load<number[]>(K_NUDGEDAYS, [5]),
      sidebarCollapsed: load<boolean>(K_SIDEBARCOLLAPSED, false),
      gam,
      templates: load<AnyTemplateDoc[]>(K_TEMPLATES, []),
      diario: load<DiarioMap>(K_DIARIO, {}),
      history: load<HistoryEntry[]>(K_HISTORY, []),
      booted: true,
    });
  },

  goTo: (view) => set({ view }),

  deleteRoutine: (id) => {
    const routines = get().routines.filter((r) => r.id !== id);
    save(K_ROUTINES, routines);
    set({ routines });
  },

  openEditor: (id) => {
    const existente = id ? get().routines.find((r) => r.id === id) : null;
    const editorDraft: Routine = existente ? JSON.parse(JSON.stringify(existente)) : novoDraft();
    // Rotina salva por uma versão anterior do editor (ou pela store antiga,
    // antes deste editor existir) pode não ter `schedule`/`steps` — mesmo
    // preenchimento defensivo de index.html:4308-4311.
    const schedule = editorDraft.schedule || novoDraftSchedule()!;
    if (!schedule.days?.length) schedule.days = [0, 1, 2, 3, 4, 5, 6];
    editorDraft.schedule = schedule;
    if (!editorDraft.steps?.length) editorDraft.steps = [{ id: uid(), name: "", seconds: 60, type: "timer" }];
    if (editorDraft.restSeconds === undefined) editorDraft.restSeconds = 0;
    if (editorDraft.tagValor === undefined) editorDraft.tagValor = "medio";
    set({ editorDraft, view: { tab: "home", screen: "editor" } });
  },
  updateDraft: (patch) => {
    const atual = get().editorDraft;
    if (!atual) return;
    set({ editorDraft: { ...atual, ...patch } });
  },
  cancelEdit: () => set({ editorDraft: null, view: { tab: "home", screen: "home" } }),
  saveDraft: () => {
    const draft = get().editorDraft;
    if (!draft) return false;
    const nome = draft.name.trim();
    if (!nome) return false;
    const steps = draft.steps.filter((s) => s.name.trim().length > 0);
    if (steps.length === 0) return false;
    const limpo: Routine = { ...draft, name: nome, steps };
    const routines = get().routines;
    const idx = routines.findIndex((r) => r.id === limpo.id);
    const novasRoutines = idx >= 0 ? routines.map((r, i) => (i === idx ? limpo : r)) : [...routines, limpo];
    save(K_ROUTINES, novasRoutines);
    set({ routines: novasRoutines, editorDraft: null, view: { tab: "home", screen: "home" } });
    return true;
  },

  setTheme: (theme) => {
    save(K_THEME, theme);
    set({ theme });
  },
  setFontScale: (fontScale) => {
    save(K_FONTSCALE, fontScale);
    set({ fontScale });
  },
  setWeekStart: (weekStart) => {
    save(K_WEEKSTART, weekStart);
    set({ weekStart });
  },
  setDigestSemanal: (digestSemanal) => {
    save(K_DIGESTSEMANAL, digestSemanal);
    set({ digestSemanal });
  },
  setNudge: (nudge) => {
    save(K_NUDGE, nudge);
    set({ nudge });
  },
  toggleNudgeDia: (d) => {
    const atual = get().nudgeDias;
    const i = atual.indexOf(d);
    const nudgeDias = i === -1 ? [...atual, d].sort((a, b) => a - b) : atual.filter((x) => x !== d);
    if (!nudgeDias.length) return; // lista vazia = usar o toggle "nudge" acima para desligar
    save(K_NUDGEDAYS, nudgeDias);
    set({ nudgeDias });
  },
  toggleSidebarCollapsed: () => {
    const sidebarCollapsed = !get().sidebarCollapsed;
    save(K_SIDEBARCOLLAPSED, sidebarCollapsed);
    set({ sidebarCollapsed });
  },

  updateGamConfig: (patch) => {
    const gam = get().gam;
    const novo: GamificacaoState = { ...gam, config: { ...gam.config, ...patch } };
    save(K_GAMIFICACAO, novo);
    set({ gam: novo });
  },
  addRodaArea: (label) => {
    const gam = get().gam;
    const nome = label.trim();
    if (!nome) return;
    const area: RodaArea = { id: uid(), label: nome, color: "var(--caneta)", peso: 5 };
    const novo: GamificacaoState = {
      ...gam,
      config: { ...gam.config, roda: { ...gam.config.roda, areas: [...gam.config.roda.areas, area] } },
    };
    save(K_GAMIFICACAO, novo);
    set({ gam: novo });
  },
  updateRodaArea: (id, patch) => {
    const gam = get().gam;
    const areas = gam.config.roda.areas.map((a) => (a.id === id ? { ...a, ...patch } : a));
    const novo: GamificacaoState = { ...gam, config: { ...gam.config, roda: { ...gam.config.roda, areas } } };
    save(K_GAMIFICACAO, novo);
    set({ gam: novo });
  },
  removeRodaArea: (id) => {
    const gam = get().gam;
    const areas = gam.config.roda.areas.filter((a) => a.id !== id);
    const novo: GamificacaoState = { ...gam, config: { ...gam.config, roda: { ...gam.config.roda, areas } } };
    save(K_GAMIFICACAO, novo);
    set({ gam: novo });
  },

  // index.html:11279-11829 (startPlayer/togglePause/advanceStep/goPrevStep/
  // finishRoutine) — só o caminho de etapas "timer", sem pontuação/histórico
  // ainda (ver comentário no topo de lib/player.ts).
  startPlayer: (routineId) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return;
    const playerState = novoPlayerState(routine);
    if (!playerState) return;
    set({ playerState, view: { tab: "home", screen: "player" } });
  },
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
        },
      });
    }
  },
  advanceStep: () => {
    const p = get().playerState;
    if (!p) return;
    const routine = get().routines.find((r) => r.id === p.routineId);
    const step = p.steps[p.idx];
    const endRef = p.paused && p.pausedAt ? p.pausedAt : Date.now();
    const elapsed = Math.round((endRef - p.stepStart) / 1000);

    // Credita a etapa concluída (index.html:11462-11507) — descanso não pontua.
    let gam = get().gam;
    let pontosGanhos = p.pontosGanhos;
    let actual: StepActual = {
      id: step.id,
      tag: (step.tagValor || routine?.tagValor || "medio") as Tag,
      name: step.name,
      isRest: !!step.isRest,
      planned: step.type === "timer" ? step.seconds ?? null : null,
      actual: elapsed,
      skipped: false,
    };
    if (routine && !step.isRest && actual.planned) {
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
      // nem "skipped" ainda (sem UI de pular etapa nesta fase).
      if (routine) {
        const grossSec = Math.round((Date.now() - p.startedAt) / 1000);
        const entry: HistoryEntry = {
          date: localKey(new Date()),
          ts: Date.now(),
          startedTs: p.startedAt,
          routineId: routine.id,
          routineName: routine.name,
          plannedSec: totalPlanejadoSegundos(routine),
          actualSec: Math.max(0, grossSec - Math.round(p.pausedTotalMs / 1000)),
          pauses: p.pauseCount,
          pausedSec: Math.round(p.pausedTotalMs / 1000),
          skippedCount: 0,
          steps: stepActuals.filter((a): a is StepActual => !!a),
        };
        const history = [...get().history, entry];
        save(K_HISTORY, history);
        set({ history, gam, playerState: null, view: { tab: "home", screen: "done" } });
      } else {
        set({ gam, playerState: null, view: { tab: "home", screen: "done" } });
      }
      return;
    }

    const idx = p.idx + 1;
    const nextStep = p.steps[idx];
    const now = Date.now();
    set({
      gam,
      playerState: {
        ...p,
        idx,
        stepActuals,
        pontosGanhos,
        stepStart: now,
        stepEndTs: nextStep.type === "timer" ? now + (nextStep.seconds || 0) * 1000 : null,
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
      playerState: {
        ...p,
        idx,
        stepActuals,
        pontosGanhos,
        paused: false,
        pausedAt: null,
        stepStart: now,
        stepEndTs: step.type === "timer" ? now + (step.seconds || 0) * 1000 : null,
      },
    });
  },
  exitPlayer: () => set({ playerState: null, view: { tab: "home", screen: "home" } }),

  // Metas (index.html:6403-6408, 8391+) — só Prazos por ora (ver
  // lib/metas.ts). `metaDoc()` acha-ou-cria o doc "countdown" dentro de
  // `templates`, igual getOrCreateCountdownDoc, sem tocar nos outros tipos.
  metaDoc: () => {
    const existente = get()
      .templates.filter(isCountdownDoc)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (existente) return existente;
    const doc = criarMetaDoc();
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates });
    return doc;
  },
  addMeta: (title, date) => {
    const nome = title.trim();
    if (!nome || !date) return;
    const doc = get().metaDoc();
    const meta: MetaTarget = { id: uid(), title: nome, date, createdAt: Date.now(), tagValor: "alto" };
    const docNovo: CountdownDoc = { ...doc, targets: [...doc.targets, meta], updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  updateMeta: (id, patch) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    let atualizado: MetaTarget = { ...alvo, ...patch };
    let gam = get().gam;
    if ("topics" in patch || "done" in patch || "tagValor" in patch || "date" in patch) {
      const r = sincronizarPontosMeta(atualizado, gam);
      atualizado = r.target;
      gam = r.gam;
    }
    const docNovo: CountdownDoc = {
      ...doc,
      targets: doc.targets.map((t) => (t.id === id ? atualizado : t)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },
  setMetaDone: (id, done) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    const clamped = Math.max(0, Math.min(alvo.topics ?? done, done));
    get().updateMeta(id, { done: clamped });
  },
  deleteMeta: (id) => {
    const doc = get().metaDoc();
    const alvo = doc.targets.find((t) => t.id === id);
    if (!alvo) return;
    const { gam } = estornarMeta(alvo, get().gam);
    const docNovo: CountdownDoc = { ...doc, targets: doc.targets.filter((t) => t.id !== id), updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },

  // Diário (index.html K_DIARIO) — um texto por chave "escopo:período"
  // (diarioChave). Só o texto simples nesta fase; agenda/kanban ficam para
  // depois (ver CLAUDE.md > "webapp/").
  setDiarioTexto: (chave, texto) => {
    const diario = { ...get().diario, [chave]: texto };
    save(K_DIARIO, diario);
    set({ diario });
  },
}));

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
