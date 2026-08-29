// Porta parcial de renderNotes (index.html:4785-4902) — busca, filtro por
// tag, pin, excluir (com confirm, sem undo banner ainda), FAB de nova nota.
// Sem backup/importar/paginação "carregar mais" nesta fase.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { allTags, extractTags, relativeTime, stripMdForSnippet } from "../lib/notes";

export function Notes() {
  const notes = useAppStore((s) => s.notes);
  const openNote = useAppStore((s) => s.openNote);
  const toggleNotePinned = useAppStore((s) => s.toggleNotePinned);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = allTags(notes);
  const q = query.trim().toLowerCase();
  let filtered = notes.filter((n) => !q || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q));
  if (tag) filtered = filtered.filter((n) => extractTags(n).includes(tag));
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Notas</h1>
        </div>

        <input
          type="search"
          className="note-search"
          placeholder="Buscar notas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {tags.length > 0 && (
          <div className="tag-bar">
            {tags.map((t) => (
              <span key={t} className={"tag-chip" + (tag === t ? " active" : "")} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="notes-list" style={{ flex: "0 0 auto", overflow: "visible" }}>
          {sorted.length === 0 ? (
            <div className="empty-state" style={{ minHeight: "40vh" }}>
              {q || tag ? (
                <>
                  <h2>Nada encontrado</h2>
                  <p>Nenhuma nota corresponde ao filtro.</p>
                </>
              ) : (
                <>
                  <h2>Nenhuma nota ainda</h2>
                  <p>Listas de compras, tarefas, notas de estudo — tudo rápido, em markdown.</p>
                  <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => openNote(null)}>
                    + Nova nota
                  </button>
                </>
              )}
            </div>
          ) : (
            sorted.map((n) => (
              <div key={n.id} className="note-card">
                <div className="note-info" onClick={() => openNote(n.id)}>
                  <h3>
                    {n.pinned && <span className="pin-mark">&#9733; </span>}
                    {n.title || "Sem título"}
                  </h3>
                  <div className="note-snippet">{stripMdForSnippet(n.content)}</div>
                  <div className="routine-meta" style={{ marginTop: 6 }}>
                    {relativeTime(n.updatedAt)}
                    {(n.subjects || []).length > 0 && " · " + n.subjects!.slice(0, 3).join(", ") + (n.subjects!.length > 3 ? "…" : "")}
                  </div>
                </div>
                <button
                  className={"icon-btn borderless pin-btn" + (n.pinned ? " pinned" : "")}
                  title="Fixar nota"
                  aria-label="Fixar nota"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNotePinned(n.id);
                  }}
                >
                  &#9733;
                </button>
                <button
                  className="icon-btn borderless"
                  title="Excluir nota"
                  aria-label="Excluir nota"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir a nota "${n.title || "sem título"}"?`)) deleteNote(n.id);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="fab" title="Novo" onClick={() => openNote(null)}>
        +
      </button>
      <Tabbar />
    </div>
  );
}
