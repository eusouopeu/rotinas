// Estado reativo — uma store Zustand única espelhando os globais do app
// antigo (index.html:349+). Cada setter escreve através de lib/storage.ts
// (mesmo par load/save de sempre) e atualiza a store, igual ao padrão
// save(K_X, x) + render() do app antigo, só que sem o "+ render()" manual —
// o React re-renderiza sozinho quem lê a fatia que mudou.
import { create } from "zustand";
import { bootStorage, load, save } from "../lib/storage";
import {
  K_DIGESTSEMANAL,
  K_FONTSCALE,
  K_GAMIFICACAO,
  K_NUDGE,
  K_NUDGEDAYS,
  K_ROUTINES,
  K_SIDEBARCOLLAPSED,
  K_THEME,
  K_WEEKSTART,
} from "../lib/constants";
import { criarEstadoGamificacaoInicial } from "../lib/gamificacao";
import { novoDraftSchedule } from "../lib/schedule";
import { novoPlayerState, type PlayerState } from "../lib/player";
import type { AppView, GamificacaoConfig, GamificacaoState, RodaArea, Routine } from "../lib/types";

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

  boot: async () => {
    await bootStorage();
    let gam = load<GamificacaoState>(K_GAMIFICACAO, null as unknown as GamificacaoState);
    if (!gam) gam = criarEstadoGamificacaoInicial();
    set({
      routines: load<Routine[]>(K_ROUTINES, []),
      theme: load<Theme>(K_THEME, "auto"),
      fontScale: load<number>(K_FONTSCALE, 1),
      weekStart: load<number>(K_WEEKSTART, 0),
      digestSemanal: load<boolean>(K_DIGESTSEMANAL, true),
      nudge: load<boolean>(K_NUDGE, true),
      nudgeDias: load<number[]>(K_NUDGEDAYS, [5]),
      sidebarCollapsed: load<boolean>(K_SIDEBARCOLLAPSED, false),
      gam,
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
      set({ playerState: { ...p, paused: true, pausedAt: Date.now() } });
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
    if (p.idx >= p.steps.length - 1) {
      set({ playerState: null, view: { tab: "home", screen: "done" } });
      return;
    }
    const idx = p.idx + 1;
    const step = p.steps[idx];
    const now = Date.now();
    set({
      playerState: {
        ...p,
        idx,
        stepStart: now,
        stepEndTs: step.type === "timer" ? now + (step.seconds || 0) * 1000 : null,
      },
    });
  },
  goPrevStep: () => {
    const p = get().playerState;
    if (!p || p.idx <= 0) return;
    const idx = p.idx - 1;
    const step = p.steps[idx];
    const now = Date.now();
    set({
      playerState: {
        ...p,
        idx,
        paused: false,
        pausedAt: null,
        stepStart: now,
        stepEndTs: step.type === "timer" ? now + (step.seconds || 0) * 1000 : null,
      },
    });
  },
  exitPlayer: () => set({ playerState: null, view: { tab: "home", screen: "home" } }),
}));

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
