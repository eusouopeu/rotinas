// Editor Markdown "live" das notas simples (pedido do Pedro, 12/09/2026 —
// substitui o textarea + botão de visualizar). Mesma ideia do
// renderLiveEditor do legado (texto como verdade, linha sob o cursor crua e
// as demais formatadas), mas SEM contenteditable: a linha ativa é um único
// <textarea> de uma linha lógica (digitação, IME e cursor 100% nativos) e as
// outras são renderizadas por parseMdLines. Enter/Backspace/setas nas bordas
// da linha trocam de linha; toque numa linha renderizada abre ela com o
// cursor no ponto tocado; checkbox renderizado alterna sem abrir a linha.
// Títulos são toggles (13/09/2026): a seta recolhe a seção até o próximo
// título de nível igual ou maior; abrir uma linha escondida (Enter, colar,
// setas) expande de volta. O estado é só de UI (K_NOTACOLAPSO), o texto
// da nota nunca muda.
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { parseMdLines, proximoMarcador, splitBold, titulosRecolhidos } from "../lib/mdPreview";
import { load, save } from "../lib/storage";
import { K_NOTACOLAPSO } from "../lib/constants";
import { Icon } from "./Icon";

type Sel = { value: string; start: number; end: number };
export interface LiveMdEditorHandle {
  /** Aplica uma transformação sobre o texto inteiro usando a seleção da linha ativa. */
  aplicar(fn: (value: string, start: number, end: number) => Sel): void;
}

const RE_PREFIXO = /^(\s*)(#{1,3}\s+|-\s*\[[ xX]\]\s*|[-*]\s+|(\d+|[a-zA-Z])[.)]\s+)?/;

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

/** Prefixo que a linha atual "ocupa" e o que a próxima linha herda ao dar Enter. */
function continuacaoLista(linha: string): { atual: string; proximo: string } | null {
  const m = linha.match(/^(\s*)(-\s*\[[ xX]\]\s*|[-*]\s+)/);
  if (m) return { atual: m[0], proximo: m[1] + (m[2].includes("[") ? "- [ ] " : m[2]) };
  const o = linha.match(/^(\s*)(\d+|[a-zA-Z])([.)])(\s+)/);
  if (o) return { atual: o[0], proximo: o[1] + proximoMarcador(o[2]) + o[3] + o[4] };
  return null;
}

type MapaColapso = Record<string, string[]>;

export const LiveMdEditor = forwardRef<
  LiveMdEditorHandle,
  { value: string; onChange: (v: string) => void; placeholder?: string; colapsoKey?: string; cru?: boolean }
>(
  function LiveMdEditor({ value, onChange, placeholder, colapsoKey, cru }, ref) {
    const linhas = value.split("\n");
    const [ativa, setAtiva] = useState<number | null>(null);
    const [recolhidos, setRecolhidos] = useState<Set<string>>(
      () => new Set(colapsoKey ? load<MapaColapso>(K_NOTACOLAPSO, {})[colapsoKey] || [] : [])
    );
    const cursor = useRef<number | null>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const cruRef = useRef<HTMLTextAreaElement>(null);
    const { chaves, ocultaPor } = titulosRecolhidos(linhas, recolhidos);

    function gravarRecolhidos(s: Set<string>) {
      setRecolhidos(s);
      if (!colapsoKey) return;
      const mapa = { ...load<MapaColapso>(K_NOTACOLAPSO, {}) };
      if (s.size) mapa[colapsoKey] = [...s];
      else delete mapa[colapsoKey];
      save(K_NOTACOLAPSO, mapa);
    }

    function alternarTitulo(i: number) {
      const chave = chaves[i];
      if (!chave) return;
      const s = new Set(recolhidos);
      if (s.has(chave)) s.delete(chave);
      else s.add(chave);
      gravarRecolhidos(s);
    }

    /** Linha que ficaria escondida por um título recolhido: expande quem a cobre. */
    function revelar(ls: string[], i: number) {
      const s = new Set(recolhidos);
      const { chaves: cs } = titulosRecolhidos(ls, s);
      let dono = titulosRecolhidos(ls, s).ocultaPor[i];
      if (dono == null) return;
      while (dono != null) {
        s.delete(cs[dono]!);
        dono = titulosRecolhidos(ls, s).ocultaPor[i];
      }
      gravarRecolhidos(s);
    }

    function abrir(i: number, pos: number, ls: string[] = linhas) {
      cursor.current = pos;
      setAtiva(i);
      revelar(ls, i);
    }

    function trocar(novas: string[], i: number, pos: number) {
      onChange(novas.join("\n"));
      abrir(i, pos, novas);
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
        /* Modo cru: um textarea só, com o texto inteiro — a seleção dele já é
           o offset absoluto que a toolbar espera, sem a conta de linha ativa. */
        if (cru) {
          const el = cruRef.current;
          const st = el ? el.selectionStart : value.length;
          const en = el ? el.selectionEnd : value.length;
          const r = fn(value, st, en);
          onChange(r.value);
          requestAnimationFrame(() => {
            const e2 = cruRef.current;
            if (!e2) return;
            e2.focus();
            e2.setSelectionRange(r.end, r.end);
          });
          return;
        }
        const i = ativa ?? linhas.length - 1;
        const el = taRef.current;
        const base = linhas.slice(0, i).reduce((s, l) => s + l.length + 1, 0);
        const st = base + (el && ativa != null ? el.selectionStart : linhas[i].length);
        const en = base + (el && ativa != null ? el.selectionEnd : linhas[i].length);
        const r = fn(value, st, en);
        onChange(r.value);
        const antes = r.value.slice(0, r.end).split("\n");
        abrir(antes.length - 1, antes[antes.length - 1].length, r.value.split("\n"));
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
        if (cont && linha.trim() === cont.atual.trim()) {
          // item de lista vazio: Enter encerra a lista em vez de criar outro
          novas[i] = "";
          trocar(novas, i, 0);
          return;
        }
        const pre = cont && st >= cont.atual.length ? cont.proximo : "";
        novas.splice(i, 1, linha.slice(0, st), pre + linha.slice(en));
        trocar(novas, i + 1, pre.length);
      } else if (e.key === "Backspace" && st === 0 && en === 0 && i > 0) {
        e.preventDefault();
        const novas = [...linhas];
        const pos = novas[i - 1].length;
        novas.splice(i - 1, 2, novas[i - 1] + linha);
        trocar(novas, i - 1, pos);
      } else if (e.key === "ArrowUp" && st === 0) {
        // pula as linhas de seções recolhidas
        let j = i - 1;
        while (j >= 0 && ocultaPor[j] != null) j--;
        if (j < 0) return;
        e.preventDefault();
        abrir(j, linhas[j].length);
      } else if (e.key === "ArrowDown" && en === linha.length) {
        let j = i + 1;
        while (j < linhas.length && ocultaPor[j] != null) j++;
        if (j >= linhas.length) return;
        e.preventDefault();
        abrir(j, 0);
      }
    }

    function onInput(v: string, i: number, el: HTMLTextAreaElement) {
      const novas = [...linhas];
      const partes = v.split("\n"); // colar texto com quebras
      novas.splice(i, 1, ...partes);
      onChange(novas.join("\n"));
      if (partes.length > 1) {
        const ultima = partes[partes.length - 1];
        abrir(i + partes.length - 1, ultima.length - (v.length - el.selectionEnd), novas);
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
        vis = pre.toString().replace(/^(•|(\d+|[a-zA-Z])[.)])/, "").length;
      }
      abrir(i, offsetCru(linhas[i], vis));
    }

    function alternarCheck(i: number) {
      const novas = [...linhas];
      novas[i] = novas[i].replace(/\[([ xX])\]/, (_m, c: string) => (c === " " ? "[x]" : "[ ]"));
      onChange(novas.join("\n"));
    }

    const vazio = !value;
    /* Toggle "estilizado x cru" (mockup do Pedro, 22/09/2026): o modo cru
       mostra o Markdown como ele é gravado, num textarea único, para editar
       sintaxe que o modo live esconde (tabela, link, `**`). O texto é o mesmo
       nos dois — o modo só muda como ele aparece. */
    if (cru) {
      return (
        <textarea
          ref={cruRef}
          className="note-ap-body live-md-cru"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    // quantas linhas com conteúdo cada título recolhido está escondendo
    const escondidas = new Map<number, number>();
    ocultaPor.forEach((dono, i) => {
      if (dono != null && linhas[i].trim()) escondidas.set(dono, (escondidas.get(dono) || 0) + 1);
    });
    return (
      <div
        className="note-ap-body live-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) abrir(linhas.length - 1, linhas[linhas.length - 1].length);
        }}
      >
        {linhas.map((linha, i) =>
          i !== ativa && ocultaPor[i] != null ? null : i === ativa ? (
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
              {vazio ? (
                <span className="live-md-ph">{placeholder}</span>
              ) : (
                <LinhaMd
                  linha={linha}
                  onCheck={() => alternarCheck(i)}
                  toggle={
                    chaves[i]
                      ? { aberto: !recolhidos.has(chaves[i]!), ocultas: escondidas.get(i) || 0, onToggle: () => alternarTitulo(i) }
                      : undefined
                  }
                />
              )}
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

function LinhaMd({
  linha,
  onCheck,
  toggle,
}: {
  linha: string;
  onCheck: () => void;
  toggle?: { aberto: boolean; ocultas: number; onToggle: () => void };
}) {
  const l = parseMdLines(linha)[0] ?? { type: "blank" as const };
  if (l.type === "blank") return <br />;
  if (l.type === "heading")
    return (
      <span className={"live-md-titulo live-md-h" + l.level}>
        {toggle && (
          <button
            type="button"
            className="live-md-toggle"
            aria-expanded={toggle.aberto}
            aria-label={toggle.aberto ? "Recolher seção" : "Expandir seção"}
            title={toggle.aberto ? "Recolher seção" : "Expandir seção"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              toggle.onToggle();
            }}
          >
            <Icon name={toggle.aberto ? "chevronDown" : "chevronRight"} size={14} />
          </button>
        )}
        <span>
          <Negrito text={l.text} />
        </span>
        {toggle && !toggle.aberto && toggle.ocultas > 0 && <span className="live-md-ocultas">{toggle.ocultas}</span>}
      </span>
    );
  if (l.type === "checkbox")
    return (
      <span className="live-md-check">
        <input type="checkbox" checked={l.checked} onChange={onCheck} />
        <span style={l.checked ? { textDecoration: "line-through", color: "var(--sub)" } : undefined}>
          <Negrito text={l.text} />
        </span>
      </span>
    );
  if (l.type === "bullet" || l.type === "ordered")
    return (
      <span className="live-md-check">
        <span className={l.type === "ordered" ? "live-md-num" : undefined}>{l.type === "ordered" ? l.marker : "•"}</span>
        <span>
          <Negrito text={l.text} />
        </span>
      </span>
    );
  return <Negrito text={l.text} />;
}
