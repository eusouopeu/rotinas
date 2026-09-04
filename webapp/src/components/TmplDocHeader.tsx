// Porta de tmplHeader (index.html:6730-6768) — cabeçalho comum dos
// documentos de Modelos: voltar (pra pasta de onde veio), título editável,
// data de criação, excluir e compartilhar/exportar.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { criadoEmLabel } from "../lib/notes";
import { modeloShareData } from "../lib/backup";
import { shareOrDownload, slugify } from "../lib/exportFile";
import { mdTypeLabel, subpastaDoTipo } from "../lib/templates";
import type { AnyTemplateDoc } from "../lib/types";

export function TmplDocHeader({ doc, onTitleChange }: { doc: AnyTemplateDoc; onTitleChange: (title: string) => void }) {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const deleteTemplateDoc = useAppStore((s) => s.deleteTemplateDoc);

  const title = "title" in doc && typeof doc.title === "string" ? doc.title : "";
  const createdAt = typeof (doc as { createdAt?: unknown }).createdAt === "number" ? (doc as { createdAt: number }).createdAt : Date.now();

  function back() {
    if (view.folderKind && view.folderKey) {
      goTo({ tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey });
    } else {
      goTo({ tab: "templates", screen: "templateFolders" });
    }
  }

  async function handleShare() {
    const data = modeloShareData(doc);
    const name = title.trim() || mdTypeLabel(doc.type);
    const filename = slugify(name).slice(0, 40) + ".json";
    await shareOrDownload(filename, JSON.stringify(data, null, 2), "application/json", subpastaDoTipo(doc.type));
  }

  return (
    <>
      <div className="topbar">
        <button className="link-btn muted" onClick={back}>
          &larr; Modelos
        </button>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            className="icon-btn"
            title="Compartilhar"
            aria-label="Compartilhar"
            onClick={handleShare}
          >
            <Icon name="arrowUpTray" size={14} />
          </button>
          <button
            className="icon-btn"
            title="Excluir"
            aria-label="Excluir"
            onClick={() => {
              if (window.confirm(`Excluir "${title || "sem título"}"?`)) {
                deleteTemplateDoc(doc.id);
                back();
              }
            }}
          >
            <Icon name="xmark" size={14} />
          </button>
        </div>
      </div>
      <input
        className="note-title-input"
        type="text"
        defaultValue={title}
        onBlur={(e) => {
          if (e.target.value !== title) onTitleChange(e.target.value);
        }}
      />
      <div className="created-stamp">{criadoEmLabel(createdAt)}</div>
    </>
  );
}

