// Porta de backupData/exportBackup/importBackup/oferecerImportarBackup
// (index.html:10769-11005), incluindo o export/import de item avulso
// ("rotina-share"/"modelo-share", index.html:4721-4727, 6749-6754, 10921-10944)
// — o backup completo em JSON (mesclar ou substituir tudo) e uma rotina/modelo
// único compartilhado por outro usuário. Fora do escopo: backup automático em
// arquivo (ver lib/fileBackup.ts) e a cópia automática nativa (ver lib/autoBackup.ts).
import type { HistoryEntry } from "./history";
import type { AnyTemplateDoc, DiarioMap, Routine, Snooze } from "./types";

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

// ---- Export/import de item avulso ("rotina-share"/"modelo-share",
// index.html:4721-4727, 6749-6754, 10921-10944) — um arquivo com UMA rotina
// ou UM modelo, exportado/importado por outro usuário (ou outro dispositivo),
// diferente do backup completo acima. ----
export interface RotinaShare {
  type: "rotina-share";
  version?: number;
  routine: Routine;
}
export interface ModeloShare {
  type: "modelo-share";
  version?: number;
  doc: AnyTemplateDoc;
}

/** Porta da geração de payload de export de rotina avulsa (index.html:4723-4724).
 * Clona a rotina e força agendamento desativado (`schedule.enabled = false`) se existir. */
export function rotinaShareData(routine: Routine): RotinaShare {
  const clone: Routine = JSON.parse(JSON.stringify(routine));
  if (clone.schedule) clone.schedule.enabled = false;
  return {
    type: "rotina-share",
    version: 1,
    routine: clone,
  };
}

/** Porta da geração de payload de export de modelo/doc avulso (index.html:6752).
 * Clona o documento do modelo. */
export function modeloShareData(doc: AnyTemplateDoc): ModeloShare {
  return {
    type: "modelo-share",
    version: 1,
    doc: JSON.parse(JSON.stringify(doc)),
  };
}

export function ehRotinaShare(data: unknown): data is RotinaShare {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === "rotina-share" && !!(data as { routine?: unknown }).routine;
}
export function ehModeloShare(data: unknown): data is ModeloShare {
  return !!data && typeof data === "object" && (data as { type?: unknown }).type === "modelo-share" && !!(data as { doc?: unknown }).doc;
}

/** Porta do ramo "rotina-share" de importBackup (index.html:10921-10933) —
 * novo id pra rotina e pra cada etapa; etapa do tipo "routine" (sub-rotina)
 * vira "checklist" e perde o vínculo de nota (`noteId`), igual ao legado —
 * sub-rotina referenciava uma rotina LOCAL que não existe em quem importa.
 * Agendamento sempre entra desativado, e o nome ganha sufixo se colidir. */
export function prepararRotinaImportada(routine: Routine, existentes: Routine[], newId: () => string): Routine {
  const r: Routine = {
    ...routine,
    id: newId(),
    steps: routine.steps.map((s) => ({ ...s, id: newId(), type: s.type === "routine" ? "checklist" : s.type, noteId: undefined })),
    schedule: { ...(routine.schedule || { enabled: false, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] }), enabled: false },
  };
  if (existentes.some((x) => x.name === r.name)) r.name = r.name + " (importada)";
  return r;
}

/** Porta do ramo "modelo-share" de importBackup (index.html:10934-10943) —
 * novo id; título ganha sufixo se colidir com um modelo do mesmo tipo. */
export function prepararModeloImportado(doc: AnyTemplateDoc, existentes: AnyTemplateDoc[], newId: () => string): AnyTemplateDoc {
  const d = { ...doc, id: newId() } as AnyTemplateDoc & { title?: string };
  if (existentes.some((t) => (t as { title?: string }).title === d.title && t.type === d.type)) {
    d.title = (d.title || "") + " (importado)";
  }
  return d;
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
 * (diaKanban/compromissos) — mesma regra: precisa de `id`. */
export function mergeByIdLoose<T extends { id?: unknown }>(current: T[], incoming: T[] | undefined): T[] {
  if (!incoming || !incoming.length) return current;
  const ids = new Set(current.map((x) => x.id));
  return [...current, ...incoming.filter((x) => x && x.id != null && !ids.has(x.id))];
}

/** Merge de snoozes — sem `id` (só `{from, to}`), a dedupe é pelo próprio
 * intervalo: uma janela já presente não entra de novo. */
export function mergeSnoozes(current: Snooze[], incoming: Snooze[] | undefined): Snooze[] {
  if (!incoming || !incoming.length) return current;
  const chaves = new Set(current.map((s) => s.from + ":" + s.to));
  return [...current, ...incoming.filter((s) => s && typeof s.from === "number" && typeof s.to === "number" && !chaves.has(s.from + ":" + s.to))];
}
