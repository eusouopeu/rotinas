// Porta de index.html:4743-4784 (helpers de Notas simples) — stripMdForSnippet,
// relativeTime, nomeAutoDoc, extractTags/allTags. Sem o parser de markdown
// completo (renderMdBlock) nem o editor contínuo (ver CLAUDE.md > "webapp/",
// riscos conhecidos) — o editor React usa textarea simples por ora.
import type { Note } from "./types";

export function stripMdForSnippet(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, "\u{1F5BC}")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/(-\s*)?\[[ xX>]?\]\s*/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 90);
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return min + "min";
  const h = Math.floor(min / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  return d + "d";
}

export function nomeAutoDoc(d?: Date): string {
  const date = d || new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    p(date.getFullYear() % 100) + "-" + p(date.getMonth() + 1) + "-" + p(date.getDate()) + "-" + p(date.getHours()) + p(date.getMinutes())
  );
}

export function criadoEmLabel(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `criada em ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function extractTags(n: Note): string[] {
  const src = (n.title || "") + " " + (n.content || "");
  const out = new Set<string>();
  const re = /(^|\s)#([\p{L}0-9_-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(m[2].toLowerCase());
  return [...out];
}

export function allTags(notes: Note[]): string[] {
  const t = new Set<string>();
  notes.forEach((n) => extractTags(n).forEach((x) => t.add(x)));
  return [...t].sort();
}
