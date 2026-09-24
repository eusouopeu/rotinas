// Seções que só existem no app de desktop (Electron): mini player e servidor MCP.
import { getMiniPlayerBridge } from "../../lib/nativeBridge";
import { Botao } from "../../ui/Botao";
import { Legenda } from "../../ui/Legenda";
import { McpCard } from "./McpCard";
import { SecaoAjuste } from "./SecaoAjuste";

export function SecaoMiniPlayer() {
  return (
    <SecaoAjuste titulo="Mini player">
      <div className="pt-2.5">
        <Legenda className="mb-2.5">
          Uma janelinha sempre no topo com a etapa atual e o cronômetro, pra acompanhar a rotina enquanto usa outro app.
          Também abre pelo menu Ver → Mini player.
        </Legenda>
        <Botao variante="neutro" className="w-full" onClick={() => getMiniPlayerBridge()?.open()}>
          Abrir mini player
        </Botao>
      </div>
    </SecaoAjuste>
  );
}

export function SecaoMcp() {
  return (
    <SecaoAjuste titulo="Integrações (MCP)">
      <div className="pt-2.5">
        <McpCard />
      </div>
    </SecaoAjuste>
  );
}
