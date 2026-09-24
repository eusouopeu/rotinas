// Aba Dados: visões semanal/mensal/anual, dia selecionado, filtro por rotina,
// seções abertas (insights, metas, gráficos…) e estado sem dados. As fotos das
// visões longas esticam a janela até caber toda a rolagem.
import { test } from "@playwright/test";
import { aba, foto, fotoInteira, preparar } from "./apoio.mjs";

async function abrirDados(page, opcoes) {
  await preparar(page, opcoes);
  await aba(page, "Dados");
  await page.getByText("Semanal", { exact: true }).first().waitFor();
}
const visao = (page, nome) => page.getByText(nome, { exact: true }).first().click();

async function abrirSecoes(page) {
  // cartões com título retrátil: todos têm aria-expanded
  for (let i = 0; i < 30; i++) {
    const fechado = page.locator('button[aria-expanded="false"]');
    if ((await fechado.count()) === 0) break;
    await fechado.first().click();
  }
}

test("dados: semanal completo", async ({ page }) => {
  await abrirDados(page);
  await fotoInteira(page, "dados-semanal");
});

test("dados: semanal, dia selecionado", async ({ page }) => {
  await abrirDados(page);
  await page.getByText("21", { exact: true }).first().click();
  await fotoInteira(page, "dados-semanal-dia");
});

test("dados: semana anterior", async ({ page }) => {
  await abrirDados(page);
  await page.getByRole("button", { name: "‹" }).first().click();
  await fotoInteira(page, "dados-semanal-anterior");
});

test("dados: sem dados", async ({ page }) => {
  await abrirDados(page, { comDados: false });
  await foto(page, "dados-vazio");
});

test("dados: mensal", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Mensal");
  await fotoInteira(page, "dados-mensal");
});

test("dados: mensal, dia selecionado", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Mensal");
  await page.getByText("21", { exact: true }).first().click();
  await fotoInteira(page, "dados-mensal-dia");
});

test("dados: mensal, seções abertas", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Mensal");
  await abrirSecoes(page);
  await fotoInteira(page, "dados-mensal-abertas");
});

test("dados: mensal, filtro por rotina", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Mensal");
  await page.locator("select").first().selectOption({ label: "Treino A" });
  await abrirSecoes(page);
  await fotoInteira(page, "dados-mensal-filtro");
});

test("dados: mês anterior", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Mensal");
  await page.getByRole("button", { name: "‹" }).first().click();
  await fotoInteira(page, "dados-mensal-anterior");
});

test("dados: anual", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Anual");
  await fotoInteira(page, "dados-anual");
});

test("dados: anual, seções abertas", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Anual");
  await abrirSecoes(page);
  await fotoInteira(page, "dados-anual-abertas");
});

test("dados: anual, quadrimestre anterior e dia", async ({ page }) => {
  await abrirDados(page);
  await visao(page, "Anual");
  await page.getByRole("button", { name: "Quadrimestre anterior" }).click();
  await fotoInteira(page, "dados-anual-quad");
});
