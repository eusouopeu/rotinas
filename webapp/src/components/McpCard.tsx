// Porta de mcpCardHtml/wireMcpCard/refreshMcpCard (index.html:14142-14215) —
// card de status do servidor MCP local (Electron, desktop). Só a UI de
// status/modo/porta/token/log: os handlers de tool (list_routines,
// append_diario etc., index.html:14520-14620) continuam fora do escopo —
// dependem de kanban do Diário, exercícios e outras coleções ainda não
// portadas ao React (ver docs/react-migration.md).
import { useEffect, useState } from "react";
import { getMcpBridge, mcpConfigJson, type McpStatus } from "../lib/nativeBridge";
import { isDesktop } from "../lib/storage";

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
  if (!bridge) return <div className="routine-meta">MCP não disponível neste app.</div>;
  if (erro) return <div className="routine-meta">Não foi possível carregar o status do MCP.</div>;
  if (!status) return <div className="routine-meta">Carregando status…</div>;

  const log = status.log || [];

  return (
    <>
      <div className="bar-row">
        <div className="bar-name" style={{ width: "auto", flex: 1 }}>
          Servidor MCP
        </div>
        <div className="bar-val" style={{ width: "auto", color: status.running ? "var(--ok)" : "var(--sub)" }}>
          {status.running ? "ativo" : "desligado"}
        </div>
      </div>
      <div className="type-toggle" style={{ marginTop: 8 }}>
        {MODOS.map(([v, l]) => (
          <span
            key={v}
            className={status.mode === v ? "active" : ""}
            onClick={async () => {
              await bridge.setMode(v);
              refresh();
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="stat-foot" style={{ marginTop: 8 }}>
        Somente leitura por padrão. Ative "leitura e escrita" só se quiser que o Claude crie/edite dados diretamente.
      </div>

      <div className="sched-time-row" style={{ marginTop: 14 }}>
        <span style={{ flex: 1 }}>Porta</span>
        <input className="dur-input" type="number" min={1024} max={65535} value={portInput} onChange={(e) => setPortInput(e.target.value)} />
      </div>
      <button
        className="btn-cancel"
        style={{ width: "100%", marginTop: 8 }}
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
      </button>

      <div className="section-label" style={{ margin: "14px 0 4px" }}>
        Conexão
      </div>
      <textarea
        className="mk-e-name"
        rows={6}
        readOnly
        style={{ width: "100%", fontFamily: "'Montserrat', sans-serif", fontSize: 11.5, lineHeight: 1.4 }}
        value={mcpConfigJson(status)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          className="btn-cancel"
          style={{ flex: 1 }}
          onClick={() => navigator.clipboard.writeText(mcpConfigJson(status)).catch(() => {})}
        >
          Copiar config MCP
        </button>
        <button
          className="btn-cancel"
          style={{ flex: 1 }}
          onClick={() => {
            if (!window.confirm("Gerar um novo token invalida o acesso dos clientes MCP já configurados. Continuar?")) return;
            bridge.regenerateToken().then(refresh);
          }}
        >
          Gerar novo token
        </button>
      </div>
      <div className="stat-foot">Cole esse trecho no claude_desktop_config.json (Claude Desktop) ou aponte o Claude Code para essa URL (claude mcp add).</div>

      <div className="section-label" style={{ margin: "14px 0 4px" }}>
        Últimas chamadas
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {log.length === 0 ? (
          <div className="routine-meta">Nenhuma chamada ainda.</div>
        ) : (
          log.slice(0, 20).map((l, i) => (
            <div className="bar-row" style={{ padding: "4px 0" }} key={i}>
              <span style={{ flex: 1, color: l.kind === "write" ? "var(--caneta)" : "var(--sub)" }}>{l.tool}</span>
              <span style={{ color: "var(--sub)", fontSize: 12 }}>
                {new Date(l.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
