// Roteiro de screenshots (ver playwright.config.mjs). Cada `tela(...)` leva o
// app a um estado determinístico e fotografa. Para cobrir uma tela nova,
// acrescente um bloco aqui e rode `npm run visual:baseline`.
import { test, expect } from "@playwright/test";
import { HOJE, seedLocalStorage } from "./seed.mjs";
import { fotoInteira } from "./apoio.mjs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    if (localStorage.getItem("rotinas_v2_migrated")) return;
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
  }, seedLocalStorage);
  await page.clock.setFixedTime(new Date(HOJE));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('button[aria-label="Ajustes"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });
});

const aba = (page, nome) => page.locator(`button[aria-label="${nome}"]`).first().click();
async function foto(page, nome) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // fim da animação de entrada da tela (fade 0.25s)
  await expect(page).toHaveScreenshot(`${nome}.png`, { fullPage: false });
}

test("rotinas: semana", async ({ page }) => foto(page, "rotinas-semana"));

test("rotinas: dia", async ({ page }) => {
  await page.getByText("Dia", { exact: true }).first().click();
  await foto(page, "rotinas-dia");
});

test("rotinas: lista", async ({ page }) => {
  await page.getByText("Lista", { exact: true }).first().click();
  await foto(page, "rotinas-lista");
});

test("rotinas: popup de criar", async ({ page }) => {
  await page.locator('button[title="Novo"]:visible').click();
  await foto(page, "rotinas-criar");
});

test("rotinas: mês", async ({ page }) => {
  await page.getByText("Mês", { exact: true }).first().click();
  await foto(page, "rotinas-mes");
});

test("rotinas: mês com o resumo do dia tocado", async ({ page }) => {
  await page.getByText("Mês", { exact: true }).first().click();
  await page.getByRole("button", { name: /^Dia 22:/ }).click();
  await page.locator('[data-mes="resumo"]').waitFor();
  await fotoInteira(page, "rotinas-mes-resumo");
});

test("rotinas: rotinas prontas", async ({ page }) => {
  await page.locator('button[title="Novo"]:visible').click();
  await page.getByText("Rotina pronta", { exact: true }).click();
  await foto(page, "rotinas-prontas");
});

test("editor de rotina (nova)", async ({ page }) => {
  await page.locator('button[title="Novo"]:visible').click();
  await page.getByText("sequência de etapas com tempo").click();
  await foto(page, "editor-rotina");
});

test("boletim", async ({ page }) => {
  await page.getByRole("button", { name: "Boletim da semana" }).click();
  await foto(page, "boletim");
});

test("metas", async ({ page }) => {
  await aba(page, "Metas");
  await page.getByText("Prazos", { exact: true }).first().click();
  await foto(page, "metas");
});

test("notas", async ({ page }) => {
  await aba(page, "Modelos");
  await page.getByText("Notas", { exact: true }).last().click(); // aba Modelos abre nas pastas desde 01/10/2026
  await foto(page, "notas");
});

test("editor de nota", async ({ page }) => {
  await aba(page, "Modelos");
  await page.getByText("Notas", { exact: true }).last().click(); // aba Modelos abre nas pastas desde 01/10/2026
  await page.getByText("Compras da semana").first().click();
  await foto(page, "editor-nota");
});

test("modelos: pastas", async ({ page }) => {
  await aba(page, "Modelos");
  await foto(page, "modelos-pastas");
});

test("modelos: kanban", async ({ page }) => {
  await aba(page, "Modelos");
  await page.getByText("Kanbans", { exact: true }).first().click();
  await page.getByText("Projeto Casa").first().click();
  await foto(page, "modelos-kanban");
});

test("dados", async ({ page }) => {
  await aba(page, "Dados");
  await foto(page, "dados");
});

test("ajustes", async ({ page }) => {
  await aba(page, "Ajustes");
  await foto(page, "ajustes");
});

test("ajustes: seções abertas", async ({ page }) => {
  await aba(page, "Ajustes");
  await page.getByText("Avisos e cronômetro", { exact: true }).click();
  await page.getByRole("button", { name: "Roda da vida", exact: true }).click();
  await foto(page, "ajustes-abertos");
});
