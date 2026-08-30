// Porta de syncCardHtml/wireSyncCard/refreshSyncCard (index.html:14269-14442)
// — card de Sincronização com nuvem (Google Drive). Delega tudo à mesma
// ponte que o app legado usa (window.electronBridge.sync no desktop, plugin
// Capacitor DriveSync no Android) — nenhuma lógica de OAuth/merge/conflito é
// reimplementada aqui. Hoje o Electron ainda carrega o app legado, não o
// build do React, então window.electronBridge não existe no runtime do
// React e este card fica inerte (não some, só não tem o que chamar) — ver
// docs/react-migration.md.
import { useEffect, useState } from "react";
import { getSyncBridge, type SyncStatus } from "../lib/nativeBridge";
import { isDesktop, isNative } from "../lib/storage";

export function SyncCard() {
  const bridge = getSyncBridge();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [erro, setErro] = useState(false);
  const [forceEditCreds, setForceEditCreds] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!bridge) return;
    try {
      setStatus(await bridge.getStatus());
      setErro(false);
    } catch {
      setErro(true);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isDesktop && !isNative) return null;
  if (!bridge) {
    return <div className="routine-meta">Sincronização não disponível neste app.</div>;
  }
  if (erro) return <div className="routine-meta">Não foi possível carregar o status da sincronização.</div>;
  if (!status) return <div className="routine-meta">Carregando status…</div>;

  if (!status.hasClientCreds || forceEditCreds) {
    return (
      <>
        <div className="bar-row">
          <div className="bar-name" style={{ width: "auto", flex: 1 }}>
            Google Drive
          </div>
          <div className="bar-val" style={{ width: "auto", color: "var(--sub)" }}>
            não configurado
          </div>
        </div>
        <div className="stat-foot" style={{ marginTop: 8 }}>
          Exige um Client ID OAuth (tipo "App para computador") de um projeto seu no Google Cloud Console, com a Drive API ativada. Fica guardado só neste
          computador, nunca no repositório.
        </div>
        <div className="section-label" style={{ margin: "14px 0 4px" }}>
          Client ID
        </div>
        <input type="text" className="mk-e-name" placeholder="xxxxxxxx.apps.googleusercontent.com" value={clientId} onChange={(e) => setClientId(e.target.value)} />
        <div className="section-label" style={{ margin: "14px 0 4px" }}>
          Client Secret
        </div>
        <input type="text" className="mk-e-name" placeholder="GOCSPX-..." value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 12 }}
          onClick={async () => {
            if (!clientId.trim()) return;
            await bridge.saveClientCreds(clientId.trim(), clientSecret.trim());
            setForceEditCreds(false);
            await refresh();
          }}
        >
          Salvar credenciais
        </button>
      </>
    );
  }

  if (!status.connected) {
    return (
      <>
        <div className="bar-row">
          <div className="bar-name" style={{ width: "auto", flex: 1 }}>
            Google Drive
          </div>
          <div className="bar-val" style={{ width: "auto", color: "var(--sub)" }}>
            desconectado
          </div>
        </div>
        <div className="stat-foot" style={{ marginTop: 8 }}>
          Cria uma pasta "brita-sync" no seu Drive.{" "}
          {isDesktop
            ? "Sincroniza a cada 10 minutos com o app aberto."
            : 'Sincroniza sozinho ao abrir o app (se fizer um tempo desde o último) e quando você tocar em "sincronizar agora".'}{" "}
          Escopo mínimo (drive.file): o app só enxerga o que ele mesmo criar.
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 12 }}
          disabled={busy === "connect"}
          onClick={async () => {
            setBusy("connect");
            try {
              await bridge.connect();
            } catch {
              /* falha de conexão: status recarregado abaixo já reflete desconectado */
            }
            setBusy(null);
            await refresh();
          }}
        >
          {busy === "connect" ? "Abrindo o navegador..." : "Conectar ao Google Drive"}
        </button>
        {isDesktop && (
          <button className="btn-cancel" style={{ width: "100%", marginTop: 8 }} onClick={() => setForceEditCreds(true)}>
            Trocar credenciais
          </button>
        )}
      </>
    );
  }

  const ultimo = status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("pt-BR") : "ainda não sincronizou";
  const conflitos = status.pendingConflicts || [];
  const keys = status.keys || [];
  const nuncaSincronizadas = keys.filter((k) => !k.syncedAt).length;

  return (
    <>
      <div className="bar-row">
        <div className="bar-name" style={{ width: "auto", flex: 1 }}>
          Google Drive
        </div>
        <div className="bar-val" style={{ width: "auto", color: "var(--ok)" }}>
          conectado
        </div>
      </div>
      <div className="stat-foot" style={{ marginTop: 6 }}>
        Último sync: {ultimo}.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          disabled={busy === "sync"}
          onClick={async () => {
            setBusy("sync");
            await bridge.syncNow().catch(() => {});
            setBusy(null);
            await refresh();
          }}
        >
          {busy === "sync" ? "Sincronizando..." : "Sincronizar agora"}
        </button>
        <button
          className="btn-cancel"
          style={{ flex: 1 }}
          onClick={() => {
            if (!window.confirm("Desconectar do Google Drive? O sync automático para até reconectar.")) return;
            bridge.disconnect().then(refresh);
          }}
        >
          Desconectar
        </button>
      </div>

      {conflitos.length > 0 && (
        <>
          <div className="section-label" style={{ margin: "14px 0 4px" }}>
            Conflitos pendentes — os dois lados mudaram desde o último sync
          </div>
          {conflitos.map((k) => (
            <div className="bar-row" style={{ padding: "6px 0", alignItems: "center" }} key={k}>
              <span style={{ flex: 1 }}>{k}</span>
              <button
                className="btn-cancel"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => bridge.resolveConflict(k, "local").then(refresh)}
              >
                manter local
              </button>
              <button
                className="btn-cancel"
                style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }}
                onClick={() => bridge.resolveConflict(k, "remote").then(refresh)}
              >
                usar remoto
              </button>
            </div>
          ))}
        </>
      )}

      {keys.length > 0 && (
        <>
          <div className="section-label" style={{ margin: "16px 0 4px" }}>
            Saúde do sync — {keys.length} chave(s){nuncaSincronizadas ? ` · ${nuncaSincronizadas} nunca sincronizada(s)` : ""}
          </div>
          <div className="stat-card" style={{ margin: 0 }}>
            {keys.map((k) => {
              const quando = k.conflito ? "conflito" : k.syncedAt ? new Date(k.syncedAt).toLocaleString("pt-BR") : "nunca";
              const cor = k.conflito ? "var(--erro)" : k.syncedAt ? "var(--sub)" : "var(--caneta)";
              return (
                <div className="dev-row" key={k.key}>
                  <span>{k.key.replace("rotinas_v2_", "")}</span>
                  <b className="dev-n wide" style={{ color: cor }}>
                    {quando}
                  </b>
                </div>
              );
            })}
            <div className="stat-foot">Chave "nunca" que já tem dado local é sinal de coleção nova que ficou fora de SYNCED_KEYS.</div>
          </div>
        </>
      )}
    </>
  );
}
