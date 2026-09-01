// Porta de backup automático em arquivo no navegador (index.html:10812-
// 10914) — File System Access API: o usuário escolhe UMA vez um arquivo
// real no disco e o app regrava nele sozinho (o IndexedDB pode ser
// despejado sob pressão de disco). Inclui a sincronização "de graça": se
// duas abas/aparelhos gravarem no MESMO arquivo (ex.: pasta sincronizada
// pelo cliente do Drive/Dropbox no computador), a aba que reabre detecta o
// `exportedAt` mais recente e oferece importar — sem OAuth, sem servidor.
import { K_BAKHANDLE, K_BAKSEENAT, K_BAKWEB, K_LASTBACKUP } from "./constants";
import { load, removeKey, saveRaw, save } from "./storage";
import { isNative } from "./storage";
import type { BackupPayload } from "./backup";

// A API ainda não está em todo `lib.dom.d.ts`; augmenta só o necessário.
interface FileSystemWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FileSystemFileHandleLike {
  queryPermission(opts: { mode: "readwrite" }): Promise<"granted" | "denied" | "prompt">;
  requestPermission(opts: { mode: "readwrite" }): Promise<"granted" | "denied" | "prompt">;
  createWritable(): Promise<FileSystemWritable>;
  getFile(): Promise<File>;
}
declare global {
  interface Window {
    showSaveFilePicker?(opts: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }): Promise<FileSystemFileHandleLike>;
  }
}

export function supportsFileBackup(): boolean {
  return !isNative && typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}

export function backupHandle(): FileSystemFileHandleLike | null {
  return load<FileSystemFileHandleLike | null>(K_BAKHANDLE, null);
}

async function backupHandlePermitido(pedir: boolean): Promise<boolean> {
  const h = backupHandle();
  if (!h) return false;
  try {
    const opts = { mode: "readwrite" as const };
    if ((await h.queryPermission(opts)) === "granted") return true;
    if (pedir && (await h.requestPermission(opts)) === "granted") return true;
  } catch {
    /* permissão negada em silêncio */
  }
  return false;
}

/** Porta de escolherArquivoBackup (index.html:10826-10841) — abre o picker
 * nativo do navegador e já grava a primeira vez. */
export async function escolherArquivoBackup(snapshot: () => BackupPayload): Promise<{ ok: boolean; erro?: string }> {
  if (!supportsFileBackup()) return { ok: false, erro: "Este navegador não permite backup automático em arquivo" };
  try {
    const h = await window.showSaveFilePicker!({
      suggestedName: "rotinas-backup.json",
      types: [{ description: "Backup do Rotinas", accept: { "application/json": [".json"] } }],
    });
    saveRaw(K_BAKHANDLE, h);
    const ok = await gravarBackupArquivo(snapshot, { forcar: true });
    return { ok };
  } catch (e) {
    if (e && (e as { name?: string }).name === "AbortError") return { ok: false };
    console.error("Escolha de arquivo de backup falhou:", e);
    return { ok: false, erro: "Não foi possível ativar o backup automático" };
  }
}

export function desligarBackupArquivo(): void {
  removeKey(K_BAKHANDLE);
  removeKey(K_BAKSEENAT);
}

let bakWriting = false;

/** Porta de gravarBackupArquivo (index.html:10859-10869) — no máximo a cada
 * 5min salvo `forcar`; nunca sobrescreve com dados vazios. */
export async function gravarBackupArquivo(snapshot: () => BackupPayload, opts: { forcar?: boolean } = {}): Promise<boolean> {
  if (bakWriting) return false;
  const h = backupHandle();
  if (!h) return false;
  if (!opts.forcar && Date.now() - load(K_BAKWEB, 0) < 5 * 60000) return false;
  if (!(await backupHandlePermitido(!!opts.forcar))) return false;
  bakWriting = true;
  try {
    const dados = snapshot();
    const vazio = !(dados.routines?.length || dados.notes?.length || dados.templates?.length);
    if (vazio) return false;
    const exportedAt = dados.exportedAt || new Date().toISOString();
    const w = await h.createWritable();
    await w.write(JSON.stringify({ ...dados, exportedAt }, null, 2));
    await w.close();
    save(K_BAKWEB, Date.now());
    save(K_BAKSEENAT, exportedAt); // é a nossa própria escrita: não é "mais recente de outro aparelho"
    save(K_LASTBACKUP, Date.now());
    return true;
  } catch (e) {
    console.error("Backup automático em arquivo falhou:", e);
    return false;
  } finally {
    bakWriting = false;
  }
}

let bakChecking = false;

/** Porta de checarBackupMaisRecente (index.html:10876-10893) — devolve o
 * backup do arquivo se for mais novo que o último visto neste handle,
 * senão null. Primeira vez vendo o handle: só passa a rastrear. */
export async function checarBackupMaisRecente(): Promise<BackupPayload | null> {
  if (bakChecking || bakWriting) return null;
  const h = backupHandle();
  if (!h) return null;
  bakChecking = true;
  try {
    if (!(await backupHandlePermitido(false))) return null;
    const file = await h.getFile();
    const dados = JSON.parse(await file.text()) as BackupPayload;
    if (!dados || !dados.exportedAt) return null;
    const visto = load<string | null>(K_BAKSEENAT, null);
    if (!visto) {
      save(K_BAKSEENAT, dados.exportedAt);
      return null;
    }
    if (new Date(dados.exportedAt).getTime() <= new Date(visto).getTime()) return null;
    return dados;
  } catch {
    return null; // arquivo pode ter sido movido/apagado, ou permissão negada em silêncio
  } finally {
    bakChecking = false;
  }
}

export function marcarBackupArquivoVisto(exportedAt: string): void {
  save(K_BAKSEENAT, exportedAt);
}
