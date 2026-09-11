// Slice de backup e importação — snapshot de todas as coleções, import em
// modo merge/replace e import de item avulso (rotina/modelo compartilhado).
// Extraído de useAppStore.ts em 11/09/2026 (recomendação 5 de
// docs/react-migration.md). Toda coleção nova precisa aparecer em
// backupSnapshot() E ter chave em SYNCED_KEYS — ver docs/sync.md e a 4ª
// invariante de test/sync-keys.cjs, que lê justamente este arquivo.
import type { StateCreator } from "zustand";
import { uid } from "../../lib/uid";
import {
  algumSnoozeAtivo,
  recorrentesAtuais,
  syncCompromissoNotifications,
  syncMetaRecNotifications,
  syncRoutineNotifications,
} from "../shared";

import { save } from "../../lib/storage";
import {
  K_COMPROMISSOS,
  K_DIAKANBAN,
  K_DIARIO,
  K_EXERCICIOS,
  K_HISTORY,
  K_LASTBACKUP,
  K_NOTES,
  K_ROUTINES,
  K_SNOOZES,
  K_TEMPLATES,
} from "../../lib/constants";
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
} from "../../lib/backup";
import type { HistoryEntry } from "../../lib/history";
import type {
  AnyTemplateDoc,
  Compromisso,
  DiaKanbanCard,
  Exercicio,
  Note,
  Routine,
  Snooze,
} from "../../lib/types";
import type { AppState } from "../useAppStore";

export type BackupSlice = Pick<
  AppState,
  | "backupSnapshot"
  | "markBackupExported"
  | "importBackup"
  | "importRotinaShare"
  | "importModeloShare"
>;

export const createBackupSlice: StateCreator<AppState, [], [], BackupSlice> = (set, get) => ({
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
});
