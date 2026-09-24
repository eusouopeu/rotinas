// Porta de syncCardHtml/wireSyncCard/refreshSyncCard (index.html:14269-14442)
// — card de Sincronização com nuvem (Google Drive). Delega tudo à mesma
// ponte que o app legado usa (window.electronBridge.sync no desktop, plugin
// Capacitor DriveSync no Android) — nenhuma lógica de OAuth/merge/conflito é
// reimplementada aqui. Hoje o Electron ainda carrega o app legado, não o
// build do React, então window.electronBridge não existe no runtime do
// React e este card fica inerte (não some, só não tem o que chamar) — ver
// docs/react-migration.md.
import { useEffect, useState } from "react";
import { getSyncBridge, type SyncStatus } from "../../lib/nativeBridge";
import { isDesktop, isNative } from "../../lib/storage";
import { Botao } from "../../ui/Botao";
import { Campo } from "../../ui/Campo";
import { Cartao } from "../../ui/Cartao";
import { Legenda } from "../../ui/Legenda";
import { LinhaDado } from "../../ui/LinhaDado";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { LinhaValor } from "../../ui/LinhaValor";

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
    return <Legenda>Sincronização não disponível neste app.</Legenda>;
  }
  if (erro) return <Legenda>Não foi possível carregar o status da sincronização.</Legenda>;
  if (!status) return <Legenda>Carregando status…</Legenda>;

  if (!status.hasClientCreds || forceEditCreds) {
    return (
      <>
        <LinhaValor rotulo="Google Drive" valor="não configurado" corValor="var(--sub)" />
        <Legenda className="mt-2">
          Exige um Client ID OAuth (tipo "App para computador") de um projeto seu no Google Cloud Console, com a Drive
          API ativada. Fica guardado só neste computador, nunca no repositório.
        </Legenda>
        <RotuloSecao className="mt-3.5 mb-1">Client ID</RotuloSecao>
        <Campo
          variante="modelo"
          type="text"
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <RotuloSecao className="mt-3.5 mb-1">Client Secret</RotuloSecao>
        <Campo
          variante="modelo"
          type="text"
          placeholder="GOCSPX-..."
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
        <Botao
          className="mt-3 w-full"
          onClick={async () => {
            if (!clientId.trim()) return;
            await bridge.saveClientCreds(clientId.trim(), clientSecret.trim());
            setForceEditCreds(false);
            await refresh();
          }}
        >
          Salvar credenciais
        </Botao>
      </>
    );
  }

  if (!status.connected) {
    return (
      <>
        <LinhaValor rotulo="Google Drive" valor="desconectado" corValor="var(--sub)" />
        <Legenda className="mt-2">
          Cria uma pasta "brita-sync" no seu Drive.{" "}
          {isDesktop
            ? "Sincroniza a cada 10 minutos com o app aberto."
            : 'Sincroniza sozinho ao abrir o app (se fizer um tempo desde o último) e quando você tocar em "sincronizar agora".'}{" "}
          Escopo mínimo (drive.file): o app só enxerga o que ele mesmo criar.
        </Legenda>
        <Botao
          className="mt-3 w-full"
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
        </Botao>
        {isDesktop && (
          <Botao variante="neutro" className="mt-2 w-full" onClick={() => setForceEditCreds(true)}>
            Trocar credenciais
          </Botao>
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
      <LinhaValor rotulo="Google Drive" valor="conectado" corValor="var(--ok)" />
      <Legenda className="mt-1.5">Último sync: {ultimo}.</Legenda>
      <div className="mt-3 flex gap-2">
        <Botao
          className="flex-1"
          disabled={busy === "sync"}
          onClick={async () => {
            setBusy("sync");
            await bridge.syncNow().catch(() => {});
            setBusy(null);
            await refresh();
          }}
        >
          {busy === "sync" ? "Sincronizando..." : "Sincronizar agora"}
        </Botao>
        <Botao
          variante="neutro"
          className="flex-1"
          onClick={() => {
            if (!window.confirm("Desconectar do Google Drive? O sync automático para até reconectar.")) return;
            bridge.disconnect().then(refresh);
          }}
        >
          Desconectar
        </Botao>
      </div>

      {conflitos.length > 0 && (
        <>
          <RotuloSecao className="mt-3.5 mb-1">
            Conflitos pendentes — os dois lados mudaram desde o último sync
          </RotuloSecao>
          {conflitos.map((k) => (
            <div className="my-2 flex items-center gap-2.5 py-1.5" key={k}>
              <span className="flex-1">{k}</span>
              <Botao
                variante="neutro"
                className="px-2.5 py-1 text-sm"
                onClick={() => bridge.resolveConflict(k, "local").then(refresh)}
              >
                manter local
              </Botao>
              <Botao
                variante="neutro"
                className="ml-1.5 px-2.5 py-1 text-sm"
                onClick={() => bridge.resolveConflict(k, "remote").then(refresh)}
              >
                usar remoto
              </Botao>
            </div>
          ))}
        </>
      )}

      {keys.length > 0 && (
        <>
          <RotuloSecao className="mt-4 mb-1">
            Saúde do sync — {keys.length} chave(s)
            {nuncaSincronizadas ? ` · ${nuncaSincronizadas} nunca sincronizada(s)` : ""}
          </RotuloSecao>
          <Cartao className="m-0">
            {keys.map((k) => {
              const quando = k.conflito
                ? "conflito"
                : k.syncedAt
                  ? new Date(k.syncedAt).toLocaleString("pt-BR")
                  : "nunca";
              const cor = k.conflito ? "var(--erro)" : k.syncedAt ? "var(--sub)" : "var(--caneta)";
              return <LinhaDado key={k.key} rotulo={k.key.replace("rotinas_v2_", "")} valor={quando} cor={cor} />;
            })}
            <Legenda className="mt-3">
              Chave "nunca" que já tem dado local é sinal de coleção nova que ficou fora de SYNCED_KEYS.
            </Legenda>
          </Cartao>
        </>
      )}
    </>
  );
}
