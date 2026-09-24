// Porta parcial de renderNoteEditor (index.html:11038-11137) — título,
// assuntos (input livre, sem sugestões/chips ainda), conteúdo, excluir.
// Sem backlinks nem sinkChecked ainda. Desde 12/09/2026 (pedido explícito do
// Pedro, revertendo a decisão de 30/08) o corpo é o editor live
// (components/LiveMdEditor.tsx): linha ativa crua, demais renderizadas. A
// toolbar de checkbox/lista/negrito age sobre a seleção da linha ativa.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { criadoEmLabel } from "../lib/notes";
import {
  indentLines,
  inserirTabela,
  parseMdLines,
  prefixLines,
  prefixOrdered,
  splitBold,
  wrapSelection,
} from "../lib/mdPreview";
import { Icon } from "../components/Icon";
import { LiveMdEditor, type LiveMdEditorHandle } from "../components/LiveMdEditor";
import { BarraNota, BotaoNota, CabecaNota, PilulaNota } from "../features/notas/BarrasNota";
import { tela } from "../ui/Tela";

export function Inline({ text }: { text: string }) {
  return (
    <>{splitBold(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}</>
  );
}

export function MdPreview({ text }: { text: string }) {
  const linhas = parseMdLines(text);
  if (!text.trim()) return <p className="text-sub">Nota vazia.</p>;
  return (
    <div className="leading-[1.6]">
      {linhas.map((l, i) => {
        if (l.type === "blank") return <div key={i} className="h-2.5" />;
        if (l.type === "heading") {
          const Tag = `h${l.level}` as "h1" | "h2" | "h3";
          return (
            <Tag key={i} className="mt-2.5 mb-1">
              <Inline text={l.text} />
            </Tag>
          );
        }
        if (l.type === "checkbox") {
          return (
            <div key={i} className="my-[3px] flex items-start gap-2">
              <input type="checkbox" checked={l.checked} readOnly className="mt-1" />
              <span className={l.checked ? "text-sub line-through" : undefined}>
                <Inline text={l.text} />
              </span>
            </div>
          );
        }
        if (l.type === "bullet" || l.type === "ordered") {
          return (
            <div key={i} className="my-[3px] flex gap-2">
              <span>{l.type === "ordered" ? l.marker : "•"}</span>
              <span>
                <Inline text={l.text} />
              </span>
            </div>
          );
        }
        return (
          <div key={i} className="my-[3px]">
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
  /* Estilizado x cru: preferência de sessão, não de nota — o Pedro alterna
     para conferir sintaxe e volta, não é atributo do documento. */
  const [cru, setCru] = useState(false);
  const [content, setContent] = useState(note?.content || "");
  const editorRef = useRef<LiveMdEditorHandle>(null);

  useEffect(() => {
    setContent(note?.content || "");
    setSubjectsInput((note?.subjects || []).join(", "));
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

  function aplicarNaSelecao(
    fn: (value: string, start: number, end: number) => { value: string; start: number; end: number }
  ) {
    editorRef.current?.aplicar(fn);
  }

  return (
    /* Layout no formato do Apple Notes (mockup do Pedro, 12/09/2026): barras
       flutuantes em pílula no topo e no rodapé, título grande e corpo sem
       moldura — a mesma linguagem vítrea da tabbar. */
    <div {...tela({}, "h-full p-0 desktop:px-10 paisagem:px-4")}>
      <BarraNota posicao="topo">
        {/* Voltar é navegação, não ação: fica como ícone solto, sem a moldura
            de pílula das ações (pedido do Pedro, 22/09/2026). */}
        <PilulaNota forma="solta">
          <BotaoNota title="Voltar para Notas" aria-label="Voltar para Notas" onClick={closeNoteEditor}>
            <Icon name="chevronLeft" size={17} />
          </BotaoNota>
        </PilulaNota>
        {/* Título e data ficam na barra do topo (mockup do Pedro, 22/09/2026):
            continuam editáveis, mas param de rolar junto com o texto. */}
        <CabecaNota>
          <input
            className="m-0 w-full border-0 bg-transparent p-0 font-titulo text-[17px] leading-[1.2] font-bold tracking-[-0.02em] text-ellipsis text-ink focus:outline-none"
            type="text"
            placeholder="Título"
            defaultValue={note.title}
            onBlur={(e) => {
              if (e.target.value !== note.title) updateNote(note.id, { title: e.target.value });
            }}
          />
          <div className="truncate font-sans text-xs tracking-[0.01em] text-sub">
            {criadoEmLabel(note.createdAt)}
          </div>
        </CabecaNota>
        <PilulaNota>
          <BotaoNota
            tom="perigo"
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
          </BotaoNota>
        </PilulaNota>
      </BarraNota>

      <div
        className="min-h-0 flex-auto overflow-y-auto px-[18px] pt-[calc(var(--safe-top)+66px)] pb-[calc(var(--safe-bottom)+90px)]"
        data-rolagem
      >
        <input
          className="mt-2.5 mb-3.5 w-full border-0 bg-transparent p-0 font-sans text-md text-sub focus:outline-none"
          type="text"
          placeholder="Assuntos (separados por vírgula)"
          value={subjectsInput}
          onChange={(e) => setSubjectsInput(e.target.value)}
          onBlur={commitSubjects}
        />

        <LiveMdEditor
          key={note.id}
          ref={editorRef}
          value={content}
          onChange={commitContent}
          placeholder="Escreva aqui..."
          colapsoKey={note.id}
          cru={cru}
        />
      </div>

      <BarraNota posicao="rodape">
        <PilulaNota rodape rolavel>
          {FERRAMENTAS.map((f) => (
            <BotaoNota
              key={f.titulo}
              rodape
              title={f.titulo}
              aria-label={f.titulo}
              onMouseDown={(e) => {
                e.preventDefault();
                aplicarNaSelecao(f.aplica);
              }}
            >
              {f.icone}
            </BotaoNota>
          ))}
        </PilulaNota>
        <PilulaNota rodape>
          <BotaoNota
            rodape
            tom={cru ? "ligado" : "normal"}
            title={cru ? "Ver o texto formatado" : "Ver o Markdown cru"}
            aria-label={cru ? "Ver o texto formatado" : "Ver o Markdown cru"}
            aria-pressed={cru}
            onClick={() => setCru((v) => !v)}
          >
            <Icon name="code" size={17} />
          </BotaoNota>
          <BotaoNota
            rodape
            title={note.arquivada ? "Desarquivar nota" : "Arquivar nota"}
            aria-label={note.arquivada ? "Desarquivar nota" : "Arquivar nota"}
            aria-pressed={!!note.arquivada}
            onClick={() => {
              updateNote(note.id, { arquivada: !note.arquivada });
              if (!note.arquivada) closeNoteEditor();
            }}
          >
            <Icon name="arrowDownTray" size={17} />
          </BotaoNota>
        </PilulaNota>
      </BarraNota>
    </div>
  );
}

type Aplica = (value: string, start: number, end: number) => { value: string; start: number; end: number };

/** Botões de formatação do rodapé, na ordem em que aparecem. */
const FERRAMENTAS: Array<{ titulo: string; icone: React.ReactNode; aplica: Aplica }> = [
  {
    titulo: "Negrito",
    icone: <strong className="text-xl">B</strong>,
    aplica: (v, st, en) => wrapSelection(v, st, en, "**", "**"),
  },
  { titulo: "Lista", icone: <Icon name="listBullet" size={17} />, aplica: (v, st, en) => prefixLines(v, st, en, "- ") },
  {
    titulo: "Lista numerada",
    icone: <Icon name="numberedList" size={17} />,
    aplica: (v, st, en) => prefixOrdered(v, st, en, "num"),
  },
  {
    titulo: "Lista por letra",
    icone: <Icon name="letterList" size={17} />,
    aplica: (v, st, en) => prefixOrdered(v, st, en, "letra"),
  },
  {
    titulo: "Checkbox",
    icone: <Icon name="clipboard" size={17} />,
    aplica: (v, st, en) => prefixLines(v, st, en, "- [ ] "),
  },
  {
    titulo: "Diminuir recuo",
    icone: <Icon name="chevronDoubleLeft" size={17} />,
    aplica: (v, st, en) => indentLines(v, st, en, -1),
  },
  {
    titulo: "Aumentar recuo",
    icone: <Icon name="chevronDoubleRight" size={17} />,
    aplica: (v, st, en) => indentLines(v, st, en, 1),
  },
  { titulo: "Inserir tabela", icone: <Icon name="table" size={17} />, aplica: inserirTabela },
];
