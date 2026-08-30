// Porta parcial de renderTmplFolder (index.html:6596-6669) — só a pasta por
// tipo (kind:"type"); pasta-rotina (journaling) fica para quando essas notas
// existirem no React. Sem swipe-to-delete/undo banner ainda (confirm nativo).
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { relativeTime } from "../lib/notes";
import { TMPL_TYPES, tmplMeta } from "../lib/templates";

export function TmplFolder() {
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const createTemplateDoc = useAppStore((s) => s.createTemplateDoc);
  const deleteTemplateDoc = useAppStore((s) => s.deleteTemplateDoc);
  const key = useAppStore((s) => s.view.folderKey) || "";

  const typeInfo = TMPL_TYPES.find((t) => t.type === key);
  const titleLabel = typeInfo ? typeInfo.label : key;
  const docs = [...templates.filter((t) => t.type === key)].sort((a, b) => {
    const au = typeof a.updatedAt === "number" ? a.updatedAt : 0;
    const bu = typeof b.updatedAt === "number" ? b.updatedAt : 0;
    return bu - au;
  });

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header">
          <h1 style={{ fontSize: 22 }}>
            <span
              style={{ cursor: "pointer", color: "var(--sub)", fontSize: 22 }}
              onClick={() => goTo({ tab: "templates", screen: "templateFolders" })}
            >
              <Icon name="chevronLeft" size={18} />
            </span>{" "}
            {titleLabel}
          </h1>
        </div>

        {docs.length === 0 ? (
          <div className="empty-state">
            <h2>Pasta vazia</h2>
            <p>Crie o primeiro documento aqui.</p>
          </div>
        ) : (
          <div className="notes-list" style={{ flex: "0 0 auto", overflow: "visible" }}>
            {docs.map((t) => (
              <div key={t.id} className="note-card">
                <div
                  className="note-info"
                  onClick={() => goTo({ tab: "templates", screen: "templateDoc", id: t.id, folderKind: "type", folderKey: key })}
                >
                  <h3>{(t.title as string) || "Sem título"}</h3>
                  <div className="routine-meta" style={{ marginTop: 4 }}>
                    {tmplMeta(t)} · {relativeTime(typeof t.updatedAt === "number" ? t.updatedAt : 0)}
                  </div>
                </div>
                <button
                  className="icon-btn borderless"
                  title="Excluir"
                  aria-label="Excluir"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir "${t.title || "sem título"}"?`)) deleteTemplateDoc(t.id);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" title="Novo" onClick={() => createTemplateDoc(key, "type", key)}>
        +
      </button>
      <Tabbar />
    </div>
  );
}
