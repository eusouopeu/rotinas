// Porta dos construtores de HTML de PDF (matrixPdfHtml index.html:7407-7419,
// kbPdf index.html:7888-7892, tvPdf index.html:9673-9682) — cada função
// devolve o `innerHtml` que exportPdfView (lib/exportFile.ts) empacota e
// exporta. Escapa manualmente (o resultado vira `document.write`/arquivo
// .html, não passa pelo escape automático do JSX).
import type { KanbanDoc, MatrixDoc, TravelDoc } from "./types";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function matrixPdfHtml(doc: MatrixDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  if (doc.axisX || doc.axisY) inner += `<p class="meta">Eixos: ${escapeHtml(doc.axisX || "—")} × ${escapeHtml(doc.axisY || "—")}</p>`;
  inner += `<div class="mxgrid">`;
  doc.quadrants.forEach((q) => {
    inner += `<div class="mxq" style="border-color:${q.color}"><h2 style="color:${q.color}">${escapeHtml(q.title)} (${q.items.length})</h2><ul>`;
    q.items.forEach((it) => {
      inner += `<li class="${it.indent ? "sub" : ""} ${q.mode === "check" && it.checked ? "done" : ""}">${escapeHtml(it.text)}</li>`;
    });
    inner += `</ul></div>`;
  });
  return inner + `</div>`;
}

export function kanbanPdfHtml(doc: KanbanDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  doc.cols.forEach((c) => {
    inner += "<h2>" + escapeHtml(c.title) + " (" + c.items.length + ")</h2><ul>" + c.items.map((i) => "<li>" + escapeHtml(i.text) + "</li>").join("") + "</ul>";
  });
  return inner;
}

export function travelPdfHtml(doc: TravelDoc): string {
  let inner = "<h1>" + escapeHtml(doc.title) + "</h1>";
  const byCat: Record<string, TravelDoc["items"]> = {};
  doc.items.forEach((it) => {
    (byCat[it.cat || "Outros"] = byCat[it.cat || "Outros"] || []).push(it);
  });
  doc.catOrder.concat(Object.keys(byCat).filter((c) => !doc.catOrder.includes(c))).forEach((cat) => {
    const list = byCat[cat];
    if (!list || !list.length) return;
    inner +=
      "<h2>" +
      escapeHtml(cat) +
      "</h2><ul>" +
      list.map((i) => `<li class="${i.checked ? "done" : ""}">${i.checked ? "☑" : "☐"} ${escapeHtml(i.name)}${i.qty && i.qty > 1 ? " ×" + i.qty : ""}</li>`).join("") +
      "</ul>";
  });
  return inner;
}
