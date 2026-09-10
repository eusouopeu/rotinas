// Estado reativo — uma store Zustand única espelhando os globais do app
// antigo (index.html:349+). Cada setter escreve através de lib/storage.ts
// (mesmo par load/save de sempre) e atualiza a store, igual ao padrão
// save(K_X, x) + render() do app antigo, só que sem o "+ render()" manual —
// o React re-renderiza sozinho quem lê a fatia que mudou.
import { create } from "zustand";
import { uid } from "../lib/uid";
import { createNotesSlice } from "./slices/notesSlice";
import { bootStorage, isNative, load, save } from "../lib/storage";
import { getTimerOverlayBridge, overlayHide } from "../lib/nativeBridge";
import { autoBackupsParaApagar, nomeAutoBackup } from "../lib/autoBackup";
import { notifyDigestSemanal, planoNotificacaoCompromissos, planoNotificacaoMetaRec, planoNotificacaoRotinas } from "../lib/notifications";
import { sincronizarPontosCartao, descreditarCartao } from "../lib/scoring";
import { marcarSemanaVista as marcarSemanaVistaLib } from "../lib/semanaFechada";
import { BADGE_COR, BADGE_NOME, K_AUTOBAK, K_DATAFOLDER, K_HORASBUDGET, K_NAOFEITAS } from "../lib/constants";
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
  K_METASSUBVIEWSEL,
  K_NOTES,
  K_NUDGE,
  K_NUDGEDAYS,
  K_OVERLAY,
  K_ROUTINES,
  K_SIDEBARCOLLAPSED,
  K_SNOOZES,
  K_SOHOJE,
  K_TEMPLATES,
  K_THEME,
  K_WEEKSTART,
} from "../lib/constants";
import {
  BACKUP_VERSION,
  mergeById,
  mergeByIdLoose,
  mergeDiario,
  mergeHistory,
  mergeSnoozes,
  prepararModeloImportado,
  prepararRotinaImportada,
  sanitizeBackup,
  type BackupPayload,
} from "../lib/backup";
import { criarEstadoGamificacaoInicial, localKey } from "../lib/gamificacao";
import type { MatrixPreset } from "../lib/templates";
import { novoDraftSchedule } from "../lib/schedule";
import {
  adiarEtapaPlayer,
  freshExState,
  limparNaoFeitaMap,
  marcarNaoFeitaMap,
  moverGrupoPlayer,
  naoFeitasDe,
  novoPlayerState,
  podarNaoFeitasDeOutrosDias,
  type NaoFeitasMap,
  type PlayerState,
  type StepActual,
} from "../lib/player";
import { finishCue, stepTransitionCue } from "../lib/haptics";
import {
  ajustarProgressoMetaRec,
  duplicarMetaRec,
  estornarMeta,
  loadMetasSubviewSel,
  metaRecExcesso,
  metaRecFeitas,
  sincronizarPontosMeta,
  toggleMetasSubview,
  type MetasSubview,
} from "../lib/metas";
import {
  areaDaRotina,
  avancarGamificacaoAteAgora,
  desfazerConclusao,
  estornarPenalidadesMetaRec,
  registrarConclusaoStep,
  sincronizarPenalidadeMetaRec,
  sincronizarPontosMetaRec,
  totalPlanejadoSegundos,
} from "../lib/scoring";
import type { HistoryEntry } from "../lib/history";
import type {
  AnyTemplateDoc,
  AppView,
  Compromisso,
  CountdownDoc,
  DiaKanbanCard,
  DiarioMap,
  Exercicio,
  GamificacaoConfig,
  GamificacaoState,
  MetaRecorrente,
  MetaTarget,
  Note,
  RodaArea,
  Routine,
  Snooze,
  Tag,
} from "../lib/types";

/** Alguma pausa de agenda (K_SNOOZES) cobre o instante `agora`? Porta de
 * agendaSnoozed (index.html:5259-5265). */
function algumSnoozeAtivo(snoozes: Snooze[], agora = Date.now()): boolean {
  return snoozes.some((s) => agora >= s.from && agora <= s.to);
}

function isCountdownDoc(d: AnyTemplateDoc): d is CountdownDoc {
  return d.type === "countdown";
}

/** Lê `recorrentes` do doc de metas mais recente sem criar um doc vazio
 * (diferente de `metaDoc()`, que cria) — usado só para (re)sincronizar
 * notificação, onde nada precisa existir se o usuário não tem metas. */
export function recorrentesAtuais(templates: AnyTemplateDoc[]): MetaRecorrente[] {
  const doc = templates.filter(isCountdownDoc).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  return doc?.recorrentes || [];
}

function criarMetaDoc(): CountdownDoc {
  return {
    id: uid(),
    type: "countdown",
    title: "Metas",
    targets: [],
    recorrentes: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
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
    createdAt: Date.now(),
  };
}

export interface AppState {
  booted: boolean;
  view: AppView;
  routines: Routine[];
  theme: Theme;
  fontScale: number;
  weekStart: number;
  homeView: "rotinas" | "semana" | "dia";
  soHoje: boolean;
  digestSemanal: boolean;
  nudge: boolean;
  /** Bolha do cronômetro sobre outros apps + notificação em primeiro plano
   * com chronometer (Android, K_OVERLAY) — local-only, nunca em backup. */
  overlayCronometro: boolean;
  nudgeDias: number[];
  sidebarCollapsed: boolean;
  horasBudget: number;
  gam: GamificacaoState;
  editorDraft: Routine | null;
  playerState: PlayerState | null;
  naoFeitas: NaoFeitasMap;
  playerBanner: string | null;
  // Toast global (index.html:2484-2508) — topo da tela, texto neutro ou
  // celebração (badge ganho); e undoBanner (index.html:9963-9977) — embaixo,
  // com um botão "Desfazer" que reverte a ação (delete de rotina/nota/doc).
  // Ambos vivem soltos (não presos a uma tela), diferente do playerBanner
  // acima, que só existe dentro do Player.
  banner: { text: string; celebrate: boolean } | null;
  undoBanner: { text: string; onUndo: () => void } | null;
  templates: AnyTemplateDoc[];
  diario: DiarioMap;
  history: HistoryEntry[];
  notes: Note[];
  diaKanban: DiaKanbanCard[];
  compromissos: Compromisso[];
  snoozes: Snooze[];
  exercicios: Exercicio[];
  searchOpen: boolean;
  lastBackupAt: number | null;

  boot: () => Promise<void>;
  goTo: (view: AppView) => void;

  deleteRoutine: (id: string) => void;
  // Porta de deleteRoutineWithUndo (index.html:3863-3872) — mesma remoção,
  // mas com showUndoBanner reinserindo no índice original em vez do confirm()
  // nativo. duplicateRoutine (index.html:3778-3789): cópia com ids novos,
  // "(cópia)" no nome e agendamento sempre desativado.
  deleteRoutineWithUndo: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  deleteHistoryEntry: (ts: number) => void;
  adjustRoutineStep: (routineId: string, stepName: string, newSec: number) => void;

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
  setSoHoje: (v: boolean) => void;
  setDigestSemanal: (v: boolean) => void;
  setNudge: (v: boolean) => void;
  /** Resolve `false` sem persistir se a permissão de sobreposição for negada. */
  setOverlayCronometro: (v: boolean) => Promise<boolean>;
  toggleNudgeDia: (d: number) => void;
  toggleSidebarCollapsed: () => void;
  // Boletim (index.html:13342-13501, ver lib/boletim.ts).
  setHorasBudget: (min: number) => void;
  alternarDispensaSemana: () => void;
  marcarSemanaVista: () => void;
  goToSemanaFechada: () => void;

  updateGamConfig: (patch: Partial<GamificacaoConfig>) => void;
  addRodaArea: (label: string) => void;
  updateRodaArea: (id: string, patch: Partial<RodaArea>) => void;
  removeRodaArea: (id: string) => void;

  startPlayer: (routineId: string) => void;
  togglePause: () => void;
  advanceStep: (skipped?: boolean, naoFeita?: boolean) => void;
  goPrevStep: () => void;
  exitPlayer: () => void;
  // "não fazer" (index.html:11542-11548): encerra sem concluir/pontuar e
  // marca a etapa como pendente do dia — a rotina reabre só com as
  // pendentes (repescagem, ver startPlayer/novoPlayerState).
  naoFazerEtapaAtual: () => void;
  // Adia por BLOCO — troca a etapa atual (+ pausa dela, se houver) de lugar
  // com o bloco seguinte inteiro (index.html:11788-11809).
  adiarEtapaAtual: () => void;
  // Reinicia o cronômetro da etapa atual do zero, sem avançar/concluir nada
  // (index.html:11768-11780).
  reiniciarTimerEtapaAtual: () => void;
  // Painel "Etapas" do player (index.html:11678-11759) — reordena da etapa
  // atual em diante; `gi`/`alvoGi` são índices na lista agrupada (tarefa +
  // pausa dela), não posições cruas no array de steps.
  reordenarEtapasPlayer: (gi: number, alvoGi: number) => void;
  clearPlayerBanner: () => void;
  showAlertBanner: (text: string) => void;
  showCelebrationBanner: (text: string) => void;
  showUndoBanner: (text: string, onUndo: () => void) => void;
  dismissBanner: () => void;
  dismissUndoBanner: () => void;
  // Sub-loop de séries de uma etapa "exercicio" (index.html:11365-11416) —
  // concluir uma série avança pro descanso (ou termina a etapa, na última);
  // "voltar série" desfaz o último registro pra corrigir peso/reps errados.
  concluirSerieExercicio: (reps: number, peso: number) => void;
  pularDescansoExercicio: () => void;
  voltarSerieExercicio: () => void;

  // Biblioteca de exercícios (K_EXERCICIOS, index.html:4207-4214) —
  // reaproveitada pela etapa de rotina "exercicio" (RoutineStep.exercicioId).
  upsertExercicio: (ex: { id?: string; nome: string; grupos: string[]; pesoAtual: number }) => Exercicio;
  deleteExercicio: (id: string) => void;

  metasSubview: MetasSubview[];
  setMetasSubview: (views: MetasSubview[]) => void;
  toggleMetasSubviewState: (view: MetasSubview) => void;

  metaDoc: () => CountdownDoc;
  addMeta: (title: string, date: string) => void;
  updateMeta: (id: string, patch: Partial<MetaTarget>) => void;
  setMetaDone: (id: string, done: number) => void;
  deleteMeta: (id: string) => void;

  addMetaRec: (params: Omit<MetaRecorrente, "id" | "criadoEm" | "progresso">) => void;
  updateMetaRec: (id: string, patch: Partial<MetaRecorrente>) => void;
  ajustarMetaRec: (id: string, delta: number) => void;
  duplicarMetaRec: (id: string) => void;
  deleteMetaRec: (id: string) => void;
  reorderMetaRec: (fromIndex: number, toIndex: number) => void;

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
  // Porta de abrirPopupTarefa#tfSave (index.html:5222-5246), sem o crédito de
  // pontos do cartão (sincronizarPontosCartao ainda não portado — mesma
  // lacuna do toggle). id ausente cria; presente edita.
  upsertDiaKanbanCard: (iso: string, card: { id?: string; text: string; hIni?: string; hFim?: string; tagValor?: Tag; eixo?: string | null }) => void;
  toggleDiaKanbanCard: (id: string) => void;
  deleteDiaKanbanCard: (id: string) => void;

  // Pausa de agenda (K_SNOOZES, index.html:5259-5290, 11023) — porta de
  // agendaSnoozed/abrirSnoozeModal, agora estado reativo (antes era load/save
  // direto do storage em Home.tsx, com "force" manual pra re-renderizar).
  addSnooze: (dias: number) => void;
  resumeAgenda: () => void;

  // Notas simples (index.html K_NOTES, openNoteEditor/renderNoteEditor).
  openNote: (id: string | null) => void;
  closeNoteEditor: () => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;
  // Restaura uma nota removida na posição original (undo de deleteNote,
  // index.html:4880-4885). Não mexe em updatedAt: a nota volta como estava.
  addNoteAt: (idx: number, nota: Note) => void;
  addNote: (title: string, content: string) => Note;

  // Modelos genéricos (index.html:6339-6669) — pastas por tipo, um doc por
  // vez. "expense" (registro de gastos) foge desse molde: cada lançamento é
  // a própria "nota", sem tela de doc — ver addExpense/ExpenseFolder.tsx.
  createTemplateDoc: (type: string, folderKind?: "type" | "routine", folderKey?: string, preset?: MatrixPreset) => void;
  updateTemplateDoc: (doc: AnyTemplateDoc) => void;
  deleteTemplateDoc: (id: string) => void;
  deleteTemplateDocWithUndo: (id: string) => void;
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
  // inclusive snoozes/exercicios (estado reativo, mesmo sem CRUD dedicado
  // para exercícios — ver Exercicio em lib/types.ts). Import oferece
  // mesclar ou substituir tudo.
  backupSnapshot: () => BackupPayload;
  markBackupExported: () => void;
  importBackup: (data: BackupPayload, mode: "merge" | "replace") => void;
  // Import de item avulso (index.html:10921-10944) — devolvem o
  // nome/título final (já com sufixo de colisão) pro aviso na UI.
  importRotinaShare: (routine: Routine) => string;
  importModeloShare: (doc: AnyTemplateDoc) => AnyTemplateDoc;
}

export const useAppStore = create<AppState>((set, get, api) => ({
  ...createNotesSlice(set, get, api),
  booted: false,
  view: { tab: "home", screen: "home" },
  routines: [],
  theme: "auto",
  fontScale: 1,
  weekStart: 0,
  homeView: "rotinas",
  soHoje: false,
  digestSemanal: true,
  nudge: true,
  overlayCronometro: false,
  nudgeDias: [5],
  sidebarCollapsed: false,
  horasBudget: 40,
  gam: criarEstadoGamificacaoInicial(),
  editorDraft: null,
  playerState: null,
  naoFeitas: {},
  playerBanner: null,
  banner: null,
  undoBanner: null,
  templates: [],
  diario: {},
  history: [],
  notes: [],
  diaKanban: [],
  compromissos: [],
  snoozes: [],
  exercicios: [],
  searchOpen: false,
  lastBackupAt: null,
  metasSubview: ["recorrentes"],

  boot: async () => {
    await bootStorage();
    const routines = load<Routine[]>(K_ROUTINES, []);
    let gam = load<GamificacaoState>(K_GAMIFICACAO, null as unknown as GamificacaoState);
    if (!gam) gam = criarEstadoGamificacaoInicial();
    const semanasAntesDoBoot = gam.historico.semanas.length;
    const badgesAntesDoBoot = gam.badges.length;
    // index.html:1462 (!gam.semanaAtual congela) + avancarGamificacaoAteAgora
    // no boot (index.html:14444+) — o app pode ter ficado dias fechado.
    gam = avancarGamificacaoAteAgora(routines, gam);
    save(K_GAMIFICACAO, gam);
    // Porta de semanasFechadasNoBoot + notifyDigestSemanal (index.html:1615,
    // 14469-14471) — avisa só a mais recente se mais de uma semana fechou.
    const semanasFechadasNoBoot = gam.historico.semanas.slice(semanasAntesDoBoot);
    // Badge ganha na virada de semana/mês/etc. no boot (index.html:14469-
    // 14473) — celebra só a mais recente, com a tela já de pé.
    const badgesGanhasNoBoot = gam.badges.slice(badgesAntesDoBoot);
    const hoje = localKey();
    const naoFeitasCarregado = load<NaoFeitasMap>(K_NAOFEITAS, {});
    const naoFeitas = podarNaoFeitasDeOutrosDias(naoFeitasCarregado, hoje);
    if (naoFeitas !== naoFeitasCarregado) save(K_NAOFEITAS, naoFeitas);
    set({
      routines,
      theme: load<Theme>(K_THEME, "auto"),
      fontScale: load<number>(K_FONTSCALE, 1),
      weekStart: load<number>(K_WEEKSTART, 0),
      homeView: load<"rotinas" | "semana" | "dia">(K_HOMEVIEW, "rotinas"),
      soHoje: load<boolean>(K_SOHOJE, false),
      digestSemanal: load<boolean>(K_DIGESTSEMANAL, true),
      nudge: load<boolean>(K_NUDGE, true),
      overlayCronometro: load<boolean>(K_OVERLAY, false),
      nudgeDias: load<number[]>(K_NUDGEDAYS, [5]),
      sidebarCollapsed: load<boolean>(K_SIDEBARCOLLAPSED, false),
      horasBudget: load<number>(K_HORASBUDGET, 40),
      gam,
      templates: load<AnyTemplateDoc[]>(K_TEMPLATES, []),
      diario: load<DiarioMap>(K_DIARIO, {}),
      history: load<HistoryEntry[]>(K_HISTORY, []),
      notes: load<Note[]>(K_NOTES, []),
      diaKanban: load<DiaKanbanCard[]>(K_DIAKANBAN, []),
      compromissos: load<Compromisso[]>(K_COMPROMISSOS, []),
      snoozes: load<Snooze[]>(K_SNOOZES, []),
      exercicios: load<Exercicio[]>(K_EXERCICIOS, []),
      naoFeitas,
      lastBackupAt: load<number | null>(K_LASTBACKUP, null),
      metasSubview: loadMetasSubviewSel(load),
      booted: true,
    });
    autoBackupNative(get());
    const snoozed = algumSnoozeAtivo(get().snoozes);
    syncCompromissoNotifications(get().compromissos, snoozed);
    syncRoutineNotifications(routines, snoozed);
    syncMetaRecNotifications(recorrentesAtuais(get().templates), snoozed);
    if (semanasFechadasNoBoot.length) {
      const sem = semanasFechadasNoBoot[semanasFechadasNoBoot.length - 1];
      // O toque leva pro fechamento de semana (renderSemanaFechada no legado).
      setTimeout(() => notifyDigestSemanal(sem, () => get().goTo({ tab: "home", screen: "semanaFechada" })), 800);
    }
    if (badgesGanhasNoBoot.length) {
      const b = badgesGanhasNoBoot[badgesGanhasNoBoot.length - 1];
      const escLabel: Record<string, string> = { semanal: "da semana", mensal: "do mês", trimestral: "do trimestre", anual: "do ano" };
      setTimeout(
        () => get().showCelebrationBanner(`Badge <b style="color:${BADGE_COR[b.tipo]};">${BADGE_NOME[b.tipo]}</b> ${escLabel[b.escopo] || ""} · nota ${b.nota.toFixed(1)}`),
        500
      );
    }
  },

  goTo: (view) => set({ view }),
  goToSemanaFechada: () => set({ view: { tab: "home", screen: "semanaFechada" } }),

  deleteRoutine: (id) => {
    const routines = get().routines.filter((r) => r.id !== id);
    save(K_ROUTINES, routines);
    set({ routines });
    syncRoutineNotifications(routines, algumSnoozeAtivo(get().snoozes));
  },

  deleteRoutineWithUndo: (id) => {
    const antes = get().routines;
    const idx = antes.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const removida = antes[idx];
    const routines = antes.filter((r) => r.id !== id);
    save(K_ROUTINES, routines);
    set({ routines });
    syncRoutineNotifications(routines, algumSnoozeAtivo(get().snoozes));
    get().showUndoBanner("Rotina excluída", () => {
      const atuais = get().routines;
      const novoIdx = Math.min(idx, atuais.length);
      const restauradas = [...atuais.slice(0, novoIdx), removida, ...atuais.slice(novoIdx)];
      save(K_ROUTINES, restauradas);
      set({ routines: restauradas });
      syncRoutineNotifications(restauradas, algumSnoozeAtivo(get().snoozes));
    });
  },

  duplicateRoutine: (id) => {
    const src = get().routines.find((r) => r.id === id);
    if (!src) return;
    const copia: Routine = {
      ...src,
      id: uid(),
      name: src.name + " (cópia)",
      steps: src.steps.map((s) => ({ ...s, id: uid() })),
      schedule: src.schedule ? { ...src.schedule, enabled: false } : src.schedule,
    };
    const routines = [...get().routines, copia];
    save(K_ROUTINES, routines);
    set({ routines });
  },

  deleteHistoryEntry: (ts) => {
    const history = get().history.filter((h) => h.ts !== ts);
    save(K_HISTORY, history);
    set({ history });
  },

  adjustRoutineStep: (routineId, stepName, newSec) => {
    const routines = get().routines.map((r) => {
      if (r.id !== routineId) return r;
      return {
        ...r,
        steps: r.steps.map((st) => (st.name === stepName && st.type === "timer" ? { ...st, seconds: newSec } : st)),
      };
    });
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
    syncRoutineNotifications(novasRoutines, algumSnoozeAtivo(get().snoozes));
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
  setSoHoje: (soHoje) => {
    save(K_SOHOJE, soHoje);
    set({ soHoje });
  },
  setDigestSemanal: (digestSemanal) => {
    save(K_DIGESTSEMANAL, digestSemanal);
    set({ digestSemanal });
  },
  setNudge: (nudge) => {
    save(K_NUDGE, nudge);
    set({ nudge });
  },
  setOverlayCronometro: async (v) => {
    if (v) {
      const p = getTimerOverlayBridge();
      if (!p) return false;
      try {
        const r = await p.requestPermission();
        if (!r?.granted) return false;
      } catch {
        return false;
      }
    } else {
      overlayHide();
    }
    save(K_OVERLAY, v);
    set({ overlayCronometro: v });
    return true;
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
  setHorasBudget: (min) => {
    const horasBudget = Math.max(1, min);
    save(K_HORASBUDGET, horasBudget);
    set({ horasBudget });
  },
  alternarDispensaSemana: () => {
    const gam = get().gam;
    if (!gam.semanaAtual) return;
    const novo = { ...gam, semanaAtual: { ...gam.semanaAtual, dispensada: !gam.semanaAtual.dispensada } };
    save(K_GAMIFICACAO, novo);
    set({ gam: novo });
  },
  marcarSemanaVista: () => {
    const gam = get().gam;
    const novo = marcarSemanaVistaLib(gam);
    if (novo) {
      set({ gam: { ...novo } });
    }
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
    // Igual ao legado (index.html:14099-14104): a rotina que apontava para a
    // área removida fica sem área DE VERDADE, não só por degradação de leitura
    // em areaDaRotina — senão o id morto voltaria a valer se a área fosse
    // recriada com o mesmo id (import de backup, sync).
    const routines = get().routines.map((r) => (r.eixo === id ? { ...r, eixo: null } : r));
    save(K_GAMIFICACAO, novo);
    save(K_ROUTINES, routines);
    set({ gam: novo, routines });
  },

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

  // Porta de showAlertBanner/showCelebrationBanner/showUndoBanner
  // (index.html:2484-2508, 9963-9977) — o timer de auto-esconder e a
  // animação de saída moram no componente (GlobalBanner.tsx), não aqui; a
  // store só guarda o conteúdo atual.
  showAlertBanner: (text) => set({ banner: { text, celebrate: false } }),
  showCelebrationBanner: (text) => set({ banner: { text, celebrate: true } }),
  showUndoBanner: (text, onUndo) => set({ undoBanner: { text, onUndo } }),
  dismissBanner: () => set({ banner: null }),
  dismissUndoBanner: () => set({ undoBanner: null }),
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
      const rest = routine?.restSeconds || 120;
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
          plannedSec: totalPlanejadoSegundos(routine),
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
        ex: { setIdx: p.ex.setIdx + 1, phase: "rest", results, restEndTs: Date.now() + (routine?.restSeconds || 120) * 1000 },
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
    if (!p || !p.ex || !p.ex.results.length) return;
    const results = p.ex.results.slice(0, -1);
    set({ playerState: { ...p, ex: { setIdx: Math.max(0, p.ex.setIdx - 1), phase: "set", results, restEndTs: null } } });
  },

  upsertExercicio: (ex) => {
    const nome = ex.nome.trim();
    const pesoAtual = Math.max(0, ex.pesoAtual || 0);
    let saved: Exercicio;
    let exercicios: Exercicio[];
    if (ex.id) {
      saved = { id: ex.id, nome, grupos: ex.grupos, pesoAtual };
      exercicios = get().exercicios.map((e) => (e.id === ex.id ? saved : e));
    } else {
      saved = { id: uid(), nome, grupos: ex.grupos, pesoAtual };
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

  setMetasSubview: (metasSubview) => {
    save(K_METASSUBVIEWSEL, metasSubview);
    set({ metasSubview });
  },
  toggleMetasSubviewState: (view) => {
    const metasSubview = toggleMetasSubview(get().metasSubview, view);
    save(K_METASSUBVIEWSEL, metasSubview);
    set({ metasSubview });
  },

  // Metas (index.html:6403-6408, 8391+) — Prazos e Recorrentes (ver
  // lib/metas.ts). `metaDoc()` acha-ou-cria o doc "countdown" dentro de
  // `templates`, igual getOrCreateCountdownDoc, sem tocar nos outros tipos.
  metaDoc: () => {
    const existente = get()
      .templates.filter(isCountdownDoc)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (existente) {
      if (!existente.targets) existente.targets = [];
      if (!existente.recorrentes) existente.recorrentes = [];
      return existente;
    }
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

  addMetaRec: (params) => {
    const titulo = params.titulo.trim();
    if (!titulo) return;
    const doc = get().metaDoc();
    const nova: MetaRecorrente = {
      id: uid(),
      titulo,
      tipo: params.tipo,
      vezes: Math.max(1, params.vezes || 1),
      area: params.area || null,
      notif: params.notif || null,
      negativa: !!params.negativa,
      pontua: !!params.pontua,
      tagValor: params.tagValor || "medio",
      criadoEm: Date.now(),
      progresso: null,
    };
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: [...(doc.recorrentes || []), nova],
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  updateMetaRec: (id, patch) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const excessoAntes = alvo.negativa ? metaRecExcesso(alvo) : 0;
    const feitasAntes = !alvo.negativa && alvo.pontua ? metaRecFeitas(alvo) : 0;

    let atualizado: MetaRecorrente = { ...alvo, ...patch };
    if (patch.vezes != null) atualizado.vezes = Math.max(1, patch.vezes);
    let gam = get().gam;
    const excessoDepois = atualizado.negativa ? metaRecExcesso(atualizado) : 0;
    gam = sincronizarPenalidadeMetaRec(gam, atualizado, excessoAntes, excessoDepois, new Date(), get().routines);
    const feitasDepois = !atualizado.negativa && atualizado.pontua ? metaRecFeitas(atualizado) : 0;
    gam = sincronizarPontosMetaRec(gam, atualizado, feitasAntes, feitasDepois, new Date(), get().routines);

    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).map((r) => (r.id === id ? atualizado : r)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  ajustarMetaRec: (id, delta) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const { rec: atualizado, excessoAntes, excessoDepois, feitasAntes, feitasDepois } = ajustarProgressoMetaRec(alvo, delta);
    let gam = get().gam;
    if (atualizado.negativa) {
      gam = sincronizarPenalidadeMetaRec(gam, atualizado, excessoAntes, excessoDepois, new Date(), get().routines);
    }
    if (!atualizado.negativa && atualizado.pontua) {
      gam = sincronizarPontosMetaRec(gam, atualizado, feitasAntes, feitasDepois, new Date(), get().routines);
    }
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).map((r) => (r.id === id ? atualizado : r)),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
  },
  duplicarMetaRec: (id) => {
    const doc = get().metaDoc();
    const docNovo = duplicarMetaRec(doc, id, uid);
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  deleteMetaRec: (id) => {
    const doc = get().metaDoc();
    const alvo = (doc.recorrentes || []).find((r) => r.id === id);
    if (!alvo) return;
    const gam = estornarPenalidadesMetaRec(get().gam, id);
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes: (doc.recorrentes || []).filter((r) => r.id !== id),
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    save(K_GAMIFICACAO, gam);
    set({ templates, gam });
    syncMetaRecNotifications(docNovo.recorrentes || [], algumSnoozeAtivo(get().snoozes));
  },
  reorderMetaRec: (fromIndex, toIndex) => {
    const doc = get().metaDoc();
    const recorrentes = [...(doc.recorrentes || [])];
    if (fromIndex < 0 || fromIndex >= recorrentes.length || toIndex < 0 || toIndex >= recorrentes.length) return;
    const [moved] = recorrentes.splice(fromIndex, 1);
    recorrentes.splice(toIndex, 0, moved);
    const docNovo: CountdownDoc = {
      ...doc,
      recorrentes,
      updatedAt: Date.now(),
    };
    const templates = get().templates.map((t) => (t.id === doc.id ? docNovo : t));
    save(K_TEMPLATES, templates);
    set({ templates });
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
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },
  toggleCompromisso: (id) => {
    const compromissos = get().compromissos.map((c) => (c.id === id ? { ...c, feito: !c.feito } : c));
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },
  deleteCompromisso: (id) => {
    const compromissos = get().compromissos.filter((c) => c.id !== id);
    save(K_COMPROMISSOS, compromissos);
    set({ compromissos });
    syncCompromissoNotifications(compromissos, algumSnoozeAtivo(get().snoozes));
  },

  addSnooze: (dias) => {
    const from = Date.now();
    const snoozes = [...get().snoozes, { from, to: from + dias * 86400000 }];
    save(K_SNOOZES, snoozes);
    set({ snoozes });
    const snoozed = algumSnoozeAtivo(snoozes);
    syncCompromissoNotifications(get().compromissos, snoozed);
    syncRoutineNotifications(get().routines, snoozed);
    syncMetaRecNotifications(recorrentesAtuais(get().templates), snoozed);
  },
  resumeAgenda: () => {
    const agora = Date.now();
    const snoozes = get().snoozes.filter((s) => !(agora >= s.from && agora <= s.to));
    save(K_SNOOZES, snoozes);
    set({ snoozes });
    syncCompromissoNotifications(get().compromissos, false);
    syncRoutineNotifications(get().routines, false);
    syncMetaRecNotifications(recorrentesAtuais(get().templates), false);
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
  upsertDiaKanbanCard: (iso, card) => {
    const per = "dia:" + iso;
    const text = card.text.trim();
    if (!text) return;
    // fim sem início não descreve nada; fim antes do início é engano
    const hIni = card.hIni || "";
    const hFim = hIni && card.hFim && card.hFim > hIni ? card.hFim : "";
    let gam = get().gam;
    let diaKanban;
    if (card.id) {
      const existente = get().diaKanban.find((c) => c.id === card.id);
      let alvo: DiaKanbanCard | null = existente ? { ...existente, text, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null } : null;
      // cartão já concluído que muda de peso/área precisa estornar antes: o
      // crédito antigo foi calculado com os valores velhos (index.html:5229-5235)
      const mudouPeso = existente && existente.col === "done" && (existente.tagValor !== card.tagValor || (existente.eixo ?? null) !== (card.eixo ?? null));
      if (mudouPeso && existente) {
        const desc = descreditarCartao(gam, existente);
        gam = desc.gam;
        alvo = { ...desc.card, text, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null };
      }
      if (alvo) {
        const sinc = sincronizarPontosCartao(gam, alvo);
        gam = sinc.gam;
        alvo = sinc.card;
      }
      diaKanban = get().diaKanban.map((c) => (c.id === card.id ? (alvo as DiaKanbanCard) : c));
    } else {
      const ord = get().diaKanban.filter((c) => c.per === per).length;
      diaKanban = [...get().diaKanban, { id: uid(), text, col: "todo" as const, per, ord, hIni, hFim, tagValor: card.tagValor, eixo: card.eixo ?? null }];
    }
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },
  toggleDiaKanbanCard: (id) => {
    const card = get().diaKanban.find((c) => c.id === id);
    if (!card) return;
    const toggled = { ...card, col: card.col === "done" ? ("todo" as const) : ("done" as const) };
    const { gam, card: novoCard } = sincronizarPontosCartao(get().gam, toggled);
    const diaKanban = get().diaKanban.map((c) => (c.id === id ? novoCard : c));
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },
  deleteDiaKanbanCard: (id) => {
    const card = get().diaKanban.find((c) => c.id === id);
    const gam = card ? descreditarCartao(get().gam, card).gam : get().gam;
    const diaKanban = get().diaKanban.filter((c) => c.id !== id);
    save(K_DIAKANBAN, diaKanban);
    save(K_GAMIFICACAO, gam);
    set({ diaKanban, gam });
  },

  // Notas simples (index.html:9685-9847, 11038-11137). Sem editor contínuo
  // (live preview), backlinks nem sinkChecked ainda — textarea simples.
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
      snoozes: s.snoozes,
      exercicios: s.exercicios,
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
      const snoozes = Array.isArray(data.snoozes) ? (data.snoozes as Snooze[]) : s.snoozes;
      const exercicios = Array.isArray(data.exercicios) ? (data.exercicios as Exercicio[]) : s.exercicios;
      save(K_ROUTINES, routines);
      save(K_NOTES, notes);
      save(K_HISTORY, history);
      save(K_TEMPLATES, templates);
      save(K_DIARIO, diario);
      save(K_DIAKANBAN, diaKanban);
      save(K_COMPROMISSOS, compromissos);
      save(K_SNOOZES, snoozes);
      save(K_EXERCICIOS, exercicios);
      set({ routines, notes, history, templates, diario, diaKanban, compromissos, snoozes, exercicios });
      const snoozed = algumSnoozeAtivo(snoozes);
      syncCompromissoNotifications(compromissos, snoozed);
      syncRoutineNotifications(routines, snoozed);
      syncMetaRecNotifications(recorrentesAtuais(templates), snoozed);
      return;
    }
    const routines = mergeById(s.routines, data.routines as Routine[] | undefined);
    const notes = mergeById(s.notes, data.notes as Note[] | undefined);
    const templates = mergeById(s.templates, data.templates as AnyTemplateDoc[] | undefined);
    const history = mergeHistory(s.history, data.history as HistoryEntry[] | undefined);
    const diario = mergeDiario(s.diario, data.diario);
    const diaKanban = mergeByIdLoose(s.diaKanban, data.diaKanban as DiaKanbanCard[] | undefined);
    const compromissos = mergeByIdLoose(s.compromissos, data.compromissos as Compromisso[] | undefined);
    const snoozes = mergeSnoozes(s.snoozes, data.snoozes as Snooze[] | undefined);
    const exercicios = mergeByIdLoose(s.exercicios, data.exercicios as Exercicio[] | undefined);
    save(K_ROUTINES, routines);
    save(K_NOTES, notes);
    save(K_HISTORY, history);
    save(K_TEMPLATES, templates);
    save(K_DIARIO, diario);
    save(K_DIAKANBAN, diaKanban);
    save(K_COMPROMISSOS, compromissos);
    save(K_SNOOZES, snoozes);
    save(K_EXERCICIOS, exercicios);
    set({ routines, notes, history, templates, diario, diaKanban, compromissos, snoozes, exercicios });
    const snoozed = algumSnoozeAtivo(snoozes);
    syncCompromissoNotifications(compromissos, snoozed);
    syncRoutineNotifications(routines, snoozed);
    syncMetaRecNotifications(recorrentesAtuais(templates), snoozed);
  },

  importRotinaShare: (routine) => {
    const r = prepararRotinaImportada(routine, get().routines, uid);
    const routines = [...get().routines, r];
    save(K_ROUTINES, routines);
    set({ routines });
    syncRoutineNotifications(routines, algumSnoozeAtivo(get().snoozes));
    return r.name;
  },
  importModeloShare: (doc) => {
    const d = prepararModeloImportado(doc, get().templates, uid);
    const templates = [...get().templates, d];
    save(K_TEMPLATES, templates);
    set({ templates });
    return d;
  },
}));

/** Porta de autoBackupNative (index.html:10785-10800) — sem-op fora do
 * Android/Capacitor (mesmo status de SyncCard/McpCard: fiel ao legado, mas
 * inerte até o build React ser o que roda lá). A cada 3 dias grava um JSON
 * em Documentos/<pasta>/Backups e mantém só os 5 mais recentes. */
async function autoBackupNative(state: AppState): Promise<void> {
  if (!isNative || !window.Capacitor) return;
  if (state.routines.length + state.notes.length + state.templates.length === 0) return;
  if (Date.now() - load(K_AUTOBAK, 0) < 3 * 86400000) return;
  const FS = window.Capacitor.Plugins.Filesystem;
  const pasta = load(K_DATAFOLDER, "Rotinas") + "/Backups";
  try {
    const filename = nomeAutoBackup(localKey(new Date()));
    await FS.writeFile({
      path: pasta + "/" + filename,
      directory: "DOCUMENTS",
      encoding: "utf8",
      data: JSON.stringify(state.backupSnapshot(), null, 2),
      recursive: true,
    });
    save(K_AUTOBAK, Date.now());
    const r = await FS.readdir({ path: pasta, directory: "DOCUMENTS" });
    const nomes = (r.files || []).map((f) => (typeof f === "string" ? f : f.name));
    for (const old of autoBackupsParaApagar(nomes)) {
      try {
        await FS.deleteFile({ path: pasta + "/" + old, directory: "DOCUMENTS" });
      } catch {
        /* ok deixar órfão */
      }
    }
  } catch (e) {
    console.error("Auto-backup falhou:", e);
  }
}

/** Porta de syncNativeSchedules para compromissos avulsos (index.html:2779-
 * 2865, ver lib/notifications.ts). Mesmo status de autoBackupNative: fiel ao
 * legado, inerte fora do Android/Capacitor. Reagenda do zero a cada
 * chamada — cancela as próprias notificações antigas (tag "sched-cp") antes
 * de recriar. */
async function syncCompromissoNotifications(compromissos: Compromisso[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-cp");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return; // agenda pausada: nada é reagendado até o próximo uso do app
    const plano = planoNotificacaoCompromissos(compromissos, Date.now());
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-cp" },
        schedule: { at: new Date(p.when), allowWhileIdle: true },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de compromisso falhou:", e);
  }
}

/** Porta de syncNativeSchedules para rotinas agendadas (index.html:2779-
 * 2828, ver lib/notifications.ts) — mesmo padrão de syncCompromissoNotifications,
 * tag própria ("sched-rt") pra cancelar/recriar sem mexer nas notificações
 * de compromisso. */
async function syncRoutineNotifications(routines: Routine[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-rt");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return;
    const plano = planoNotificacaoRotinas(routines, Date.now());
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-rt" },
        schedule: p.at != null ? { at: new Date(p.at), allowWhileIdle: true } : { on: { weekday: p.weekday, hour: p.hour!, minute: p.minute! } },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de rotina falhou:", e);
  }
}

/** Porta do trecho de metas recorrentes de syncNativeSchedules
 * (index.html:2866-2883, ver lib/notifications.ts) — mesmo padrão das duas
 * funções acima, tag própria ("sched-mr"). Cada alarme usa `schedule.on`
 * só com hour/minute (sem weekday), repetindo todo dia. */
async function syncMetaRecNotifications(recorrentes: MetaRecorrente[], snoozed: boolean): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === "sched-mr");
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (snoozed) return;
    const plano = planoNotificacaoMetaRec(recorrentes);
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        extra: { brita: "sched-mr" },
        schedule: { on: { hour: p.hour, minute: p.minute } },
      })),
    });
  } catch (e) {
    console.error("Sincronização de notificação de meta recorrente falhou:", e);
  }
}
