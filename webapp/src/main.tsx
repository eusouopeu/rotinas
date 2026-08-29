import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// app.css é a MESMA folha de estilo do app antigo — não duplicar/migrar para
// CSS Modules nesta fase (ver CLAUDE.md > "webapp/").
import "../../app.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
