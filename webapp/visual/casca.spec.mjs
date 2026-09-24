// Casca do app: barra de abas / sidebar (recolhida também), busca global e os
// avisos flutuantes (o de cima e o de desfazer, de baixo).
import { test } from "@playwright/test";
import { aba, arrastarCartao, foto, preparar } from "./apoio.mjs";

const soDesktop = (info) => test.skip(!info.project.name.startsWith("desktop"), "só no desktop");

test("casca: sidebar recolhida", async ({ page }, info) => {
  soDesktop(info);
  await preparar(page);
  await page.locator('button[aria-label="Recolher menu"]').click();
  await page.mouse.move(600, 400);
  await page.waitForTimeout(300);
  await foto(page, "casca-recolhida");
});

test("casca: busca global aberta", async ({ page }) => {
  await preparar(page);
  await page.keyboard.press("/");
  await page.getByPlaceholder("Buscar rotinas, metas, notas...").last().waitFor();
  await foto(page, "casca-busca-vazia", { desfocar: true });
});

test("casca: busca com resultados", async ({ page }) => {
  await preparar(page);
  await page.keyboard.press("/");
  await page.getByPlaceholder("Buscar rotinas, metas, notas...").last().fill("trei");
  await foto(page, "casca-busca-resultados", { desfocar: true });
});

test("casca: busca sem resultado, filtro de notas", async ({ page }) => {
  await preparar(page);
  await page.keyboard.press("/");
  await page.getByPlaceholder("Buscar rotinas, metas, notas...").last().fill("zzzz");
  await page.getByText("notas", { exact: true }).last().click();
  await foto(page, "casca-busca-nada", { desfocar: true });
});

test("casca: aviso de desfazer", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await arrastarCartao(page, "Ideias de projeto", -100);
  await page.getByRole("button", { name: "Excluir" }).first().dispatchEvent("click");
  await page.getByRole("button", { name: "Desfazer" }).waitFor();
  await foto(page, "casca-desfazer");
});

test("casca: aviso de cima", async ({ page }) => {
  await preparar(page);
  await aba(page, "Ajustes");
  await page.getByText("Calendário externo", { exact: true }).click();
  await page.getByRole("button", { name: "exportar", exact: true }).click();
  await page.waitForTimeout(500);
  await foto(page, "casca-aviso");
});
