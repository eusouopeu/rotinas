// Porta de downloadFile/shareOrDownload/exportPdfView/slugify
// (index.html:6316-6337, 10499-10501, 10665-10702) — exporta um arquivo de
// texto (ou "PDF" via impressão) tanto no navegador quanto no Android
// (Capacitor). No WebView, `blob`+`<a download>` e `window.print()` não
// funcionam: o caminho nativo grava o arquivo em Documentos e abre o share
// sheet do sistema.
import { K_DATAFOLDER } from "./constants";
import { isNative, load } from "./storage";

export function slugify(s: string | undefined): string {
  return (
    (s || "nota")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "nota"
  );
}

function dataFolderName(): string {
  return load(K_DATAFOLDER, "Rotinas");
}

/** Porta de nativeWriteExport (index.html:10556-10562). */
async function nativeWriteExport(filename: string, text: string, subpasta?: string): Promise<string> {
  const path = dataFolderName() + (subpasta ? "/" + subpasta : "") + "/" + filename;
  const r = await window.Capacitor!.Plugins.Filesystem.writeFile({ path, directory: "DOCUMENTS", encoding: "utf8", data: text, recursive: true });
  return (r as unknown as { uri: string }).uri;
}

/** Porta de downloadFile (index.html:10665-10678) — nativo grava em
 * Documentos; navegador baixa via blob. */
export async function downloadFile(filename: string, text: string, mime: string, subpasta?: string): Promise<{ ok: boolean; local?: string }> {
  if (isNative) {
    try {
      await nativeWriteExport(filename, text, subpasta);
      return { ok: true, local: "Documentos/" + dataFolderName() + (subpasta ? "/" + subpasta : "") + "/" + filename };
    } catch (e) {
      console.error("Export falhou:", e);
      return { ok: false };
    }
  }
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
  return { ok: true };
}

/** Porta de shareOrDownload (index.html:10679-10702) — nativo grava e abre
 * o share sheet; navegador tenta `navigator.share`, senão baixa. */
export async function shareOrDownload(filename: string, text: string, mime: string, subpasta?: string): Promise<boolean> {
  if (isNative) {
    try {
      const uri = await nativeWriteExport(filename, text, subpasta);
      try {
        await window.Capacitor!.Plugins.Share?.share({ title: filename, files: [uri] });
      } catch {
        /* cancelar o share é ok, o arquivo já está salvo */
      }
      return true;
    } catch (e) {
      console.error("Export falhou:", e);
      return false;
    }
  }
  try {
    if (navigator.canShare && navigator.share) {
      const file = new File([text], filename, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return true;
      }
    }
  } catch (e) {
    if (e && (e as { name?: string }).name === "AbortError") return true;
  }
  await downloadFile(filename, text, mime, subpasta);
  return true;
}

const PDF_STYLE =
  "body{font-family:Georgia,serif;color:#222;margin:28px;line-height:1.5;}" +
  "h1{font-size:22px;margin:0 0 14px;} h2{font-size:15px;margin:16px 0 6px;border-bottom:1.5px solid #ccc;padding-bottom:3px;}" +
  "ul{margin:4px 0;padding-left:20px;} li{margin:2px 0;font-size:13px;}" +
  ".done{color:#888;text-decoration:line-through;} .meta{color:#666;font-size:12px;}" +
  ".mxgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
  ".mxq{border:2px solid;border-radius:8px;padding:10px;} .mxq h2{border:none;margin:0 0 6px;padding:0;}" +
  ".sub{margin-left:18px;} .score{font-size:15px;font-weight:bold;margin-top:10px;}" +
  "@media print{ body{margin:12mm;} }";

/** Porta de exportPdfView (index.html:6316-6337) — no Android grava um
 * .html e abre o share sheet (o usuário salva como PDF por lá); no
 * navegador abre uma aba e chama `window.print()`. Devolve um aviso
 * (`erro`) quando pop-ups estão bloqueados — quem chama decide como
 * mostrar. */
export async function exportPdfView(title: string, innerHtml: string, subpasta?: string): Promise<{ ok: boolean; erro?: string }> {
  if (isNative) {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Georgia,serif;color:#222;margin:28px;line-height:1.5;">${innerHtml}</body></html>`;
    const ok = await shareOrDownload(slugify(title) + ".html", html, "text/html", subpasta);
    return { ok };
  }
  const w = window.open("", "_blank");
  if (!w) return { ok: false, erro: "Permita pop-ups para gerar o PDF" };
  w.document.write(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title><style>${PDF_STYLE}</style></head><body>${innerHtml}</body></html>`,
  );
  w.document.close();
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* pop-up pode ter sido fechado pelo usuário antes do timeout */
    }
  }, 450);
  return { ok: true };
}
