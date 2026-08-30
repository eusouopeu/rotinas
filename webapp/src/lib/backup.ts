// Porta de backupData/exportBackup/importBackup/oferecerImportarBackup
// (index.html:10769-11005) — só o backup completo em JSON (mesclar ou
// substituir tudo). Fora do escopo: import de item avulso ("rotina-share"/
// "modelo-share", formato diferente, ver CLAUDE.md > "webapp/"), backup
// automático em arquivo (File System Access API, exige gesto do usuário
// salvo antes) e a cópia automática nativa (Capacitor).
import type { HistoryEntry } from "./history";
import type { DiarioMap } from "./types";

export const BACKUP_VERSION = 8;

// Mesmas 9 coleções de backupData — diaKanban/exercicios/compromissos/
// snoozes não têm estado no React ainda, mas load/save (lib/storage.ts)
// leem/escrevem a chave direto do backend, então o backup fica completo
// mesmo para quem também usa o app legado no mesmo perfil.
export interface BackupPayload {
  version?: number;
  exportedAt?: string;
  routines?: unknown[];
  notes?: unknown[];
  history?: unknown[];
  templates?: unknown[];
  snoozes?: unknown[];
  diario?: DiarioMap;
  diaKanban?: unknown[];
  exercicios?: unknown[];
  compromissos?: unknown[];
}

const ARRAY_COLLECTIONS = ["routines", "notes", "history", "templates", "snoozes", "exercicios"] as const;

/** Porta do teste de "não parece backup" (index.html:10955). */
export function pareceBackup(data: unknown): data is BackupPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return ARRAY_COLLECTIONS.some((k) => Array.isArray(d[k]));
}

/** Porta do filtro de itens inválidos (index.html:10959) — descarta
 * entradas que não são objeto (string solta, null, número). */
export function sanitizeBackup(data: BackupPayload): BackupPayload {
  const out: BackupPayload = { ...data };
  ARRAY_COLLECTIONS.forEach((k) => {
    const arr = out[k];
    if (Array.isArray(arr)) (out as Record<string, unknown>)[k] = arr.filter((x) => x && typeof x === "object");
  });
  return out;
}

/** Porta do merge por id de routines/notes/templates (index.html:10991-10993)
 * — item cujo id já existe fica com a versão atual (o local vence). */
export function mergeById<T extends { id: string }>(current: T[], incoming: T[] | undefined): T[] {
  if (!incoming || !incoming.length) return current;
  const ids = new Set(current.map((x) => x.id));
  return [...current, ...incoming.filter((x) => x && x.id && !ids.has(x.id))];
}

/** Porta do merge de history por `ts` (index.html:10994-10995) — sem `id`,
 * a chave de dedupe é o timestamp de conclusão. */
export function mergeHistory(current: HistoryEntry[], incoming: HistoryEntry[] | undefined): HistoryEntry[] {
  if (!incoming || !incoming.length) return current;
  const tsSet = new Set(current.map((h) => h.ts));
  return [...current, ...incoming.filter((h) => !h.ts || !tsSet.has(h.ts))];
}

/** Porta do merge do diário (index.html:11000) — período já escrito no
 * destino ganha; mesclar texto criaria duplicata dentro da mesma nota. */
export function mergeDiario(current: DiarioMap, incoming: DiarioMap | undefined): DiarioMap {
  if (!incoming) return current;
  const out = { ...current };
  Object.keys(incoming).forEach((k) => {
    if (!out[k]) out[k] = incoming[k];
  });
  return out;
}

/** Porta de mergeById para coleções sem tipo forte no React ainda
 * (diaKanban/exercicios/compromissos) — mesma regra: precisa de `id`. */
export function mergeByIdLoose<T extends { id?: unknown }>(current: T[], incoming: T[] | undefined): T[] {
  if (!incoming || !incoming.length) return current;
  const ids = new Set(current.map((x) => x.id));
  return [...current, ...incoming.filter((x) => x && x.id != null && !ids.has(x.id))];
}
