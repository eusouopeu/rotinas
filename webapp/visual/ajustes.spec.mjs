// Ajustes completo: todas as seções abertas, com dados (áreas da roda,
// pontuação avançada) e nas variantes que só existem no app instalado
// (Electron/Android): cartão de sincronização em três estados, MCP e mini
// player, usando uma ponte simulada (window.electronBridge) — o navegador
// comum não renderiza esses cartões.
import { test, expect } from "@playwright/test";
import { HOJE, seedLocalStorage } from "./seed.mjs";

const SINCRONIZACAO = {
  "sem-credenciais": { hasClientCreds: false, connected: false },
  desconectado: { hasClientCreds: true, connected: false },
  conectado: {
    hasClientCreds: true,
    connected: true,
    lastSyncAt: new Date("2026-09-23T09:41:00-03:00").getTime(),
    pendingConflicts: ["rotinas_v2_notes"],
    keys: [
      { key: "rotinas_v2_routines", syncedAt: new Date("2026-09-23T09:41:00-03:00").getTime() },
      { key: "rotinas_v2_notes", syncedAt: new Date("2026-09-22T20:10:00-03:00").getTime(), conflito: true },
      { key: "rotinas_v2_exercicios", syncedAt: 0 },
    ],
  },
};

async function preparar(page, { ponte } = {}) {
  await page.addInitScript(
    ({ seed, ponte, sync }) => {
      if (!localStorage.getItem("rotinas_v2_migrated")) {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      }
      if (!ponte) return;
      window.electronBridge = {
        getAll: async () => [],
        set: async () => {},
        del: async () => {},
        sync: {
          saveClientCreds: async () => {},
          connect: async () => {},
          disconnect: async () => {},
          syncNow: async () => ({ uploaded: [], downloaded: [], conflicts: [] }),
          resolveConflict: async () => {},
          getStatus: async () => sync,
        },
        mcp: {
          getStatus: async () => ({
            running: true,
            mode: "write",
            port: 7777,
            token: "tok_exemplo",
            wired: true,
            log: [
              { tool: "list_routines", ts: 1790160000000, kind: "read" },
              { tool: "append_diario", ts: 1790160060000, kind: "write" },
            ],
          }),
          setMode: async () => {},
          setPort: async () => {},
          regenerateToken: async () => {},
        },
        miniPlayer: { open: () => {} },
      };
    },
    { seed: seedLocalStorage, ponte: !!ponte, sync: ponte ? SINCRONIZACAO[ponte] : null }
  );
  await page.clock.setFixedTime(new Date(HOJE));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('button[aria-label="Ajustes"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });
  await page.locator('button[aria-label="Ajustes"]').first().click();
  await page.getByPlaceholder("Buscar em Ajustes...").waitFor();
}

async function abrirTudo(page) {
  // abre toda seção fechada e o "Avançado" (todos têm aria-expanded)
  for (let i = 0; i < 20; i++) {
    const fechado = page.locator('button[aria-expanded="false"]');
    if ((await fechado.count()) === 0) break;
    await fechado.first().click();
  }
  const nova = page.getByPlaceholder("Nova área");
  if (await nova.count()) {
    for (const nome of ["Saúde", "Estudos"]) {
      await nova.fill(nome);
      await nova.press("Enter");
    }
  }
}

async function fotoInteira(page, nome) {
  await page.evaluate(() => document.fonts.ready);
  const extra = await page
    .locator("[data-rolagem]")
    .evaluate((el) => Math.max(0, el.scrollHeight - el.clientHeight));
  const { width, height } = page.viewportSize();
  await page.setViewportSize({ width, height: height + extra + 24 });
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot(`${nome}.png`);
}

test("ajustes: tudo aberto", async ({ page }) => {
  await preparar(page);
  await abrirTudo(page);
  await fotoInteira(page, "ajustes-tudo");
});

for (const estado of Object.keys(SINCRONIZACAO)) {
  test(`ajustes: app instalado, nuvem ${estado}`, async ({ page }) => {
    await preparar(page, { ponte: estado });
    await abrirTudo(page);
    await fotoInteira(page, `ajustes-instalado-${estado}`);
  });
}

test("ajustes: busca filtra seções", async ({ page }) => {
  await preparar(page);
  await page.getByPlaceholder("Buscar em Ajustes...").fill("vibra");
  await page.waitForTimeout(200);
  await expect(page).toHaveScreenshot("ajustes-busca.png");
});

test("ajustes: confirmar remoção de área", async ({ page }) => {
  await preparar(page);
  await page.getByRole("button", { name: /Roda da vida/ }).click();
  const nova = page.getByPlaceholder("Nova área");
  await nova.fill("Saúde");
  await nova.press("Enter");
  await page.getByRole("button", { name: "Remover área" }).first().click();
  // o clique pode ter rolado a lista; volta ao topo para a foto não depender disso
  await page.locator("[data-rolagem]").evaluate((el) => (el.scrollTop = 0));
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot("ajustes-remover-area.png");
});
