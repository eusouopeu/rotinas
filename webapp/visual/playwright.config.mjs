// Regressão visual: tira screenshots das telas com dados fixos e compara com
// a referência (ver docs/design-system.md > "Regressão visual").
//   npm run visual:baseline   — grava/atualiza a referência (rode ANTES de mexer)
//   npm run visual            — compara a tela atual com a referência
// Usa o Chromium do próprio Playwright (`npx playwright install chromium`,
// ~100 MB no cache do usuário, fora do repo). Vivaldi/Chrome de uso diário não
// servem: alguns não aceitam automação. BRITA_CHROME=/caminho força outro.
// A referência fica em webapp/visual/referencia/ (gitignorada: depende da
// máquina e das fontes), então é por máquina.
import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const PORTA = 5199;

const executablePath = process.env.BRITA_CHROME;
const base = {
  baseURL: `http://localhost:${PORTA}`,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  launchOptions: executablePath ? { executablePath } : {},
};
const celular = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: aqui,
  testMatch: ["telas.spec.mjs", "catalogo.spec.mjs", "ajustes.spec.mjs", "notas.spec.mjs", "metas.spec.mjs", "dados.spec.mjs", "boletim.spec.mjs", "rotinas.spec.mjs", "editor.spec.mjs", "player.spec.mjs", "modelos-docs.spec.mjs", "modelos-listas.spec.mjs"],
  snapshotPathTemplate: path.join(aqui, "referencia", "{projectName}", "{arg}{ext}"),
  outputDir: path.join(aqui, "resultado"),
  reporter: [["list"], ["html", { outputFolder: path.join(aqui, "relatorio"), open: "never" }]],
  fullyParallel: true,
  // alguns formulários (autoFocus) variam 1px de vez em quando sob carga; uma
  // regressão de verdade falha nas três tentativas
  retries: 2,
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.001 } },
  use: { ...base },
  projects: [
    { name: "celular-claro", use: { ...base, ...celular, colorScheme: "light" } },
    { name: "celular-escuro", use: { ...base, ...celular, colorScheme: "dark" } },
    { name: "desktop-claro", use: { ...base, ...desktop, colorScheme: "light" } },
    { name: "desktop-escuro", use: { ...base, ...desktop, colorScheme: "dark" } },
  ],
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    cwd: path.resolve(aqui, "../.."),
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
