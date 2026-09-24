// Porta de mcpCardHtml/wireMcpCard/refreshMcpCard (index.html:14142-14215) —
// card de status do servidor MCP local (Electron, desktop). Só a UI de
// status/modo/porta/token/log. Os handlers de tool (list_routines,
// append_diario etc.) moram em lib/mcpDispatch.ts desde 13/09/2026; o aviso
// de "indisponível" abaixo só aparece se o main process desligar o disjuntor
// MCP_DISPATCH_WIRED.
import { useEffect, useState } from "react";
import { getMcpBridge, mcpConfigJson, type McpStatus } from "../../lib/nativeBridge";
import { isDesktop } from "../../lib/storage";
import { Botao } from "../../ui/Botao";
import { AreaTexto } from "../../ui/Campo";
import { LinhaNumero } from "../../ui/CampoNumero";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";
import { LinhaValor } from "../../ui/LinhaValor";

const MODOS: Array<[McpStatus["mode"], string]> = [
  ["off", "desligado"],
  ["read", "somente leitura"],
  ["write", "leitura e escrita"],
];

export function McpCard() {
  const bridge = getMcpBridge();
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [erro, setErro] = useState(false);
  const [portInput, setPortInput] = useState("");

  async function refresh() {
    if (!bridge) return;
    try {
      const s = await bridge.getStatus();
      setStatus(s);
      setPortInput(String(s.port));
      setErro(false);
    } catch {
      setErro(true);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isDesktop) return null;
  if (!bridge) return <Legenda>MCP não disponível neste app.</Legenda>;
  if (erro) return <Legenda>Não foi possível carregar o status do MCP.</Legenda>;
  if (!status) return <Legenda>Carregando status…</Legenda>;

  if (status.wired === false) {
    return (
      <Legenda>
        Servidor MCP indisponível nesta versão: o dispatcher de tools ainda não foi portado ao React (ver
        docs/react-migration.md). Fica desligado até isso ser implementado.
      </Legenda>
    );
  }

  const log = status.log || [];

  return (
    <>
      <LinhaValor
        rotulo="Servidor MCP"
        valor={status.running ? "ativo" : "desligado"}
        corValor={status.running ? "var(--ok)" : "var(--sub)"}
      />
      <Toggle
        className="mt-2"
        options={MODOS.map(([key, label]) => ({ key, label }))}
        active={status.mode}
        onSelect={async (v) => {
          await bridge.setMode(v);
          refresh();
        }}
      />
      <Legenda className="mt-2">
        Somente leitura por padrão. Ative "leitura e escrita" só se quiser que o Claude crie/edite dados diretamente.
      </Legenda>

      <LinhaNumero
        rotulo="Porta"
        min={1024}
        max={65535}
        value={portInput}
        onChange={(e) => setPortInput(e.target.value)}
      />
      <Botao
        variante="neutro"
        className="mt-2 w-full"
        onClick={async () => {
          try {
            await bridge.setPort(+portInput);
          } catch {
            /* porta inválida: refresh abaixo volta pro valor salvo */
          }
          refresh();
        }}
      >
        Salvar porta
      </Botao>

      <RotuloSecao className="mt-3.5 mb-1">Conexão</RotuloSecao>
      <AreaTexto rows={6} readOnly className="text-[11.5px] leading-[1.4]" value={mcpConfigJson(status)} />
      <div className="mt-2 flex gap-2">
        <Botao
          variante="neutro"
          className="flex-1"
          onClick={() => navigator.clipboard.writeText(mcpConfigJson(status)).catch(() => {})}
        >
          Copiar config MCP
        </Botao>
        <Botao
          variante="neutro"
          className="flex-1"
          onClick={() => {
            if (!window.confirm("Gerar um novo token invalida o acesso dos clientes MCP já configurados. Continuar?"))
              return;
            bridge.regenerateToken().then(refresh);
          }}
        >
          Gerar novo token
        </Botao>
      </div>
      <Legenda className="mt-3">
        Cole esse trecho no claude_desktop_config.json (Claude Desktop) ou aponte o Claude Code para essa URL (claude
        mcp add).
      </Legenda>

      <RotuloSecao className="mt-3.5 mb-1">Últimas chamadas</RotuloSecao>
      <div className="max-h-[180px] overflow-y-auto">
        {log.length === 0 ? (
          <Legenda>Nenhuma chamada ainda.</Legenda>
        ) : (
          log.slice(0, 20).map((l, i) => (
            <div className="my-2 flex items-center gap-2.5 py-1" key={i}>
              <span className={`flex-1 ${l.kind === "write" ? "text-caneta" : "text-sub"}`}>{l.tool}</span>
              <span className="text-sm text-sub">
                {new Date(l.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
