import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// app.css é a MESMA folha de estilo do app antigo — não duplicar/migrar para
// CSS Modules nesta fase (ver CLAUDE.md > "webapp/").
import "../../app.css";

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
