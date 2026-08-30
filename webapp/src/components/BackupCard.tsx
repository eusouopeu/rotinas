// Porta de exportBackup/importBackup/oferecerImportarBackup (index.html:
// 10774-11005) — só o essencial multiplataforma: exportar/importar um
// arquivo JSON. Fora do escopo: backup automático em arquivo (File System
// Access API), a cópia automática nativa (Capacitor) e o import de item
// avulso ("rotina-share"/"modelo-share") — ver CLAUDE.md > "webapp/".
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { pareceBackup, type BackupPayload } from "../lib/backup";
import { localKey } from "../lib/gamificacao";

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupPayload | null>(null);
  const [erro, setErro] = useState("");

  function exportar() {
    downloadJson("rotinas-backup-" + localKey() + ".json", backupSnapshot());
    markBackupExported();
  }

  function onFile(file: File) {
    setErro("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
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
        <div className="stat-foot">{lastBackupAt ? "Último backup: " + new Date(lastBackupAt).toLocaleDateString("pt-BR") : "Nenhum backup feito ainda."}</div>
      </div>

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
