// Autoteste das pontes nativas (Drive, MCP, mini player, storage, export,
// notificações) — recomendação 2 de docs/react-migration.md: essas pontes
// rodaram meses "inertes" e estrearam em produção no corte de 05/09/2026;
// aqui um botão único exercita cada canal e devolve um resultado legível,
// em vez do usuário descobrir "bug de integração nunca visto" só quando o
// dado importar de verdade.
import { useState } from "react";
import { isDesktop, isNative, load, removeKey, save } from "../lib/storage";
import { getMcpBridge, getMiniPlayerBridge, getSyncBridge } from "../lib/nativeBridge";
import { downloadFile } from "../lib/exportFile";

type Resultado = { label: string; status: "ok" | "erro" | "pulado"; detalhe: string };

const K_DIAG = "rotinas_v2_diag_probe";

async function rodarDiagnostico(): Promise<Resultado[]> {
  const out: Resultado[] = [];

  // 1) Storage: round-trip via load/save/removeKey (nunca localStorage direto).
  try {
    const marca = Date.now();
    save(K_DIAG, marca);
    const lido = load<number>(K_DIAG, 0);
    removeKey(K_DIAG);
    out.push(
      lido === marca
        ? { label: "Armazenamento local", status: "ok", detalhe: "gravação e leitura confirmadas" }
        : { label: "Armazenamento local", status: "erro", detalhe: "valor lido não confere" },
    );
  } catch (e) {
    out.push({ label: "Armazenamento local", status: "erro", detalhe: String((e as Error)?.message || e) });
  }

  // 2) Pasta de exportação (só nativo): grava um arquivo real na pasta configurada.
  if (isNative) {
    try {
      const r = await downloadFile("_diagnostico-brita.txt", `Diagnóstico Brita — ${new Date().toLocaleString("pt-BR")}`, "text/plain", undefined);
      out.push(
        r.ok
          ? { label: "Pasta de exportação", status: "ok", detalhe: r.local || "arquivo gravado" }
          : { label: "Pasta de exportação", status: "erro", detalhe: "gravação falhou (ver console)" },
      );
    } catch (e) {
      out.push({ label: "Pasta de exportação", status: "erro", detalhe: String((e as Error)?.message || e) });
    }

    // 3) Permissão de notificações locais.
    try {
      const plugin = window.Capacitor?.Plugins.LocalNotifications;
      if (!plugin) {
        out.push({ label: "Notificações locais", status: "erro", detalhe: "plugin não encontrado" });
      } else {
        const perm = await plugin.checkPermissions();
        out.push({
          label: "Notificações locais",
          status: perm.display === "granted" ? "ok" : "erro",
          detalhe: `permissão: ${perm.display}`,
        });
      }
    } catch (e) {
      out.push({ label: "Notificações locais", status: "erro", detalhe: String((e as Error)?.message || e) });
    }
  } else {
    out.push({ label: "Pasta de exportação", status: "pulado", detalhe: "só se aplica ao Android" });
    out.push({ label: "Notificações locais", status: "pulado", detalhe: "só se aplica ao Android" });
  }

  // 4) Sincronização com nuvem (Drive) — desktop ou Android.
  if (isDesktop || isNative) {
    const bridge = getSyncBridge();
    if (!bridge) {
      out.push({ label: "Sincronização com nuvem", status: "erro", detalhe: "ponte não encontrada" });
    } else {
      try {
        const s = await bridge.getStatus();
        out.push({
          label: "Sincronização com nuvem",
          status: "ok",
          detalhe: s.connected ? "conectado ao Drive" : "ponte responde, Drive não conectado",
        });
      } catch (e) {
        out.push({ label: "Sincronização com nuvem", status: "erro", detalhe: String((e as Error)?.message || e) });
      }
    }
  } else {
    out.push({ label: "Sincronização com nuvem", status: "pulado", detalhe: "só desktop/Android" });
  }

  // 5) Mini player (desktop): só confirma que a ponte existe, sem abrir janela.
  if (isDesktop) {
    out.push(
      getMiniPlayerBridge()
        ? { label: "Mini player", status: "ok", detalhe: "ponte disponível" }
        : { label: "Mini player", status: "erro", detalhe: "ponte não encontrada" },
    );
  } else {
    out.push({ label: "Mini player", status: "pulado", detalhe: "só desktop" });
  }

  // 6) MCP: desligado por decisão (dispatcher ainda não portado — ver McpCard).
  if (isDesktop) {
    const bridge = getMcpBridge();
    if (!bridge) {
      out.push({ label: "Servidor MCP", status: "erro", detalhe: "ponte não encontrada" });
    } else {
      try {
        const s = await bridge.getStatus();
        out.push({
          label: "Servidor MCP",
          status: "ok",
          detalhe: s.wired === false ? "desligado nesta versão (dispatcher não portado)" : s.running ? "ativo" : "desligado",
        });
      } catch (e) {
        out.push({ label: "Servidor MCP", status: "erro", detalhe: String((e as Error)?.message || e) });
      }
    }
  } else {
    out.push({ label: "Servidor MCP", status: "pulado", detalhe: "só desktop" });
  }

  return out;
}

const COR: Record<Resultado["status"], string> = { ok: "var(--ok)", erro: "var(--danger, #c0392b)", pulado: "var(--sub)" };
const ROTULO: Record<Resultado["status"], string> = { ok: "ok", erro: "falhou", pulado: "n/d" };

export function DiagnosticsCard() {
  const [rodando, setRodando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);

  return (
    <div className="stat-card">
      <div className="dev-n" style={{ marginBottom: 10 }}>
        Testa cada ponte nativa (armazenamento, exportação, notificações, Drive, mini player, MCP) e mostra o resultado — em vez de descobrir um bug de integração só quando o dado importar de verdade.
      </div>
      <button
        className="btn-cancel"
        style={{ width: "100%" }}
        disabled={rodando}
        onClick={async () => {
          setRodando(true);
          try {
            setResultados(await rodarDiagnostico());
          } finally {
            setRodando(false);
          }
        }}
      >
        {rodando ? "Rodando diagnóstico…" : "Rodar diagnóstico"}
      </button>
      {resultados && (
        <div style={{ marginTop: 10 }}>
          {resultados.map((r) => (
            <div className="bar-row" style={{ padding: "4px 0" }} key={r.label}>
              <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                {r.label}
                <div style={{ fontSize: 12, color: "var(--sub)" }}>{r.detalhe}</div>
              </div>
              <div className="bar-val" style={{ width: "auto", color: COR[r.status] }}>
                {ROTULO[r.status]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
