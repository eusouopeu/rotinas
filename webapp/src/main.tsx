import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { isDesktop, isNative } from "./lib/storage";
// Tailwind v4 + o app.css legado (mesma folha do app antigo) na camada `legacy`
// — ver o comentário de styles/tailwind.css e docs/design-system.md.
import "./styles/tailwind.css";

// PWA de navegador (desde 13/09/2026 o build React substitui o legado também
// no navegador): service worker só em https fora do app nativo — Electron
// carrega file:// e o Capacitor serve em https://localhost, onde ele só
// atrapalharia a atualização do bundle empacotado.
if (!isNative && !isDesktop && "serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// id "app", não "root": app.css tem regras de layout (altura 100vh, flex
// column, escala de fonte) escritas para #app especificamente — ver
// CLAUDE.md > "webapp/".
const container = document.getElementById("app");
if (!container) throw new Error("Elemento #app não encontrado");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
