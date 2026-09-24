// Notas e Modelos (listas, pastas, busca, swipe, popups). O editor de nota e os
// documentos de modelo têm cobertura própria.
import { test, expect } from "@playwright/test";
import { HOJE, seedLocalStorage } from "./seed.mjs";

async function preparar(page, { comDados = true } = {}) {
  await page.addInitScript(
    ({ seed, comDados }) => {
      if (comDados && !localStorage.getItem("rotinas_v2_migrated")) {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      }
    },
    { seed: seedLocalStorage, comDados }
  );
  await page.clock.setFixedTime(new Date(HOJE));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".tabbar").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });
}
const aba = (page, nome) => page.locator(".tabbar button", { hasText: nome }).first().click();
async function foto(page, nome) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot(`${nome}.png`);
}

test("notas: vazio (app novo)", async ({ page }) => {
  await preparar(page, { comDados: false });
  await aba(page, "Modelos");
  await foto(page, "notas-vazio");
});

test("notas: filtro por tag", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("#estudo", { exact: true }).click();
  await foto(page, "notas-tag");
});

test("notas: busca sem resultado", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByPlaceholder("Buscar notas...").fill("zzzz");
  await foto(page, "notas-sem-resultado");
});

test("notas: arquivadas", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByRole("button", { name: /ver arquivadas/ }).click();
  await foto(page, "notas-arquivadas");
});

test("notas: card arrastado (excluir à mostra)", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  // pointer events sintéticos no card (h3 > .note-info > card): o arrasto com o
  // mouse do Playwright termina em clique e abriria a nota
  await page.getByRole("heading", { name: "Ideias de projeto" }).evaluate((h3) => {
    const card = h3.parentElement.parentElement;
    const r = card.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const ev = (tipo, x) =>
      card.dispatchEvent(new PointerEvent(tipo, { bubbles: true, pointerId: 1, pointerType: "touch", clientX: x, clientY: y, button: 0 }));
    ev("pointerdown", r.left + 200);
    for (let dx = 10; dx <= 100; dx += 10) ev("pointermove", r.left + 200 - dx);
    ev("pointerup", r.left + 100);
  });
  await foto(page, "notas-swipe");
});

test("modelos: pasta de kanbans", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.getByText("Kanbans", { exact: true }).first().click();
  await foto(page, "modelos-pasta");
});

test("modelos: pasta vazia", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.getByText("Listas de mercado", { exact: true }).first().click();
  await foto(page, "modelos-pasta-vazia");
});

test("modelos: busca", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.getByPlaceholder("Buscar modelos...").fill("proj");
  await foto(page, "modelos-busca");
});

test("modelos: popup de criar", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.locator('button[title="Novo modelo"]').dispatchEvent("click");
  await foto(page, "modelos-criar");
});

test("modelos: escolha do preset da matriz", async ({ page }) => {
  await preparar(page);
  await aba(page, "Modelos");
  await page.getByText("Outros", { exact: true }).first().click();
  await page.locator('button[title="Novo modelo"]').dispatchEvent("click");
  await page.getByText("Matrizes", { exact: true }).last().click();
  await foto(page, "modelos-matriz");
});
