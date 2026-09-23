import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PWA de navegador do build React (13/09/2026, recomendação 4 — aposenta o
// legado como PWA). publicDir já é fonts/, então manifest, service worker e
// ícones (que moram na raiz, compartilhados com o legado) entram no bundle
// por aqui em vez de duplicados numa segunda pasta pública.
function pwaAssets(): Plugin {
  const arquivos: Array<[string, string]> = [
    ["manifest.json", "webapp/pwa/manifest.json"],
    ["sw.js", "webapp/pwa/sw.js"],
    ["icon-192.png", "icon-192.png"],
    ["icon-512.png", "icon-512.png"],
    ["icon-512-maskable.png", "icon-512-maskable.png"],
  ];
  return {
    name: "rotinas-pwa-assets",
    apply: "build",
    generateBundle() {
      for (const [fileName, src] of arquivos) {
        this.emitFile({ type: "asset", fileName, source: fs.readFileSync(path.resolve(__dirname, src)) });
      }
    },
  };
}

// Reescrita React/TypeScript do app (ver webapp/README dentro do CLAUDE.md,
// seção "webapp/"). base:"./" (paths relativos) é o que deixa a MESMA build
// funcionar em três destinos sem configuração extra: GitHub Pages num
// subpath de projeto, file:// no Electron, e o webDir do Capacitor.
export default defineConfig({
  root: path.resolve(__dirname, "webapp"),
  base: "./",
  // fonts/ já existe na raiz do repo (compartilhada com o app antigo) — aponta
  // pra lá em vez de duplicar os .woff2 dentro de webapp/public.
  publicDir: path.resolve(__dirname, "fonts"),
  plugins: [react(), pwaAssets()],
  build: {
    outDir: path.resolve(__dirname, "webapp-dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "webapp/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "webapp/src/test-setup.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
