// Boletim da semana e o fluxo de "Semana fechada" (revisão guiada em passos).
import { test } from "@playwright/test";
import { foto, fotoInteira, preparar } from "./apoio.mjs";

async function abrirBoletim(page) {
  await preparar(page);
  await page.getByRole("button", { name: "Boletim da semana" }).click();
  await page.getByText("Boletim", { exact: true }).first().waitFor();
}
async function abrirSemanaFechada(page) {
  await preparar(page);
  await page.getByText("Semana fechada").first().click();
  await page.getByRole("button", { name: "Depois" }).waitFor();
}
const proximo = (page) => page.getByRole("button", { name: "Próximo" }).click();

test("boletim: completo", async ({ page }) => {
  await abrirBoletim(page);
  await fotoInteira(page, "boletim-completo", "[data-rolagem], .tab-scroll, .screen > div:nth-child(2)");
});

test("boletim: semana dispensada", async ({ page }) => {
  await abrirBoletim(page);
  await page.getByRole("button", { name: /Dispensar esta semana/ }).click();
  await fotoInteira(page, "boletim-dispensada", "[data-rolagem], .tab-scroll, .screen > div:nth-child(2)");
});

test("boletim: horas disponíveis em edição", async ({ page }) => {
  await abrirBoletim(page);
  await page.locator('input[type="number"], input[type="text"]').first().fill("30");
  await foto(page, "boletim-horas");
});

test("semana fechada: passo 1", async ({ page }) => {
  await abrirSemanaFechada(page);
  await foto(page, "semana-fechada-1");
});

test("semana fechada: passo 2", async ({ page }) => {
  await abrirSemanaFechada(page);
  await proximo(page);
  await foto(page, "semana-fechada-2");
});

test("semana fechada: passo 3", async ({ page }) => {
  await abrirSemanaFechada(page);
  await proximo(page);
  await proximo(page);
  await foto(page, "semana-fechada-3");
});

test("semana fechada: último passo", async ({ page }) => {
  await abrirSemanaFechada(page);
  for (let i = 0; i < 5; i++) {
    const p = page.getByRole("button", { name: "Próximo" });
    if (!(await p.count())) break;
    await p.click();
  }
  await foto(page, "semana-fechada-ultimo");
});
