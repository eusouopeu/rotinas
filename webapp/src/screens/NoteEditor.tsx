// Porta parcial de renderNoteEditor (index.html:11038-11137) — título,
// assuntos (input livre, sem sugestões/chips ainda), conteúdo, excluir.
// Sem backlinks nem sinkChecked ainda. Desde 12/09/2026 (pedido explícito do
// Pedro, revertendo a decisão de 30/08) o corpo é o editor live
// (components/LiveMdEditor.tsx): linha ativa crua, demais renderizadas. A
// toolbar de checkbox/lista/negrito age sobre a seleção da linha ativa.
//
// Layout do mockup de 02/10/2026: topo com voltar, título grande e três
// botões redondos (fixar/favoritar, Markdown cru, excluir); embaixo dele as
// áreas da nota (texto livre que funciona como seleção múltipla, mesmas cores
// das áreas de meta — campo `subjects`) e a data; rodapé com a pílula de
// formatação e o botão de copiar a nota. Arquivar foi para o deslizar à
// direita na lista de Notas.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { metaAreaInfo } from "../lib/metas";
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
import { cn } from "../lib/cn";
import { LiveMdEditor, type LiveMdEditorHandle } from "../components/LiveMdEditor";
import { BarraNota, BotaoNota, PilulaNota } from "../features/notas/BarrasNota";
import { AreaInput } from "../ui/CamposTexto";
import { BotaoIcone } from "../ui/BotaoIcone";
import { PilulaArea } from "../ui/PilulaArea";
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
  const areasRoda = useAppStore((s) => s.gam.config.roda.areas);
  const toggleNotePinned = useAppStore((s) => s.toggleNotePinned);
  /* Estilizado x cru: preferência de sessão, não de nota — o Pedro alterna
     para conferir sintaxe e volta, não é atributo do documento. */
  const [cru, setCru] = useState(false);
  const [content, setContent] = useState(note?.content || "");
  const [copiada, setCopiada] = useState(false);
  const editorRef = useRef<LiveMdEditorHandle>(null);

  useEffect(() => {
    setContent(note?.content || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);
  useEffect(() => {
    if (!copiada) return;
    const id = setTimeout(() => setCopiada(false), 1400);
    return () => clearTimeout(id);
  }, [copiada]);

  if (!note) {
    closeNoteEditor();
    return null;
  }

  const areas = note.subjects || [];
  // sugestões: áreas da roda + as já usadas em outras notas, menos as escolhidas
  const pool = [...new Set([...areasRoda.map((a) => a.label), ...notes.flatMap((n) => n.subjects || [])])].filter(
    (a) => !areas.some((x) => x.toLowerCase() === a.toLowerCase())
  );

  function adicionarArea(v: string) {
    const lbl = v.trim();
    if (lbl && !areas.some((x) => x.toLowerCase() === lbl.toLowerCase()))
      updateNote(note!.id, { subjects: [...areas, lbl] });
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

  function copiar() {
    const txt = (note!.title ? note!.title + "\n\n" : "") + content;
    navigator.clipboard
      ?.writeText(txt)
      .then(() => setCopiada(true))
      .catch(() => {});
  }

  const botaoTopo = "size-11 rounded-full";
  return (
    <div {...tela({}, "h-full p-0 desktop:px-10 paisagem:px-4")}>
      {/* topo fixo (não rola com o texto): voltar solto, título grande, ações redondas */}
      <div className="flex flex-none items-center gap-2 px-3.5 pt-[calc(var(--safe-top)+12px)]">
        <BotaoIcone rotulo="Voltar para Notas" semBorda onClick={closeNoteEditor}>
          <Icon name="chevronLeft" size={18} />
        </BotaoIcone>
        <input
          className="m-0 min-w-0 flex-1 border-0 bg-transparent p-0 font-titulo text-[26px] leading-[1.2] font-bold tracking-[-0.02em] text-ellipsis text-ink focus:outline-none"
          type="text"
          placeholder="Título"
          defaultValue={note.title}
          onBlur={(e) => {
            if (e.target.value !== note.title) updateNote(note.id, { title: e.target.value });
          }}
        />
        {/* fixar = favoritar: a nota marcada sobe para o topo da lista */}
        <BotaoIcone
          rotulo={note.pinned ? "Desafixar nota" : "Fixar e favoritar nota"}
          ligado={!!note.pinned}
          aria-pressed={!!note.pinned}
          className={botaoTopo}
          onClick={() => toggleNotePinned(note.id)}
        >
          <Icon name="bookmark" size={20} />
        </BotaoIcone>
        <BotaoIcone
          rotulo={cru ? "Ver o texto formatado" : "Ver o Markdown cru"}
          ligado={cru}
          aria-pressed={cru}
          className={botaoTopo}
          onClick={() => setCru((v) => !v)}
        >
          <Icon name="code" size={20} />
        </BotaoIcone>
        <BotaoIcone
          rotulo="Excluir nota"
          className={cn(botaoTopo, "text-erro")}
          onClick={() => {
            if (window.confirm(`Excluir a nota "${note.title || "sem título"}"?`)) {
              deleteNote(note.id);
              closeNoteEditor();
            }
          }}
        >
          <Icon name="trash" size={20} />
        </BotaoIcone>
      </div>

      <div className="min-h-0 flex-auto overflow-y-auto px-[18px] pt-2 pb-[calc(var(--safe-bottom)+90px)]" data-rolagem>
        {/* áreas (seleção múltipla por digitação livre; tocar tira) e a data */}
        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {areas.map((a) => (
              <PilulaArea
                key={a}
                cor={metaAreaInfo(a, areasRoda).color}
                role="button"
                className="cursor-pointer"
                title="Tirar esta área"
                onClick={() => updateNote(note.id, { subjects: areas.filter((x) => x !== a) })}
              >
                {metaAreaInfo(a, areasRoda).label}
              </PilulaArea>
            ))}
            <AreaInput
              className="min-w-16 flex-[1_1_0]"
              semMoldura
              limpaAoEscolher
              label="Adicionar área"
              placeholder={areas.length ? "+" : "+ área"}
              valor=""
              pool={pool}
              onEscolher={adicionarArea}
            />
          </div>
          <span className="flex-none font-sans text-md text-ink tabular-nums" title="Criada em">
            {dataHora(note.createdAt || note.updatedAt)}
          </span>
        </div>

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
        <PilulaNota rodape rolavel className="border-0 bg-card-2">
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
        <PilulaNota rodape className="ml-auto border-0 bg-card-2">
          <BotaoNota
            rodape
            tom={copiada ? "ligado" : "normal"}
            title={copiada ? "Copiada" : "Copiar a nota"}
            aria-label={copiada ? "Copiada" : "Copiar a nota"}
            onClick={copiar}
          >
            <Icon name={copiada ? "check" : "copy"} size={18} />
          </BotaoNota>
        </PilulaNota>
      </BarraNota>
    </div>
  );
}

/** "22/09/2026, 18:44" */
function dataHora(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Aplica = (value: string, start: number, end: number) => { value: string; start: number; end: number };

/** Botões de formatação do rodapé, na ordem em que aparecem. */
const FERRAMENTAS: Array<{ titulo: string; icone: React.ReactNode; aplica: Aplica }> = [
  {
    titulo: "Negrito",
    icone: <strong className="text-2xl">B</strong>,
    aplica: (v, st, en) => wrapSelection(v, st, en, "**", "**"),
  },
  { titulo: "Lista", icone: <Icon name="listBullet" size={21} />, aplica: (v, st, en) => prefixLines(v, st, en, "- ") },
  {
    titulo: "Lista de tarefas",
    icone: <Icon name="checklist" size={21} />,
    aplica: (v, st, en) => prefixLines(v, st, en, "- [ ] "),
  },
  {
    titulo: "Lista numerada",
    icone: <Icon name="numberedList" size={21} />,
    aplica: (v, st, en) => prefixOrdered(v, st, en, "num"),
  },
  {
    titulo: "Diminuir recuo",
    icone: <Icon name="chevronDoubleLeft" size={21} />,
    aplica: (v, st, en) => indentLines(v, st, en, -1),
  },
  {
    titulo: "Aumentar recuo",
    icone: <Icon name="chevronDoubleRight" size={21} />,
    aplica: (v, st, en) => indentLines(v, st, en, 1),
  },
  { titulo: "Inserir tabela", icone: <Icon name="table" size={21} />, aplica: inserirTabela },
];
