import { describe, expect, it } from "vitest";
import { kanbanPdfHtml, matrixPdfHtml, metasPdfHtml, prosConsPdfHtml, travelPdfHtml } from "./pdfExport";
import type { CountdownDoc, KanbanDoc, MatrixDoc, ProsConsDoc, TravelDoc } from "./types";

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

  it("metasPdfHtml ordena por prazo, lista itens com progresso e escapa HTML", () => {
    const doc: CountdownDoc = {
      id: "cd1",
      type: "countdown",
      title: "Metas",
      targets: [
        {
          id: "m1",
          title: "Meta Longa",
          date: "2099-12-31",
          createdAt: 0,
          topics: 100,
          done: 20,
          unit: "páginas",
        },
        {
          id: "m2",
          title: "Meta Curta <tag>",
          date: "2026-01-01",
          createdAt: 0,
          topics: 10,
          done: 10,
        },
      ],
      createdAt: 0,
      updatedAt: 0,
    };

    const html = metasPdfHtml(doc);
    expect(html).toContain("<h1>Metas</h1>");
    // Ordenação por prazo: Meta Curta (2026-01-01) deve vir antes de Meta Longa (2099-12-31)
    expect(html.indexOf("Meta Curta &lt;tag&gt;")).toBeLessThan(html.indexOf("Meta Longa"));
    expect(html).not.toContain("<tag>");
    // Formatação de data dd/mm/yyyy
    expect(html).toContain("01/01/2026");
    expect(html).toContain("31/12/2099");
    // Progresso e ritmo com unidade
    expect(html).toContain("20/100 páginas");
    expect(html).toContain("10/10 tópicos (concluído)");
    // Rodapé com data de geração
    expect(html).toMatch(/<p class=['"]meta['"]>gerado em \d{4}-\d{2}-\d{2}<\/p>/);
  });

  it("prosConsPdfHtml calcula soma de pesos, placar (prós vencem, contras vencem, empate) e escapa HTML", () => {
    // Caso 1: Prós vencem
    const docProsVencem: ProsConsDoc = {
      id: "pc1",
      type: "proscons",
      title: "Decisão <Importante>",
      pros: [
        { id: "p1", text: "Vantagem A", w: 4 },
        { id: "p2", text: "Vantagem B", w: 3 },
      ],
      cons: [{ id: "c1", text: "Desvantagem <X>", w: 2 }],
      createdAt: 0,
      updatedAt: 0,
    };

    const htmlPros = prosConsPdfHtml(docProsVencem);
    expect(htmlPros).toContain("<h1>Decisão &lt;Importante&gt;</h1>");
    expect(htmlPros).toContain("Prós (7)");
    expect(htmlPros).toContain("Contras (2)");
    expect(htmlPros).toContain("Vantagem A <span class='meta'>(peso 4)</span>");
    expect(htmlPros).toContain("Desvantagem &lt;X&gt; <span class='meta'>(peso 2)</span>");
    expect(htmlPros).toContain("Placar: +5 — prós vencem");

    // Caso 2: Contras vencem
    const docConsVencem: ProsConsDoc = {
      ...docProsVencem,
      pros: [{ id: "p1", text: "Vantagem", w: 1 }],
      cons: [{ id: "c1", text: "Desvantagem", w: 4 }],
    };
    const htmlCons = prosConsPdfHtml(docConsVencem);
    expect(htmlCons).toContain("Prós (1)");
    expect(htmlCons).toContain("Contras (4)");
    expect(htmlCons).toContain("Placar: -3 — contras vencem");

    // Caso 3: Empate
    const docEmpate: ProsConsDoc = {
      ...docProsVencem,
      pros: [{ id: "p1", text: "Vantagem", w: 3 }],
      cons: [{ id: "c1", text: "Desvantagem", w: 3 }],
    };
    const htmlEmpate = prosConsPdfHtml(docEmpate);
    expect(htmlEmpate).toContain("Prós (3)");
    expect(htmlEmpate).toContain("Contras (3)");
    expect(htmlEmpate).toContain("Placar: 0 — empate");
  });
});
