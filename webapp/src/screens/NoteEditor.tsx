// Porta parcial de renderNoteEditor (index.html:11038-11137) — título,
// assuntos (input livre, sem sugestões/chips ainda), conteúdo, excluir.
// Sem backlinks nem sinkChecked ainda. Editor contínuo (live preview,
// renderLiveEditor/liveAplicar do legado) é decisão definitiva de NÃO
// portar — ver docs/react-migration.md, 30/08/2026. Este textarea simples
// é o editor de nota permanente no React.
//
// Recomendação 11 (08/09/2026): toolbar de negrito/lista/checkbox por
// manipulação de seleção do textarea + toggle de preview renderizado —
// ~80% do valor do editor contínuo sem nenhum contenteditable (ver
// lib/mdPreview.ts).
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { criadoEmLabel } from "../lib/notes";
import { parseMdLines, prefixLines, splitBold, wrapSelection } from "../lib/mdPreview";

function Inline({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

function MdPreview({ text }: { text: string }) {
  const linhas = parseMdLines(text);
  if (!text.trim()) return <p style={{ color: "var(--sub)" }}>Nota vazia.</p>;
  return (
    <div style={{ lineHeight: 1.6 }}>
      {linhas.map((l, i) => {
        if (l.type === "blank") return <div key={i} style={{ height: 10 }} />;
        if (l.type === "heading") {
          const Tag = (`h${l.level}`) as "h1" | "h2" | "h3";
          return (
            <Tag key={i} style={{ margin: "10px 0 4px" }}>
              <Inline text={l.text} />
            </Tag>
          );
        }
        if (l.type === "checkbox") {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "3px 0" }}>
              <input type="checkbox" checked={l.checked} readOnly style={{ marginTop: 4 }} />
              <span style={{ textDecoration: l.checked ? "line-through" : "none", color: l.checked ? "var(--sub)" : "inherit" }}>
                <Inline text={l.text} />
              </span>
            </div>
          );
        }
        if (l.type === "bullet") {
          return (
            <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0" }}>
              <span>&bull;</span>
              <span>
                <Inline text={l.text} />
              </span>
            </div>
          );
        }
        return (
          <div key={i} style={{ margin: "3px 0" }}>
            <Inline text={l.text} />
          </div>
        );
      })}
    </div>
  );
}

export function NoteEditor() {
  const view = useAppStore((s) => s.view);
  const notes = useAppStore((s) => s.notes);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const closeNoteEditor = useAppStore((s) => s.closeNoteEditor);

  const note = notes.find((n) => n.id === view.id);
  const [subjectsInput, setSubjectsInput] = useState((note?.subjects || []).join(", "));
  const [content, setContent] = useState(note?.content || "");
  const [preview, setPreview] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(note?.content || "");
    setSubjectsInput((note?.subjects || []).join(", "));
    setPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) {
    closeNoteEditor();
    return null;
  }

  function commitSubjects() {
    const vals = subjectsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateNote(note!.id, { subjects: vals });
  }

  function commitContent(v: string) {
    setContent(v);
    if (v !== note!.content) updateNote(note!.id, { content: v });
  }

  function aplicarNaSelecao(fn: (value: string, start: number, end: number) => { value: string; start: number; end: number }) {
    const el = textRef.current;
    if (!el) return;
    const { value, start, end } = fn(content, el.selectionStart, el.selectionEnd);
    commitContent(value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  return (
    <div className="screen" style={{ paddingBottom: 16 }}>
      <div className="note-topbar">
        <button className="link-btn muted" onClick={closeNoteEditor}>
          &larr; Notas
        </button>
        <button className="btn-save-note" onClick={closeNoteEditor}>
          Salvar
        </button>
      </div>

      <input
        className="note-title-input"
        type="text"
        placeholder="Título"
        defaultValue={note.title}
        onBlur={(e) => {
          if (e.target.value !== note.title) updateNote(note.id, { title: e.target.value });
        }}
      />
      <div className="created-stamp">{criadoEmLabel(note.createdAt)}</div>

      <input
        style={{ width: "100%", margin: "10px 0 4px" }}
        className="note-title-input"
        type="text"
        placeholder="Assuntos (separados por vírgula)"
        value={subjectsInput}
        onChange={(e) => setSubjectsInput(e.target.value)}
        onBlur={commitSubjects}
      />

      <div className="type-toggle" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <span
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, s, en) => wrapSelection(v, s, en, "**", "**"));
            }}
            title="Negrito"
          >
            <strong>B</strong>
          </span>
          <span
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, s, en) => prefixLines(v, s, en, "- "));
            }}
            title="Lista"
          >
            •
          </span>
          <span
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, s, en) => prefixLines(v, s, en, "- [ ] "));
            }}
            title="Checkbox"
          >
            ☑
          </span>
        </div>
        <span className={preview ? "active" : ""} onClick={() => setPreview((p) => !p)}>
          {preview ? "editar" : "visualizar"}
        </span>
      </div>

      {preview ? (
        <div className="mk-e-name" style={{ width: "100%", minHeight: "50vh", marginTop: 6, padding: 10, boxSizing: "border-box" }}>
          <MdPreview text={content} />
        </div>
      ) : (
        <textarea
          ref={textRef}
          className="mk-e-name"
          style={{ width: "100%", minHeight: "50vh", resize: "vertical", lineHeight: 1.6, marginTop: 6 }}
          placeholder="Escreva aqui..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={(e) => commitContent(e.target.value)}
        />
      )}

      <div className="note-footer">
        <button
          className="btn-danger-outline"
          onClick={() => {
            if (window.confirm(`Excluir a nota "${note.title || "sem título"}"?`)) {
              deleteNote(note.id);
              closeNoteEditor();
            }
          }}
        >
          excluir
        </button>
      </div>
    </div>
  );
}
