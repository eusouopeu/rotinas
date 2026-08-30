// Porta de tmplHeader (index.html:6730-6768) — cabeçalho comum dos
// documentos de Modelos: voltar (pra pasta de onde veio), título editável,
// data de criação, excluir. Sem compartilhar/exportar ainda.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { criadoEmLabel } from "../lib/notes";

interface DocBase {
  id: string;
  title: string;
  createdAt: number;
}

export function TmplDocHeader({ doc, onTitleChange }: { doc: DocBase; onTitleChange: (title: string) => void }) {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const deleteTemplateDoc = useAppStore((s) => s.deleteTemplateDoc);

  function back() {
    if (view.folderKind && view.folderKey) {
      goTo({ tab: "templates", screen: "tmplFolder", folderKind: view.folderKind, folderKey: view.folderKey });
    } else {
      goTo({ tab: "templates", screen: "templateFolders" });
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="link-btn muted" onClick={back}>
          &larr; Modelos
        </button>
        <div style={{ display: "flex", gap: 7 }}>
          <button
            className="icon-btn"
            title="Excluir"
            aria-label="Excluir"
            onClick={() => {
              if (window.confirm(`Excluir "${doc.title || "sem título"}"?`)) {
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
        defaultValue={doc.title}
        onBlur={(e) => {
          if (e.target.value !== doc.title) onTitleChange(e.target.value);
        }}
      />
      <div className="created-stamp">{criadoEmLabel(doc.createdAt)}</div>
    </>
  );
}
