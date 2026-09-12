// Preview Markdown "leve" para o NoteEditor do React (recomendação 11 de
// docs/react-migration.md) — NÃO é o editor contínuo (`renderLiveEditor`/
// `liveAplicar`, index.html:9849+), que ficou fora de escopo por decisão de
// 30/08/2026 (contenteditable, tradução de cursor DOM↔texto, IME). Aqui é só
// leitura: um parser de subconjunto (negrito, lista, checkbox, título) para
// alternar entre editar (textarea) e visualizar (renderizado), sem
// contenteditable nenhum. Formato de checkbox compatível com o do legado
// ("- [ ] "/"- [x] ") para a nota continuar legível pelos dois apps.
export type MdLine =
  | { type: "blank" }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "checkbox"; checked: boolean; text: string }
  | { type: "bullet"; text: string }
  | { type: "ordered"; marker: string; text: string }
  | { type: "paragraph"; text: string };

const RE_HEAD = /^(#{1,3})\s+(.*)$/;
const RE_CHECK = /^-\s*\[([ xX])\]\s*(.*)$/;
const RE_BULLET = /^[-*]\s+(.*)$/;
/** "1. item" / "a. item" (também com ")"): número ou UMA letra. */
export const RE_ORDERED = /^(\d+|[a-zA-Z])([.)])\s+(.*)$/;

/** Próximo marcador de lista ordenada: 1→2, a→b, z→aa não existe: z fica z. */
export function proximoMarcador(m: string): string {
  if (/^\d+$/.test(m)) return String(+m + 1);
  if (m === "z" || m === "Z") return m;
  return String.fromCharCode(m.charCodeAt(0) + 1);
}

/** Converte as linhas selecionadas em lista ordenada numerada ("1.") ou por letra ("a."), em sequência. */
export function prefixOrdered(value: string, start: number, end: number, kind: "num" | "letra") {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end > start ? end - 1 : end);
  if (lineEnd === -1) lineEnd = value.length;
  let marcador = kind === "num" ? "1" : "a";
  const newBlock = value
    .slice(lineStart, lineEnd)
    .split("\n")
    .map((l) => {
      const semPrefixo = l.replace(/^([-*]\s+(\[[ xX]\]\s*)?|(\d+|[a-zA-Z])[.)]\s+)/, "");
      const out = `${marcador}. ${semPrefixo}`;
      marcador = proximoMarcador(marcador);
      return out;
    })
    .join("\n");
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { value: newValue, start: lineStart + newBlock.length, end: lineStart + newBlock.length };
}

export function parseMdLines(text: string): MdLine[] {
  const lines = text.length ? text.split("\n") : [];
  return lines.map((raw): MdLine => {
    const t = raw.trim();
    if (t === "") return { type: "blank" };
    let m = t.match(RE_HEAD);
    if (m) return { type: "heading", level: m[1].length as 1 | 2 | 3, text: m[2] };
    m = t.match(RE_CHECK);
    if (m) return { type: "checkbox", checked: m[1].toLowerCase() === "x", text: m[2] };
    m = t.match(RE_BULLET);
    if (m) return { type: "bullet", text: m[1] };
    m = t.match(RE_ORDERED);
    if (m) return { type: "ordered", marker: m[1] + m[2], text: m[3] };
    return { type: "paragraph", text: t };
  });
}

/** Quebra `**negrito**` em pedaços — só essa marcação inline por ora. */
export function splitBold(text: string): Array<{ bold: boolean; text: string }> {
  const out: Array<{ bold: boolean; text: string }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ bold: false, text: text.slice(last, m.index) });
    out.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ bold: false, text: text.slice(last) });
  return out.length ? out : [{ bold: false, text: "" }];
}

/** Manipulação de seleção do textarea para os botões da toolbar — nunca
 * contenteditable, só `selectionStart`/`selectionEnd` de um `<textarea>`
 * comum. */
export function wrapSelection(value: string, start: number, end: number, before: string, after: string) {
  const sel = value.slice(start, end);
  const newValue = value.slice(0, start) + before + sel + after + value.slice(end);
  return { value: newValue, start: start + before.length, end: start + before.length + sel.length };
}

export function prefixLines(value: string, start: number, end: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end > start ? end - 1 : end);
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  const newBlock = block
    .split("\n")
    .map((l) => (l.startsWith(prefix) ? l : prefix + l))
    .join("\n");
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { value: newValue, start: lineStart, end: lineStart + newBlock.length };
}
