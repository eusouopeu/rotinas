// Porta parcial de renderNoteEditor (index.html:11038-11137) — título,
// assuntos (input livre, sem sugestões/chips ainda), conteúdo, excluir.
// Sem editor contínuo (live preview), backlinks, sinkChecked nem espelho
// markdown nativo ainda (ver CLAUDE.md > "webapp/" — riscos conhecidos).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { criadoEmLabel } from "../lib/notes";

export function NoteEditor() {
  const view = useAppStore((s) => s.view);
  const notes = useAppStore((s) => s.notes);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const closeNoteEditor = useAppStore((s) => s.closeNoteEditor);

  const note = notes.find((n) => n.id === view.id);
  const [subjectsInput, setSubjectsInput] = useState((note?.subjects || []).join(", "));

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

      <textarea
        className="mk-e-name"
        style={{ width: "100%", minHeight: "50vh", resize: "vertical", lineHeight: 1.6, marginTop: 10 }}
        placeholder="Escreva aqui..."
        defaultValue={note.content}
        onBlur={(e) => {
          if (e.target.value !== note.content) updateNote(note.id, { content: e.target.value });
        }}
      />

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
