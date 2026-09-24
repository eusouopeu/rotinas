// Editor de nota (formato Apple Notes): barras em pílula, título e assuntos,
// corpo live (linhas renderizadas, linha ativa crua, seções recolhidas), modo
// Markdown cru, nota nova vazia e o rodapé com o grupo de botões rolável.
import { test } from "@playwright/test";
import { aba, foto, fotoInteira, preparar } from "./apoio.mjs";
import { seedLocalStorage } from "./seed.mjs";

const guia = {
  id: "n-guia", title: "Guia completo do editor", subjects: ["guia", "teste"], pinned: false,
  updatedAt: 1, createdAt: 1,
  content: [
    "# Visão geral #guia",
    "",
    "Texto com **negrito** e uma linha longa o bastante para quebrar em duas linhas no celular sem estourar a largura da tela.",
    "",
    "## Tarefas",
    "- [x] Escrever o roteiro",
    "- [ ] Rodar a suíte",
    "  - [ ] item recuado",
    "",
    "## Listas",
    "- item simples",
    "  - item recuado",
    "1. primeiro",
    "2. segundo",
    "a) letra a",
    "b) letra b",
    "",
    "### Detalhe",
    "| col A | col B |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "Fim.",
  ].join("\n"),
};
const EXTRA = { extra: { rotinas_v2_notes: [...seedLocalStorage.rotinas_v2_notes, guia] } };
const rolagem = ".note-ap-scroll, [data-rolagem]";

async function abrir(page, titulo, opcoes = EXTRA) {
  await preparar(page, opcoes);
  await aba(page, "Modelos");
  await page.getByRole("heading", { name: titulo }).click();
  await page.getByPlaceholder("Título").waitFor();
  await page.waitForTimeout(200);
}

test("nota: curta com checklist", async ({ page }) => {
  await abrir(page, "Compras da semana");
  await foto(page, "nota-curta");
});

test("nota: guia completo", async ({ page }) => {
  await abrir(page, "Guia completo do editor");
  await fotoInteira(page, "nota-guia", rolagem);
});

test("nota: linha ativa", async ({ page }) => {
  await abrir(page, "Guia completo do editor");
  await page.getByText("Escrever o roteiro").click();
  await foto(page, "nota-linha-ativa", { desfocar: false });
});

test("nota: seção recolhida", async ({ page }) => {
  await abrir(page, "Guia completo do editor");
  await page.getByRole("button", { name: "Recolher seção" }).nth(1).click();
  await foto(page, "nota-recolhida");
});

test("nota: markdown cru", async ({ page }) => {
  await abrir(page, "Guia completo do editor");
  await page.locator('button[aria-label="Ver o Markdown cru"]').click();
  await foto(page, "nota-cru", { desfocar: true });
});

test("nota: nova e vazia", async ({ page }) => {
  await preparar(page, EXTRA);
  await aba(page, "Modelos");
  await page.locator('button[title="Novo"]').dispatchEvent("click");
  await page.getByPlaceholder("Título").waitFor();
  await foto(page, "nota-nova", { desfocar: true });
});
