import { describe, expect, it } from "vitest";
import { kanbanPdfHtml, matrixPdfHtml, travelPdfHtml } from "./pdfExport";
import type { KanbanDoc, MatrixDoc, TravelDoc } from "./types";

describe("pdfExport", () => {
  it("matrixPdfHtml escapa HTML e inclui título/eixos/quadrantes", () => {
    const doc = {
      id: "1",
      type: "matrix",
      title: "<b>Prioridades</b>",
      axisX: "Urgência",
      axisY: "Importância",
      quadrants: [{ title: "Q1", color: "#B25B4C", mode: "ul", items: [{ text: "Item <script>", checked: false, indent: 0 }] }],
      createdAt: 0,
      updatedAt: 0,
    } as unknown as MatrixDoc;
    const html = matrixPdfHtml(doc);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Prioridades&lt;/b&gt;");
    expect(html).toContain("Urgência");
  });

  it("kanbanPdfHtml lista cada coluna com contagem de itens", () => {
    const doc = { id: "1", type: "kanban", title: "Sprint", cols: [{ title: "A fazer", items: [{ id: "i1", text: "Tarefa" }] }], createdAt: 0, updatedAt: 0 } as unknown as KanbanDoc;
    const html = kanbanPdfHtml(doc);
    expect(html).toContain("A fazer (1)");
    expect(html).toContain("Tarefa");
  });

  it("travelPdfHtml agrupa por categoria na ordem do doc e marca itens concluídos", () => {
    const doc = {
      id: "1",
      type: "travel",
      title: "Praia",
      catOrder: ["Roupas", "Documentos"],
      items: [
        { id: "a", name: "Passaporte", cat: "Documentos", qty: 1, checked: true },
        { id: "b", name: "Camisa", cat: "Roupas", qty: 3, checked: false },
      ],
      createdAt: 0,
      updatedAt: 0,
    } as unknown as TravelDoc;
    const html = travelPdfHtml(doc);
    expect(html.indexOf("Roupas")).toBeLessThan(html.indexOf("Documentos"));
    expect(html).toContain("×3");
    expect(html).toContain("☑");
  });
});
