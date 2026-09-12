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
import { Icon } from "../components/Icon";

export function Inline({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

export function MdPreview({ text }: { text: string }) {
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
    /* Layout no formato do Apple Notes (mockup do Pedro, 12/09/2026): barras
       flutuantes em pílula no topo e no rodapé, título grande e corpo sem
       moldura — a mesma linguagem vítrea da tabbar. */
    <div className="screen note-ap">
      <div className="note-ap-bar note-ap-topo">
        <div className="note-ap-pill">
          <button title="Voltar para Notas" aria-label="Voltar para Notas" onClick={closeNoteEditor}>
            <Icon name="chevronLeft" size={17} />
          </button>
        </div>
        <span className="ag-nav-gap" />
        <div className="note-ap-pill">
          <button
            className={preview ? "on" : ""}
            title={preview ? "Editar" : "Visualizar"}
            aria-label={preview ? "Editar" : "Visualizar"}
            aria-pressed={preview}
            onClick={() => setPreview((p) => !p)}
          >
            <Icon name="eye" size={17} />
          </button>
          <button
            title="Excluir nota"
            aria-label="Excluir nota"
            onClick={() => {
              if (window.confirm(`Excluir a nota "${note.title || "sem título"}"?`)) {
                deleteNote(note.id);
                closeNoteEditor();
              }
            }}
          >
            <Icon name="trash" size={17} />
          </button>
        </div>
      </div>

      <div className="note-ap-scroll">
        <input
          className="note-ap-title"
          type="text"
          placeholder="Título"
          defaultValue={note.title}
          onBlur={(e) => {
            if (e.target.value !== note.title) updateNote(note.id, { title: e.target.value });
          }}
        />
        <div className="created-stamp">{criadoEmLabel(note.createdAt)}</div>

        <input
          className="note-ap-subjects"
          type="text"
          placeholder="Assuntos (separados por vírgula)"
          value={subjectsInput}
          onChange={(e) => setSubjectsInput(e.target.value)}
          onBlur={commitSubjects}
        />

        {preview ? (
          <div className="note-ap-body">
            <MdPreview text={content} />
          </div>
        ) : (
          <textarea
            ref={textRef}
            className="note-ap-body"
            placeholder="Escreva aqui..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={(e) => commitContent(e.target.value)}
          />
        )}
      </div>

      <div className="note-ap-bar note-ap-rodape">
        <div className="note-ap-pill">
          <button
            title="Checkbox"
            aria-label="Checkbox"
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, st, en) => prefixLines(v, st, en, "- [ ] "));
            }}
          >
            <Icon name="clipboard" size={17} />
          </button>
          <button
            title="Lista"
            aria-label="Lista"
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, st, en) => prefixLines(v, st, en, "- "));
            }}
          >
            <Icon name="listBullet" size={17} />
          </button>
          <button
            title="Negrito"
            aria-label="Negrito"
            onMouseDown={(e) => {
              e.preventDefault();
              aplicarNaSelecao((v, st, en) => wrapSelection(v, st, en, "**", "**"));
            }}
          >
            <strong style={{ fontSize: 16 }}>B</strong>
          </button>
        </div>
        <span className="ag-nav-gap" />
        <div className="note-ap-pill">
          <button title="Concluir edição" aria-label="Concluir edição" onClick={closeNoteEditor}>
            <Icon name="check" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
