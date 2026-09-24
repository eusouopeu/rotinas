// Preparação comum dos roteiros do app em navegador (dados de exemplo,
// data congelada, fontes carregadas). ajustes.spec.mjs tem a sua própria
// (precisa da ponte simulada do app instalado).
import { expect } from "@playwright/test";
import { HOJE, seedLocalStorage } from "./seed.mjs";

export async function preparar(page, { comDados = true } = {}) {
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

export const aba = (page, nome) => page.locator(".tabbar button", { hasText: nome }).first().click();

/** `desfocar`: tira o foco do campo (autoFocus de formulário) — o anel de foco
 *  varia 1px entre execuções sob carga e não é o que se quer comparar. */
export async function foto(page, nome, { desfocar = false } = {}) {
  if (desfocar) await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(() => document.fonts.ready);
  // digitar em campos pode rolar 1px de lado um contêiner com overflow-x escondido
  await page.evaluate(() => document.querySelectorAll("*").forEach((e) => e.scrollLeft && (e.scrollLeft = 0)));
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot(`${nome}.png`);
}

/** Foto da tela inteira: estica a janela até caber o conteúdo rolável. */
export async function fotoInteira(page, nome, seletor = ".tab-scroll") {
  await page.evaluate(() => document.fonts.ready);
  const extra = await page.locator(seletor).first().evaluate((el) => Math.max(0, el.scrollHeight - el.clientHeight));
  const { width, height } = page.viewportSize();
  await page.setViewportSize({ width, height: height + extra + 24 });
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot(`${nome}.png`);
}

/** Arrasta um cartão de SwipeItem com pointer events sintéticos (o arrasto do
 *  mouse do Playwright termina em clique). `dx` negativo = para a esquerda. */
export async function arrastarCartao(page, titulo, dx) {
  await page.getByRole("heading", { name: titulo }).evaluate((h3, dx) => {
    const card = h3.closest("[data-swipe-item] > div, .swipe-track");
    const r = card.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const ini = r.left + r.width / 2;
    const ev = (tipo, x) =>
      card.dispatchEvent(new PointerEvent(tipo, { bubbles: true, pointerId: 1, pointerType: "touch", clientX: x, clientY: y, button: 0 }));
    ev("pointerdown", ini);
    const passos = 10;
    for (let i = 1; i <= passos; i++) ev("pointermove", ini + (dx * i) / passos);
    ev("pointerup", ini + dx);
  }, dx);
}
