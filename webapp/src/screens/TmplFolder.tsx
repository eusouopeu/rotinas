// Porta de renderTmplFolder (index.html:6603-6669) — pasta por tipo
// (kind:"type") e pasta-rotina (kind:"routine", as notas de journaling de uma
// rotina). Sem swipe-to-delete/undo banner ainda (confirm nativo).
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
  const kind = useAppStore((s) => s.view.folderKind) || "type";
  const routines = useAppStore((s) => s.routines);

  /* Pasta-rotina (kind:"routine") lista as notas de journaling daquela rotina;
     pasta por tipo lista os documentos do tipo (index.html:6607-6615). */
  const typeInfo = TMPL_TYPES.find((t) => t.type === key);
  const titleLabel =
    kind === "routine" ? routines.find((x) => x.id === key)?.name || "Rotina excluída" : typeInfo ? typeInfo.label : key;
  const brutos =
    kind === "routine"
      ? templates.filter((t) => t.type === "journal" && (t as { routineId?: string }).routineId === key)
      : templates.filter((t) => t.type === key);
  const docs = [...brutos].sort((a, b) => {
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
                  onClick={() => goTo({ tab: "templates", screen: "templateDoc", id: t.id, folderKind: kind, folderKey: key })}
                >
                  <h3>{("title" in t && typeof t.title === "string" && t.title) || "Sem título"}</h3>
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
                    const titulo = ("title" in t && typeof t.title === "string" && t.title) || "sem título";
                    if (window.confirm(`Excluir "${titulo}"?`)) deleteTemplateDoc(t.id);
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
