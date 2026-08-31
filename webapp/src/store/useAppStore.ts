// Estado reativo — uma store Zustand única espelhando os globais do app
// antigo (index.html:349+). Cada setter escreve através de lib/storage.ts
// (mesmo par load/save de sempre) e atualiza a store, igual ao padrão
// save(K_X, x) + render() do app antigo, só que sem o "+ render()" manual —
// o React re-renderiza sozinho quem lê a fatia que mudou.
import { create } from "zustand";
import { bootStorage, load, save } from "../lib/storage";
import {
  K_COMPROMISSOS,
  K_DIAKANBAN,
  K_DIARIO,
  K_DIGESTSEMANAL,
  K_EXERCICIOS,
  K_FONTSCALE,
  K_GAMIFICACAO,
  K_HISTORY,
  K_HOMEVIEW,
  K_LASTBACKUP,
  K_NOTES,
  K_NUDGE,
  K_NUDGEDAYS,
  K_ROUTINES,
  K_SIDEBARCOLLAPSED,
  K_SNOOZES,
  K_TEMPLATES,
  K_THEME,
  K_WEEKSTART,
} from "../lib/constants";
import { BACKUP_VERSION, mergeById, mergeByIdLoose, mergeDiario, mergeHistory, sanitizeBackup, type BackupPayload } from "../lib/backup";
import { nomeAutoDoc } from "../lib/notes";
import { criarEstadoGamificacaoInicial, localKey } from "../lib/gamificacao";
import { novoDraftSchedule } from "../lib/schedule";
import { novoPlayerState, type PlayerState, type StepActual } from "../lib/player";
import { estornarMeta, sincronizarPontosMeta } from "../lib/metas";
import { areaDaRotina, avancarGamificacaoAteAgora, desfazerConclusao, registrarConclusaoStep, totalPlanejadoSegundos } from "../lib/scoring";
import type { HistoryEntry } from "../lib/history";
import { newTemplateDoc } from "../lib/templates";
import type {
  AnyTemplateDoc,
  AppView,
  Compromisso,
  CountdownDoc,
  DiaKanbanCard,
  DiarioMap,
  GamificacaoConfig,
  GamificacaoState,
  MetaTarget,
  Note,
  RodaArea,
  Routine,
  Tag,
} from "../lib/types";

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
  homeView: "rotinas" | "semana" | "dia";
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
  notes: Note[];
  diaKanban: DiaKanbanCard[];
  compromissos: Compromisso[];
  searchOpen: boolean;
  lastBackupAt: number | null;

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
  setHomeView: (v: "rotinas" | "semana" | "dia") => void;
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

  // Agenda inline da Home (index.html:2114-2161, 12113/12684) — CRUD mínimo
  // de compromisso avulso e cartão do kanban do dia, o suficiente pra
  // itensAgendaDoDia (lib/agenda.ts) ter dado de verdade. Fora do escopo
  // desta fase: reordenar/arrastar cartão entre colunas, notificação de
  // compromisso e o popup completo de edição (abrirPopupTarefa).
  addCompromisso: (title: string, date: string, time: string) => void;
  toggleCompromisso: (id: string) => void;
  deleteCompromisso: (id: string) => void;
  addDiaKanbanCard: (iso: string, text: string, hIni?: string, hFim?: string) => void;
  toggleDiaKanbanCard: (id: string) => void;
  deleteDiaKanbanCard: (id: string) => void;

  // Notas simples (index.html K_NOTES, openNoteEditor/renderNoteEditor).
  openNote: (id: string | null) => void;
  closeNoteEditor: () => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;

  // Modelos genéricos (index.html:6339-6669) — pastas por tipo, um doc por
  // vez. "expense" (registro de gastos) foge desse molde: cada lançamento é
  // a própria "nota", sem tela de doc — ver addExpense/ExpenseFolder.tsx.
  createTemplateDoc: (type: string, folderKind?: "type" | "routine", folderKey?: string) => void;
  updateTemplateDoc: (doc: AnyTemplateDoc) => void;
  deleteTemplateDoc: (id: string) => void;
  // Porta de abrirFormDespesa (index.html:9041-9078) sem o formulário em si
  // (fica no modal da tela) — só o push no array de templates.
  addExpense: (fields: { desc: string; value: number; cat: string; date: string; time?: string }) => void;
  // Import de extrato CSV (index.html:9161-9170) — um save só para o lote.
  addExpenses: (lote: Array<{ desc: string; value: number; cat: string; date: string; time?: string }>) => void;

  // Busca global (index.html:2978-3151) — só estado de aberto/fechado; a
  // varredura em si mora em components/GlobalSearch.tsx (a mesma "receita" do
  // app antigo, sem extrair para lib/ porque depende diretamente das ações
  // da store, igual openGlobalSearch depende dos globais).
  openSearch: () => void;
  closeSearch: () => void;

  // Backup completo (index.html:10769-11005) — export lê TODAS as coleções,
  // inclusive as sem estado próprio no React (snoozes/exercicios, direto do
  // storage), pra não perder dado de quem também usa o app legado no mesmo
  // perfil. Import oferece mesclar ou substituir tudo.
  backupSnapshot: () => BackupPayload;
  markBackupExported: () => void;
  importBackup: (data: BackupPayload, mode: "merge" | "replace") => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  view: { tab: "home", screen: "home" },
  routines: [],
  theme: "auto",
  fontScale: 1,
  weekStart: 0,
  homeView: "rotinas",
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
  notes: [],
  diaKanban: [],
  compromissos: [],
  searchOpen: false,
  lastBackupAt: null,

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
      homeView: load<"rotinas" | "semana" | "dia">(K_HOMEVIEW, "rotinas"),
      digestSemanal: load<boolean>(K_DIGESTSEMANAL, true),
      nudge: load<boolean>(K_NUDGE, true),
      nudgeDias: load<number[]>(K_NUDGEDAYS, [5]),
      sidebarCollapsed: load<boolean>(K_SIDEBARCOLLAPSED, false),
      gam,
      templates: load<AnyTemplateDoc[]>(K_TEMPLATES, []),
      diario: load<DiarioMap>(K_DIARIO, {}),
      history: load<HistoryEntry[]>(K_HISTORY, []),
      notes: load<Note[]>(K_NOTES, []),
      diaKanban: load<DiaKanbanCard[]>(K_DIAKANBAN, []),
      compromissos: load<Compromisso[]>(K_COMPROMISSOS, []),
      lastBackupAt: load<number | null>(K_LASTBACKUP, null),
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
  setHomeView: (homeView) => {
    save(K_HOMEVIEW, homeView);
    set({ homeView });
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
  // (diarioChave). Só o texto simples nesta fase.
  setDiarioTexto: (chave, texto) => {
    const diario = { ...get().diario, [chave]: texto };
    save(K_DIARIO, diario);
    set({ diario });
  },

  addCompromisso: (title, date, time) => {
    const t = title.trim();
    if (!t) return;
    const compromissos = [...get().compromissos, { id: uid(), title: t, date, time, notify: "nenhuma" as const, createdAt: Date.now() }];
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
  },
  toggleCompromisso: (id) => {
    const compromissos = get().compromissos.map((c) => (c.id === id ? { ...c, feito: !c.feito } : c));
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
  },
  deleteCompromisso: (id) => {
    const compromissos = get().compromissos.filter((c) => c.id !== id);
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
  },

  addDiaKanbanCard: (iso, text, hIni, hFim) => {
    const t = text.trim();
    if (!t) return;
    const per = "dia:" + iso;
    const ord = get().diaKanban.filter((c) => c.per === per).length;
    const diaKanban = [...get().diaKanban, { id: uid(), text: t, col: "todo" as const, per, ord, hIni, hFim }];
    save(K_DIAKANBAN, diaKanban);
    set({ diaKanban });
  },
  toggleDiaKanbanCard: (id) => {
    const diaKanban = get().diaKanban.map((c) => (c.id === id ? { ...c, col: c.col === "done" ? ("todo" as const) : ("done" as const) } : c));
    save(K_DIAKANBAN, diaKanban);
    set({ diaKanban });
  },
  deleteDiaKanbanCard: (id) => {
    const diaKanban = get().diaKanban.filter((c) => c.id !== id);
    save(K_DIAKANBAN, diaKanban);
    set({ diaKanban });
  },

  // Notas simples (index.html:9685-9847, 11038-11137). Sem editor contínuo
  // (live preview), backlinks nem sinkChecked ainda — textarea simples.
  openNote: (id) => {
    if (id) {
      set({ view: { tab: "templates", screen: "noteEditor", id } });
      return;
    }
    const nota: Note = { id: uid(), title: nomeAutoDoc(), content: "", subjects: [], createdAt: Date.now(), updatedAt: Date.now() };
    const notes = [...get().notes, nota];
    save(K_NOTES, notes);
    set({ notes, view: { tab: "templates", screen: "noteEditor", id: nota.id } });
  },
  closeNoteEditor: () => set({ view: { tab: "templates", screen: "notes" } }),
  updateNote: (id, patch) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
    save(K_NOTES, notes);
    set({ notes });
  },
  toggleNotePinned: (id) => {
    const notes = get().notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    save(K_NOTES, notes);
    set({ notes });
  },
  deleteNote: (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    save(K_NOTES, notes);
    set({ notes });
  },

  createTemplateDoc: (type, folderKind, folderKey) => {
    const doc = newTemplateDoc(type);
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates, view: { tab: "templates", screen: "templateDoc", id: doc.id, folderKind, folderKey } });
  },
  updateTemplateDoc: (doc) => {
    const docNovo = { ...doc, updatedAt: Date.now() };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  deleteTemplateDoc: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  addExpense: (fields) => {
    const now = Date.now();
    const doc = { id: uid(), type: "expense" as const, ...fields, createdAt: now, updatedAt: now };
    const templates = [...get().templates, doc];
    save(K_TEMPLATES, templates);
    set({ templates });
  },
  addExpenses: (lote) => {
    const now = Date.now();
    const docs = lote.map((fields) => ({ id: uid(), type: "expense" as const, ...fields, createdAt: now, updatedAt: now }));
    const templates = [...get().templates, ...docs];
    save(K_TEMPLATES, templates);
    set({ templates });
  },

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  backupSnapshot: () => {
    const s = get();
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      routines: s.routines,
      notes: s.notes,
      history: s.history,
      templates: s.templates,
      diario: s.diario,
      diaKanban: s.diaKanban,
      compromissos: s.compromissos,
      // sem estado no React — load() já devolve o que estiver no storage,
      // inclusive dado gravado pelo app legado no mesmo perfil.
      snoozes: load<unknown[]>(K_SNOOZES, []),
      exercicios: load<unknown[]>(K_EXERCICIOS, []),
    };
  },
  markBackupExported: () => {
    const ts = Date.now();
    save(K_LASTBACKUP, ts);
    set({ lastBackupAt: ts });
  },
  importBackup: (dataRaw, mode) => {
    const data = sanitizeBackup(dataRaw);
    const s = get();
    if (mode === "replace") {
      const routines = Array.isArray(data.routines) ? (data.routines as Routine[]) : s.routines;
      const notes = Array.isArray(data.notes) ? (data.notes as Note[]) : s.notes;
      const history = Array.isArray(data.history) ? (data.history as HistoryEntry[]) : s.history;
      const templates = Array.isArray(data.templates) ? (data.templates as AnyTemplateDoc[]) : s.templates;
      const diario = data.diario && typeof data.diario === "object" ? data.diario : s.diario;
      const diaKanban = Array.isArray(data.diaKanban) ? (data.diaKanban as DiaKanbanCard[]) : s.diaKanban;
      const compromissos = Array.isArray(data.compromissos) ? (data.compromissos as Compromisso[]) : s.compromissos;
      save(K_ROUTINES, routines);
      save(K_NOTES, notes);
      save(K_HISTORY, history);
      save(K_TEMPLATES, templates);
      save(K_DIARIO, diario);
      save(K_DIAKANBAN, diaKanban);
      save(K_COMPROMISSOS, compromissos);
      if (Array.isArray(data.snoozes)) save(K_SNOOZES, data.snoozes);
      if (Array.isArray(data.exercicios)) save(K_EXERCICIOS, data.exercicios);
      set({ routines, notes, history, templates, diario, diaKanban, compromissos });
      return;
    }
    const routines = mergeById(s.routines, data.routines as Routine[] | undefined);
    const notes = mergeById(s.notes, data.notes as Note[] | undefined);
    const templates = mergeById(s.templates, data.templates as AnyTemplateDoc[] | undefined);
    const history = mergeHistory(s.history, data.history as HistoryEntry[] | undefined);
    const diario = mergeDiario(s.diario, data.diario);
    const diaKanban = mergeByIdLoose(s.diaKanban, data.diaKanban as DiaKanbanCard[] | undefined);
    const compromissos = mergeByIdLoose(s.compromissos, data.compromissos as Compromisso[] | undefined);
    save(K_ROUTINES, routines);
    save(K_NOTES, notes);
    save(K_HISTORY, history);
    save(K_TEMPLATES, templates);
    save(K_DIARIO, diario);
    save(K_DIAKANBAN, diaKanban);
    save(K_COMPROMISSOS, compromissos);
    if (Array.isArray(data.snoozes) && data.snoozes.length) {
      save(K_SNOOZES, mergeByIdLoose(load<Array<{ id?: unknown }>>(K_SNOOZES, []), data.snoozes as Array<{ id?: unknown }>));
    }
    if (Array.isArray(data.exercicios) && data.exercicios.length) {
      save(K_EXERCICIOS, mergeByIdLoose(load<Array<{ id?: unknown }>>(K_EXERCICIOS, []), data.exercicios as Array<{ id?: unknown }>));
    }
    set({ routines, notes, history, templates, diario, diaKanban, compromissos });
  },
}));

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
