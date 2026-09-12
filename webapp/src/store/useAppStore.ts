// Estado reativo — uma store Zustand única espelhando os globais do app
// antigo (index.html:349+). Cada setter escreve através de lib/storage.ts
// (mesmo par load/save de sempre) e atualiza a store, igual ao padrão
// save(K_X, x) + render() do app antigo, só que sem o "+ render()" manual —
// o React re-renderiza sozinho quem lê a fatia que mudou.
import { create } from "zustand";
import { uid } from "../lib/uid";
import { createNotesSlice } from "./slices/notesSlice";
import { createPlayerSlice } from "./slices/playerSlice";
import { createMetasSlice } from "./slices/metasSlice";
import { createAgendaSlice } from "./slices/agendaSlice";
import { createBackupSlice } from "./slices/backupSlice";
import {
  algumSnoozeAtivo,
  autoBackupNative,
  novoDraft,
  pedirPermissaoNotificacao,
  recorrentesAtuais,
  syncCompromissoNotifications,
  syncMetaRecNotifications,
  syncRoutineNotifications,
} from "./shared";

// Re-exportado por compatibilidade com quem importava daqui antes da
// extração para store/shared.ts.
export { recorrentesAtuais };
import { bootStorage, load, save } from "../lib/storage";
import { getTimerOverlayBridge, overlayHide } from "../lib/nativeBridge";
import { ensureTimerAlertChannels, notifyDigestSemanal } from "../lib/notifications";
import { marcarSemanaVista as marcarSemanaVistaLib } from "../lib/semanaFechada";
import { BADGE_COR, BADGE_NOME, K_HORASBUDGET, K_NAOFEITAS } from "../lib/constants";
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
  K_NUDGEMETAS,
  K_NUDGESTREAK,
  K_SOMMODO,
  K_VIBRAR,
  K_CRONOMODO,
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
  type BackupPayload,
} from "../lib/backup";
import { criarEstadoGamificacaoInicial, localKey } from "../lib/gamificacao";
import type { MatrixPreset } from "../lib/templates";
import { novoDraftSchedule } from "../lib/schedule";
import {
  podarNaoFeitasDeOutrosDias,
  type NaoFeitasMap,
  type PlayerState,
} from "../lib/player";
import type { SomModo } from "../lib/sound";
import { checarNudges } from "../lib/nudge";
import { checkStorageWarning } from "../lib/storageWarning";
import {
  loadMetasSubviewSel,
  type MetasSubview,
} from "../lib/metas";
import {
  avancarGamificacaoAteAgora,
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

type Theme = "auto" | "light" | "dark";

/** Superfície do cronômetro fora do app (Android). Ver `cronometroModo`. */
export type CronometroModo = "off" | "barra" | "bolha";

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
  nudgeMetas: boolean;
  nudgeStreak: boolean;
  somModo: SomModo;
  vibracao: boolean;
  /** Onde o cronômetro aparece fora do app (Android, K_CRONOMODO) — local-only,
   * nunca em backup. "off" = em lugar nenhum; "barra" = só a notificação em
   * primeiro plano com chronometer, na barra de status/lock screen (como o
   * timer do relógio da Samsung); "bolha" = a notificação mais a janelinha
   * flutuante sobre outros apps, que exige permissão de sobreposição.
   * Migrado do booleano K_OVERLAY (true = "bolha"). */
  cronometroModo: CronometroModo;
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
  setNudgeMetas: (v: boolean) => void;
  setNudgeStreak: (v: boolean) => void;
  setSomModo: (m: SomModo) => void;
  setVibracao: (v: boolean) => void;
  checarNudgesAgora: () => void;
  /** Resolve `false` sem persistir se a permissão necessária ao modo for negada
   * (sobreposição para "bolha", notificações para "barra"). */
  setCronometroModo: (m: CronometroModo) => Promise<boolean>;
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
  addMeta: (dados: Partial<MetaTarget> & { title: string; date: string }) => void;
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
  ...createPlayerSlice(set, get, api),
  ...createMetasSlice(set, get, api),
  ...createAgendaSlice(set, get, api),
  ...createBackupSlice(set, get, api),
  booted: false,
  view: { tab: "home", screen: "home" },
  routines: [],
  theme: "auto",
  fontScale: 1,
  weekStart: 0,
  homeView: "semana",
  soHoje: false,
  digestSemanal: true,
  nudge: true,
  nudgeMetas: true,
  nudgeStreak: true,
  somModo: "suave",
  vibracao: true,
  cronometroModo: "off",
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
      homeView: load<"rotinas" | "semana" | "dia">(K_HOMEVIEW, "semana"),
      soHoje: load<boolean>(K_SOHOJE, false),
      digestSemanal: load<boolean>(K_DIGESTSEMANAL, true),
      nudge: load<boolean>(K_NUDGE, true),
      nudgeMetas: load<boolean>(K_NUDGEMETAS, true),
      nudgeStreak: load<boolean>(K_NUDGESTREAK, true),
      somModo: load<SomModo>(K_SOMMODO, "suave"),
      vibracao: load<boolean>(K_VIBRAR, true),
      cronometroModo: load<CronometroModo>(K_CRONOMODO, load<boolean>(K_OVERLAY, false) ? "bolha" : "off"),
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
    // Canais Android do alerta de fim de etapa em segundo plano
    // (index.html:2687-2692) — idempotente, criado a cada boot como no legado.
    void ensureTimerAlertChannels();
    // Aviso de volume de dados (index.html:3767, checkStorageWarning) — o app
    // é local-first, estourar a cota é perda silenciosa.
    const avisoStorage = checkStorageWarning();
    if (avisoStorage) setTimeout(() => get().showAlertBanner(avisoStorage), 1200);
    // Avisos proativos (ritmo/metas/streak) — ver checarNudgesAgora.
    setTimeout(() => get().checarNudgesAgora(), 1500);
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
  setNudgeMetas: (nudgeMetas) => {
    save(K_NUDGEMETAS, nudgeMetas);
    set({ nudgeMetas });
  },
  setNudgeStreak: (nudgeStreak) => {
    save(K_NUDGESTREAK, nudgeStreak);
    set({ nudgeStreak });
  },
  setSomModo: (somModo) => {
    save(K_SOMMODO, somModo);
    set({ somModo });
  },
  setVibracao: (vibracao) => {
    save(K_VIBRAR, vibracao);
    set({ vibracao });
  },
  /* Ponto único do motor de nudge (lib/nudge.ts): chamado no boot e na volta
     do app ao primeiro plano — cada aviso tem sua marca de "já avisei hoje",
     então chamar em excesso não duplica nada. */
  checarNudgesAgora: () => {
    const st = get();
    if (!st.booted) return;
    checarNudges({
      routines: st.routines,
      history: st.history,
      gam: st.gam,
      metas: st.metaDoc().targets || [],
      weekStart: st.weekStart,
      onBanner: (texto) => get().showAlertBanner(texto),
    });
  },
  setCronometroModo: async (m) => {
    if (m === "bolha") {
      // só a bolha desenha por cima de outros apps; a notificação da barra não
      const p = getTimerOverlayBridge();
      if (!p) return false;
      try {
        const r = await p.requestPermission();
        if (!r?.granted) return false;
      } catch {
        return false;
      }
    } else if (m === "barra") {
      // Android 13+ exige POST_NOTIFICATIONS até para a notificação do serviço
      // em primeiro plano; sem ela o cronômetro rodaria invisível.
      if (!(await pedirPermissaoNotificacao())) return false;
      overlayHide(); // derruba uma bolha que já estivesse de pé antes da troca
    } else {
      overlayHide();
    }
    save(K_CRONOMODO, m);
    set({ cronometroModo: m });
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

  // Porta de showAlertBanner/showCelebrationBanner/showUndoBanner
  // (index.html:2484-2508, 9963-9977) — o timer de auto-esconder e a
  // animação de saída moram no componente (GlobalBanner.tsx), não aqui; a
  // store só guarda o conteúdo atual.
  showAlertBanner: (text) => set({ banner: { text, celebrate: false } }),
  showCelebrationBanner: (text) => set({ banner: { text, celebrate: true } }),
  showUndoBanner: (text, onUndo) => set({ undoBanner: { text, onUndo } }),
  dismissBanner: () => set({ banner: null }),
  dismissUndoBanner: () => set({ undoBanner: null }),
}));
