// Porta de exportBackup/importBackup/oferecerImportarBackup (index.html:
// 10774-11005), incluindo import de item avulso ("rotina-share"/
// "modelo-share"), e do backup automático em arquivo no navegador
// (index.html:10812-10914, ver lib/fileBackup.ts) — exportar/importar um
// arquivo JSON, e opcionalmente manter um arquivo do disco sempre
// atualizado sozinho (grava ao sair da aba, checa por versão mais nova ao
// voltar). Fora do escopo: a cópia automática nativa (ver lib/autoBackup.ts).
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import { ehModeloShare, ehRotinaShare, pareceBackup, type BackupPayload } from "../lib/backup";
import { localKey } from "../lib/gamificacao";
import {
  backupHandle,
  checarBackupMaisRecente,
  desligarBackupArquivo,
  escolherArquivoBackup,
  gravarBackupArquivo,
  marcarBackupArquivoVisto,
  supportsFileBackup,
} from "../lib/fileBackup";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BackupCard() {
  const routines = useAppStore((s) => s.routines);
  const notes = useAppStore((s) => s.notes);
  const templates = useAppStore((s) => s.templates);
  const history = useAppStore((s) => s.history);
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const backupSnapshot = useAppStore((s) => s.backupSnapshot);
  const markBackupExported = useAppStore((s) => s.markBackupExported);
  const importBackup = useAppStore((s) => s.importBackup);
  const importRotinaShare = useAppStore((s) => s.importRotinaShare);
  const importModeloShare = useAppStore((s) => s.importModeloShare);
  const goTo = useAppStore((s) => s.goTo);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupPayload | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ativo, setAtivo] = useState(() => !!backupHandle());
  const [maisRecente, setMaisRecente] = useState<BackupPayload | null>(null);

  function exportar() {
    downloadJson("rotinas-backup-" + localKey() + ".json", backupSnapshot());
    markBackupExported();
  }

  // Grava ao sair/minimizar (fim natural de sessão) e checa por uma versão
  // mais nova ao voltar — mesmo par leitura/escrita do outro lado da
  // sincronização "de graça" (index.html:10906-10914).
  useEffect(() => {
    if (!ativo || !supportsFileBackup()) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") gravarBackupArquivo(backupSnapshot, {});
      else checarBackupMaisRecente().then((d) => d && setMaisRecente(d));
    };
    document.addEventListener("visibilitychange", onVisibility);
    checarBackupMaisRecente().then((d) => d && setMaisRecente(d)); // também checa uma vez ao abrir a aba
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  async function ativarBackupArquivo() {
    setErro("");
    const r = await escolherArquivoBackup(backupSnapshot);
    if (r.ok) {
      setAtivo(true);
      markBackupExported();
    } else if (r.erro) setErro(r.erro);
  }

  function desativarBackupArquivo() {
    desligarBackupArquivo();
    setAtivo(false);
  }

  function onFile(file: File) {
    setErro("");
    setAviso("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (ehRotinaShare(data)) {
          const nome = importRotinaShare(data.routine);
          setAviso(`Rotina "${nome}" importada ✓`);
          return;
        }
        if (ehModeloShare(data)) {
          const doc = importModeloShare(data.doc);
          const titulo = (doc as { title?: string }).title || doc.type;
          setAviso(`Modelo "${titulo}" importado ✓`);
          goTo({ tab: "templates", screen: "templateDoc", id: doc.id });
          return;
        }
        if (!pareceBackup(data)) {
          setErro("Arquivo não parece um backup do Rotinas");
          return;
        }
        setPending(data);
      } catch {
        setErro("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  }

  function resolver(mode: "merge" | "replace") {
    if (!pending) return;
    importBackup(pending, mode);
    if (pending.exportedAt) marcarBackupArquivoVisto(pending.exportedAt);
    setPending(null);
  }

  return (
    <>
      <div className="section-label">Dados</div>
      <div className="stat-card">
        <div className="routine-meta">
          {routines.length} rotina(s) · {notes.length} nota(s) · {templates.length} modelo(s) · {history.length} execução(ões)
        </div>
      </div>

      <div className="section-label">Backup</div>
      <div className="stat-card">
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-cancel" style={{ flex: 1 }} onClick={exportar}>
            Exportar agora
          </button>
          <button className="btn-cancel" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>
            Importar
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        {erro && (
          <div className="stat-foot" style={{ color: "var(--erro)" }}>
            {erro}
          </div>
        )}
        {aviso && <div className="stat-foot">{aviso}</div>}
        <div className="stat-foot">{lastBackupAt ? "Último backup: " + new Date(lastBackupAt).toLocaleDateString("pt-BR") : "Nenhum backup feito ainda."}</div>
      </div>

      {supportsFileBackup() && (
        <>
          <div className="section-label">Backup automático em arquivo</div>
          <div className="stat-card">
            {ativo ? (
              <>
                <div className="stat-foot" style={{ marginBottom: 8 }}>
                  Ativo — o app mantém o arquivo escolhido sempre atualizado sozinho.
                </div>
                <button className="btn-cancel" style={{ width: "100%" }} onClick={desativarBackupArquivo}>
                  Desativar
                </button>
              </>
            ) : (
              <>
                <div className="stat-foot" style={{ marginBottom: 8 }}>
                  Escolha um arquivo no disco (ex.: numa pasta sincronizada por outro app) e o Rotinas o mantém atualizado sozinho.
                </div>
                <button className="btn-cancel" style={{ width: "100%" }} onClick={ativarBackupArquivo}>
                  Ativar
                </button>
              </>
            )}
          </div>
        </>
      )}

      {maisRecente && (
        <div className="alert-banner undo-banner">
          <span>Backup mais recente encontrado (de outro aparelho)</span>
          <button
            className="undo-btn"
            onClick={() => {
              setPending(maisRecente);
              setMaisRecente(null);
            }}
          >
            Importar
          </button>
          <button
            className="undo-btn"
            title="Dispensar"
            aria-label="Dispensar"
            onClick={() => {
              if (maisRecente.exportedAt) marcarBackupArquivoVisto(maisRecente.exportedAt);
              setMaisRecente(null);
            }}
          >
            <Icon name="xmark" size={13} />
          </button>
        </div>
      )}

      {pending && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setPending(null)}>
          <div className="confirm-box">
            <p>
              Importar backup:
              <br />
              <small>
                {(pending.routines?.length as number) || 0} rotina(s), {(pending.notes?.length as number) || 0} nota(s),{" "}
                {(pending.history?.length as number) || 0} execução(ões).
              </small>
            </p>
            <div className="confirm-actions" style={{ flexDirection: "column" }}>
              <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={() => resolver("merge")}>
                Mesclar com os dados atuais
              </button>
              <button className="btn-confirm" onClick={() => resolver("replace")}>
                Substituir tudo
              </button>
              <button className="btn-cancel" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
