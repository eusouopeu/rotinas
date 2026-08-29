import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  plugins: [react()],
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
