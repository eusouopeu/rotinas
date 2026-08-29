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
  K_THEME,
  K_WEEKSTART,
} from "../lib/constants";
import { criarEstadoGamificacaoInicial } from "../lib/gamificacao";
import type { AppView, GamificacaoState, Routine } from "../lib/types";

type Theme = "auto" | "light" | "dark";

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
  gam: GamificacaoState;

  boot: () => Promise<void>;
  goTo: (view: AppView) => void;

  addRoutine: (name: string) => void;
  deleteRoutine: (id: string) => void;

  setTheme: (t: Theme) => void;
  setFontScale: (n: number) => void;
  setWeekStart: (d: number) => void;
  setDigestSemanal: (v: boolean) => void;
  setNudge: (v: boolean) => void;
  toggleNudgeDia: (d: number) => void;
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
  gam: criarEstadoGamificacaoInicial(),

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
      gam,
      booted: true,
    });
  },

  goTo: (view) => set({ view }),

  addRoutine: (name) => {
    const r: Routine = { id: uid(), name, steps: [] };
    const routines = [...get().routines, r];
    save(K_ROUTINES, routines);
    set({ routines });
  },
  deleteRoutine: (id) => {
    const routines = get().routines.filter((r) => r.id !== id);
    save(K_ROUTINES, routines);
    set({ routines });
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
}));

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
