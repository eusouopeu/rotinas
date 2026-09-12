// Editor Markdown "live" das notas simples (pedido do Pedro, 12/09/2026 —
// substitui o textarea + botão de visualizar). Mesma ideia do
// renderLiveEditor do legado (texto como verdade, linha sob o cursor crua e
// as demais formatadas), mas SEM contenteditable: a linha ativa é um único
// <textarea> de uma linha lógica (digitação, IME e cursor 100% nativos) e as
// outras são renderizadas por parseMdLines. Enter/Backspace/setas nas bordas
// da linha trocam de linha; toque numa linha renderizada abre ela com o
// cursor no ponto tocado; checkbox renderizado alterna sem abrir a linha.
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { parseMdLines, splitBold } from "../lib/mdPreview";

type Sel = { value: string; start: number; end: number };
export interface LiveMdEditorHandle {
  /** Aplica uma transformação sobre o texto inteiro usando a seleção da linha ativa. */
  aplicar(fn: (value: string, start: number, end: number) => Sel): void;
}

const RE_PREFIXO = /^(\s*)(#{1,3}\s+|-\s*\[[ xX]\]\s*|[-*]\s+)?/;

/** Offset no texto cru a partir do offset no texto visível (sem prefixo e sem `**`). */
function offsetCru(linha: string, visivel: number): number {
  const pre = (linha.match(RE_PREFIXO) || [""])[0].length;
  let raw = pre;
  let vis = 0;
  for (const p of splitBold(linha.slice(pre))) {
    const extra = p.bold ? 2 : 0;
    if (visivel <= vis + p.text.length) return raw + extra + (visivel - vis);
    raw += p.text.length + extra * 2;
    vis += p.text.length;
  }
  return linha.length;
}

function continuacaoLista(linha: string): string | null {
  const m = linha.match(/^(\s*)(-\s*\[[ xX]\]\s*|[-*]\s+)/);
  if (!m) return null;
  return m[1] + (m[2].includes("[") ? "- [ ] " : m[2]);
}

export const LiveMdEditor = forwardRef<LiveMdEditorHandle, { value: string; onChange: (v: string) => void; placeholder?: string }>(
  function LiveMdEditor({ value, onChange, placeholder }, ref) {
    const linhas = value.split("\n");
    const [ativa, setAtiva] = useState<number | null>(null);
    const cursor = useRef<number | null>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    function abrir(i: number, pos: number) {
      cursor.current = pos;
      setAtiva(i);
    }

    function trocar(novas: string[], i: number, pos: number) {
      onChange(novas.join("\n"));
      abrir(i, pos);
    }

    useLayoutEffect(() => {
      const el = taRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      if (cursor.current != null) {
        el.focus();
        const p = Math.min(cursor.current, el.value.length);
        el.setSelectionRange(p, p);
        cursor.current = null;
      }
    });

    useImperativeHandle(ref, () => ({
      aplicar(fn) {
        const i = ativa ?? linhas.length - 1;
        const el = taRef.current;
        const base = linhas.slice(0, i).reduce((s, l) => s + l.length + 1, 0);
        const st = base + (el && ativa != null ? el.selectionStart : linhas[i].length);
        const en = base + (el && ativa != null ? el.selectionEnd : linhas[i].length);
        const r = fn(value, st, en);
        onChange(r.value);
        const antes = r.value.slice(0, r.end).split("\n");
        abrir(antes.length - 1, antes[antes.length - 1].length);
      },
    }));

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, i: number) {
      if (e.nativeEvent.isComposing) return;
      const el = e.currentTarget;
      const { selectionStart: st, selectionEnd: en } = el;
      const linha = linhas[i];
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const cont = continuacaoLista(linha);
        const novas = [...linhas];
        if (cont && linha.trim() === cont.trim()) {
          // item de lista vazio: Enter encerra a lista em vez de criar outro
          novas[i] = "";
          trocar(novas, i, 0);
          return;
        }
        const pre = cont && st >= cont.length ? cont : "";
        novas.splice(i, 1, linha.slice(0, st), pre + linha.slice(en));
        trocar(novas, i + 1, pre.length);
      } else if (e.key === "Backspace" && st === 0 && en === 0 && i > 0) {
        e.preventDefault();
        const novas = [...linhas];
        const pos = novas[i - 1].length;
        novas.splice(i - 1, 2, novas[i - 1] + linha);
        trocar(novas, i - 1, pos);
      } else if (e.key === "ArrowUp" && st === 0 && i > 0) {
        e.preventDefault();
        abrir(i - 1, linhas[i - 1].length);
      } else if (e.key === "ArrowDown" && en === linha.length && i < linhas.length - 1) {
        e.preventDefault();
        abrir(i + 1, 0);
      }
    }

    function onInput(v: string, i: number, el: HTMLTextAreaElement) {
      const novas = [...linhas];
      const partes = v.split("\n"); // colar texto com quebras
      novas.splice(i, 1, ...partes);
      onChange(novas.join("\n"));
      if (partes.length > 1) {
        const ultima = partes[partes.length - 1];
        abrir(i + partes.length - 1, ultima.length - (v.length - el.selectionEnd));
      }
    }

    function tocarLinha(e: React.MouseEvent<HTMLDivElement>, i: number) {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      let vis = Number.MAX_SAFE_INTEGER;
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
      const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (r && e.currentTarget.contains(r.startContainer)) {
        const pre = document.createRange();
        pre.selectNodeContents(e.currentTarget);
        pre.setEnd(r.startContainer, r.startOffset);
        vis = pre.toString().replace(/^•/, "").length;
      }
      abrir(i, offsetCru(linhas[i], vis));
    }

    function alternarCheck(i: number) {
      const novas = [...linhas];
      novas[i] = novas[i].replace(/\[([ xX])\]/, (_m, c: string) => (c === " " ? "[x]" : "[ ]"));
      onChange(novas.join("\n"));
    }

    const vazio = !value;
    return (
      <div
        className="note-ap-body live-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) abrir(linhas.length - 1, linhas[linhas.length - 1].length);
        }}
      >
        {linhas.map((linha, i) =>
          i === ativa ? (
            <textarea
              key={i}
              ref={taRef}
              className="live-md-raw"
              rows={1}
              value={linha}
              placeholder={vazio ? placeholder : undefined}
              onChange={(e) => onInput(e.target.value, i, e.target)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onBlur={() => setAtiva((a) => (a === i ? null : a))}
            />
          ) : (
            <div key={i} className="live-md-line" onClick={(e) => tocarLinha(e, i)}>
              {vazio ? <span className="live-md-ph">{placeholder}</span> : <LinhaMd linha={linha} onCheck={() => alternarCheck(i)} />}
            </div>
          )
        )}
      </div>
    );
  }
);

function Negrito({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

function LinhaMd({ linha, onCheck }: { linha: string; onCheck: () => void }) {
  const l = parseMdLines(linha)[0] ?? { type: "blank" as const };
  if (l.type === "blank") return <br />;
  if (l.type === "heading") return <span className={"live-md-h" + l.level}><Negrito text={l.text} /></span>;
  if (l.type === "checkbox")
    return (
      <span className="live-md-check">
        <input type="checkbox" checked={l.checked} onChange={onCheck} />
        <span style={l.checked ? { textDecoration: "line-through", color: "var(--sub)" } : undefined}>
          <Negrito text={l.text} />
        </span>
      </span>
    );
  if (l.type === "bullet")
    return (
      <span className="live-md-check">
        <span>•</span>
        <span>
          <Negrito text={l.text} />
        </span>
      </span>
    );
  return <Negrito text={l.text} />;
}
