// Registros de gastos: lista por mês, gráficos, filtros, edição de uma linha,
// popup de nova despesa, importação de extrato CSV e a pasta vazia.
import { test } from "@playwright/test";
import { aba, foto, fotoInteira, preparar } from "./apoio.mjs";

async function abrir(page, opcoes) {
  await preparar(page, opcoes);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.getByText("Registros de gastos", { exact: true }).first().click();
  await page.getByRole("heading", { name: /Despesas/ }).waitFor();
}

test("gastos: lista", async ({ page }) => {
  await abrir(page);
  await fotoInteira(page, "gastos-lista");
});

test("gastos: gráficos do mês", async ({ page }) => {
  await abrir(page);
  await page.getByText("gráficos", { exact: true }).click();
  await fotoInteira(page, "gastos-graficos");
});

test("gastos: gráficos do ano", async ({ page }) => {
  await abrir(page);
  await page.getByText("gráficos", { exact: true }).click();
  await page.getByText("ano", { exact: true }).click();
  await fotoInteira(page, "gastos-graficos-ano");
});

test("gastos: busca e categoria", async ({ page }) => {
  await abrir(page);
  await page.getByPlaceholder("Buscar por descrição ou categoria").fill("alu");
  await foto(page, "gastos-busca", { desfocar: true });
});

test("gastos: linha em edição", async ({ page }) => {
  await abrir(page);
  await page.locator('[title="Tocar para editar"]', { hasText: "Farmácia" }).click();
  await foto(page, "gastos-edicao", { desfocar: true, zerarRolagem: true });
});

test("gastos: nova despesa", async ({ page }) => {
  await abrir(page);
  await page.locator('button[title="Nova despesa"]').dispatchEvent("click");
  await foto(page, "gastos-nova", { desfocar: true, zerarRolagem: true });
});

test("gastos: importar extrato", async ({ page }) => {
  await abrir(page);
  const csv = "Data;Descrição;Valor\n21/09/2026;Padaria;-12,50\n20/09/2026;Salário;3000,00\n19/09/2026;Café;-8,00\n";
  await page.locator('input[type="file"]').setInputFiles({ name: "extrato.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByText("Importar extrato — conferir colunas").waitFor();
  await foto(page, "gastos-importar", { desfocar: true });
});

test("gastos: vazio", async ({ page }) => {
  await abrir(page, { comDados: false });
  await foto(page, "gastos-vazio");
});
