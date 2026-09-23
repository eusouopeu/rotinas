// Espelho Markdown das notas simples — porta de noteMd/mdDedupSuffix/
// syncMdFile/syncNoteMd (index.html:10597-10658). Cada nota vira um arquivo
// .md dentro de Documentos/<pasta de dados>/Notas simples/, para abrir em
// Obsidian ou qualquer editor do celular. Existia no legado e não tinha sido
// portado; voltou em 22/09/2026 a pedido do Pedro.
//
// É espelho de MÃO ÚNICA: o app escreve, nunca lê de volta. Editar o .md por
// fora não volta para a nota, e a próxima gravação sobrescreve — mesma regra
// do legado. A fonte de verdade continua sendo K_NOTES.
import { dataFolderName, slugify } from "./exportFile";
import { isNative } from "./storage";
import type { Note } from "./types";

/** Subpasta das notas simples dentro da pasta de dados (TIPO_SUBPASTA.note,
 *  index.html:10591). */
export const SUBPASTA_NOTAS = "Notas simples";

/** Porta de noteMd (index.html:10597-10601) — mesmo formato do legado, para
 *  os arquivos já gravados lá continuarem consistentes com os novos. */
export function noteToMarkdown(note: Note): string {
  let md = "# " + (note.title || "Sem título") + "\n\n" + (note.content || "") + "\n";
  const assuntos = note.subjects || [];
  if (assuntos.length) md += "\n## Assunto\n" + assuntos.map((s) => "#" + s.replace(/\s+/g, "-")).join(" ") + "\n";
  return md;
}

/** Porta de mdDedupSuffix (index.html:10514-10518) — sufixo só existe quando
 *  o slug do título colide com outra nota: "-2", "-3"..., pela ordem de
 *  criação, nunca um id aleatório aparente. */
export function mdDedupSuffix(entries: Array<{ id: string; createdAt?: number }>, objId: string): string {
  const dedup = entries
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const idx = dedup.findIndex((e) => e.id === objId);
  return idx <= 0 ? "" : "-" + (idx + 1);
}

/** Caminho do .md da nota dentro de DOCUMENTS. Exportado para teste: é a
 *  parte pura de syncNoteMd (index.html:10654-10659). */
export function caminhoMdNota(note: Note, todas: Note[]): string {
  const titulo = note.title || "sem-titulo";
  const base = slugify(titulo).slice(0, 40);
  const homonimas = todas
    .filter((n) => slugify(n.title || "sem-titulo").slice(0, 40) === base)
    .map((n) => ({ id: n.id, createdAt: n.createdAt || 0 }));
  return `${dataFolderName()}/${SUBPASTA_NOTAS}/nota-${base}${mdDedupSuffix(homonimas, note.id)}.md`;
}

function fs() {
  return window.Capacitor?.Plugins.Filesystem;
}

/**
 * Grava (ou regrava) o .md da nota e devolve o caminho usado — o chamador
 * guarda em `note._mdPath` para, no próximo título, apagar o arquivo antigo
 * em vez de deixar dois. Porta de syncMdFile (index.html:10642-10653).
 * Silencioso fora do Android: no navegador e no Electron não há pasta de
 * Documentos para espelhar.
 */
export async function sincronizarNotaMd(note: Note, todas: Note[]): Promise<string | undefined> {
  const FS = fs();
  if (!isNative || !FS) return undefined;
  const novo = caminhoMdNota(note, todas);
  try {
    if (note._mdPath && note._mdPath !== novo) {
      try {
        await FS.deleteFile({ path: note._mdPath, directory: "DOCUMENTS" });
      } catch {
        /* arquivo antigo já não existe: seguir e gravar o novo */
      }
    }
    await FS.writeFile({
      path: novo,
      directory: "DOCUMENTS",
      encoding: "utf8",
      data: noteToMarkdown(note),
      recursive: true,
    });
    return novo;
  } catch (e) {
    console.error("sincronizarNotaMd:", e);
    return undefined;
  }
}

/** Apaga o espelho quando a nota é excluída — sem isso o arquivo ficaria
 *  órfão na pasta e reapareceria como nota "fantasma" em qualquer leitor. */
export async function apagarNotaMd(note: Note): Promise<void> {
  const FS = fs();
  if (!isNative || !FS || !note._mdPath) return;
  try {
    await FS.deleteFile({ path: note._mdPath, directory: "DOCUMENTS" });
  } catch {
    /* já não existe */
  }
}
