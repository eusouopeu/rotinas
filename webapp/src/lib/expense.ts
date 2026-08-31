// Porta de renderExpenseFolder (index.html:8730-9203) — lógica pura:
// categorias, cor, agrupamento por período, donut, sugestão de categoria
// por histórico (sugerirCategoriaDespesa) e import/export CSV de extrato
// (parseCsvText/guessExpenseColumns/computeImportPreview/despesasCsv).
import { inicioSemanaISO, localKey } from "./gamificacao";
import type { ExpenseDoc } from "./types";

export const EXP_CATS = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Educação", "Outros"];
const CAT_COLORS = ["#EC6AA8", "#5B8DEF", "#6B8F71", "#C9B23E", "#B25B4C", "#9C7BB8", "#8A8478"];

export function catColor(cat: string): string {
  const i = EXP_CATS.indexOf(cat);
  return CAT_COLORS[i >= 0 ? i % CAT_COLORS.length : CAT_COLORS.length - 1];
}

export function brl(v: number): string {
  return "R$ " + (v || 0).toFixed(2).replace(".", ",");
}

export type ChartsPeriod = "semana" | "mes" | "trimestre" | "ano";

export function isoWeekStart(dateStr: string): string {
  return inicioSemanaISO(new Date(dateStr + "T12:00:00"));
}

export function chartsBucketKey(dateStr: string, period: ChartsPeriod): string {
  if (period === "semana") return isoWeekStart(dateStr);
  if (period === "trimestre") {
    const y = dateStr.slice(0, 4);
    const m = Number(dateStr.slice(5, 7));
    return y + "-T" + (Math.floor((m - 1) / 3) + 1);
  }
  if (period === "ano") return dateStr.slice(0, 4);
  return dateStr.slice(0, 7);
}

export function chartsBucketLabel(key: string, period: ChartsPeriod): string {
  if (period === "semana") return key.slice(8, 10) + "/" + key.slice(5, 7);
  if (period === "mes") return key.slice(5, 7) + "/" + key.slice(2, 4);
  return key;
}

export function chartsPeriodUnit(p: ChartsPeriod): string {
  return { semana: "semana", mes: "mês", trimestre: "trimestre", ano: "ano" }[p];
}

/* ---- Sugestão de categoria por histórico (index.html:8731-8748) — lançamentos
   novos puxam a categoria mais usada entre lançamentos anteriores com esse nome. */
function normalizeStr(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
export function chaveDescDespesa(desc: string): string {
  const norm = normalizeStr(desc).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const partes = norm.split(" ").filter((p) => p && !/^\d+$/.test(p));
  return partes.slice(0, 2).join(" ");
}
export function sugerirCategoriaDespesa(desc: string, entradasExistentes: Array<{ desc: string; cat?: string }>): string | null {
  const chave = chaveDescDespesa(desc);
  if (!chave) return null;
  const contagem: Record<string, number> = {};
  (entradasExistentes || []).forEach((e) => {
    if (!e.cat) return;
    const k2 = chaveDescDespesa(e.desc);
    if (!k2) return;
    if (k2 === chave || k2.startsWith(chave) || chave.startsWith(k2)) contagem[e.cat] = (contagem[e.cat] || 0) + 1;
  });
  const melhores = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return melhores.length ? melhores[0][0] : null;
}

/* ---- Parsing de CSV de extrato (banco/cartão) (index.html:8750-8841) ---- */
export function parseCsvText(text: string): { delimiter: string; rows: string[][] } {
  text = String(text).replace(/^\uFEFF/, "");
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!rawLines.length) return { delimiter: ";", rows: [] };
  // detecta delimitador pela 1ª linha (fora de aspas): ; , tab
  const sample = rawLines[0];
  const counts: Record<string, number> = {
    ";": (sample.match(/;/g) || []).length,
    ",": (sample.match(/,/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
  };
  const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ";";
  function splitLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delimiter && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  }
  const rows = rawLines.map(splitLine);
  return { delimiter, rows };
}

export function parseBRNumber(s: string | null | undefined): number {
  if (s == null) return NaN;
  let t = String(s).trim().replace(/r\$/i, "").replace(/\s/g, "");
  if (!t) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/-/.test(t)) { neg = true; t = t.replace(/-/g, ""); }
  // formato brasileiro (1.234,56) vs americano (1,234.56)
  const hasComma = t.indexOf(",") >= 0, hasDot = t.indexOf(".") >= 0;
  if (hasComma && hasDot) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (hasComma) { t = t.replace(",", "."); }
  const v = parseFloat(t);
  if (isNaN(v)) return NaN;
  return neg ? -v : v;
}

export function parseFlexDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = String(s).trim();
  let m;
  if ((m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  if ((m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/))) {
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return null;
}

export interface GuessColunas {
  header: string[] | null;
  dataRows: string[][];
  ncol: number;
  dateCol: number;
  valCol: number;
  descCol: number;
}

export function guessExpenseColumns(rows: string[][]): GuessColunas {
  // decide se a 1ª linha é cabeçalho
  const first = rows[0] || [];
  const headerLike = first.some((c) => /data|date|valor|value|hist|lan[çc]|descri|estabelec|montante|amount|d[eé]bito|cr[eé]dito|t[ií]tulo|memo/i.test(c));
  const header = headerLike ? first : null;
  const dataRows = headerLike ? rows.slice(1) : rows;
  const ncol = Math.max(...rows.map((r) => r.length));
  let dateCol = -1, valCol = -1, descCol = -1;
  if (header) {
    header.forEach((h, i) => {
      if (dateCol < 0 && /data|date/i.test(h)) dateCol = i;
      if (valCol < 0 && /valor|value|montante|amount|d[eé]bito/i.test(h)) valCol = i;
      if (descCol < 0 && /descri|hist|lan[çc]|estabelec|memo|t[ií]tulo/i.test(h)) descCol = i;
    });
  }
  // heurística por conteúdo se não achou
  const sampleRows = dataRows.slice(0, 20);
  if (dateCol < 0) {
    for (let i = 0; i < ncol; i++) {
      if (sampleRows.filter((r) => parseFlexDate(r[i])).length >= Math.max(1, sampleRows.length * 0.6)) { dateCol = i; break; }
    }
  }
  if (valCol < 0) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < ncol; i++) {
      if (i === dateCol) continue;
      const score = sampleRows.filter((r) => !isNaN(parseBRNumber(r[i])) && r[i] && /\d/.test(r[i])).length;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    valCol = best;
  }
  if (descCol < 0) {
    let best = -1, bestLen = -1;
    for (let i = 0; i < ncol; i++) {
      if (i === dateCol || i === valCol) continue;
      const avg = sampleRows.reduce((a, r) => a + (r[i] || "").length, 0) / (sampleRows.length || 1);
      if (avg > bestLen) { bestLen = avg; best = i; }
    }
    descCol = best;
  }
  return { header, dataRows, ncol, dateCol, valCol, descCol };
}

export type ImportSign = "neg" | "pos" | "abs";

export interface ImportState {
  dataRows: string[][];
  guess: GuessColunas;
  map: { date: number; val: number; desc: number };
  sign: ImportSign;
}

/** Porta de computeImportPreview (index.html:9107-9124). */
export function computeImportPreview(st: ImportState): { parsed: Array<{ date: string; desc: string; value: number }>; skipped: number } {
  const { dataRows, map, sign } = st;
  const parsed: Array<{ date: string; desc: string; value: number }> = [];
  let skipped = 0;
  dataRows.forEach((r) => {
    const date = parseFlexDate(r[map.date]);
    const rawVal = parseBRNumber(r[map.val]);
    const desc = (r[map.desc] || "").trim();
    if (!date || isNaN(rawVal)) { skipped++; return; }
    let value;
    if (sign === "neg") { if (rawVal >= 0) return; value = -rawVal; }
    else if (sign === "pos") { if (rawVal <= 0) return; value = rawVal; }
    else { value = Math.abs(rawVal); }
    if (value === 0) return;
    parsed.push({ date, desc: desc || "(sem descrição)", value });
  });
  return { parsed, skipped };
}

/** Conteúdo do CSV de export (index.html:9194-9199), com BOM e `;`. */
export function despesasCsv(docs: ExpenseDoc[]): string {
  const rows: string[][] = [["data", "hora", "descricao", "valor", "categoria"]];
  [...docs].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    rows.push([e.date, e.time || "", e.desc.replace(/;/g, ","), e.value.toFixed(2).replace(".", ","), e.cat]);
  });
  return "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
}

export interface FiltroDespesas {
  query?: string;
  from?: string;
  to?: string;
  cat?: string;
}

export function filtrarDespesas(docs: ExpenseDoc[], f: FiltroDespesas): ExpenseDoc[] {
  let arr = docs;
  const q = (f.query || "").trim().toLowerCase();
  if (q) arr = arr.filter((e) => (e.desc || "").toLowerCase().includes(q) || (e.cat || "").toLowerCase().includes(q));
  if (f.from) arr = arr.filter((e) => e.date >= f.from!);
  if (f.to) arr = arr.filter((e) => e.date <= f.to!);
  if (f.cat) arr = arr.filter((e) => e.cat === f.cat);
  return arr;
}

export interface GrupoMes {
  chave: string; // AAAA-MM
  total: number;
  porCategoria: Array<{ cat: string; valor: number; pct: number }>;
  itens: ExpenseDoc[];
}

/** Agrupa por mês (mais recente primeiro), itens ordenados por
 * data+hora decrescente, com a repartição por categoria de cada mês. */
export function agruparPorMes(docs: ExpenseDoc[]): GrupoMes[] {
  const byMonth: Record<string, ExpenseDoc[]> = {};
  docs.forEach((e) => {
    (byMonth[e.date.slice(0, 7)] = byMonth[e.date.slice(0, 7)] || []).push(e);
  });
  return Object.keys(byMonth)
    .sort()
    .reverse()
    .map((mk) => {
      const itens = [...byMonth[mk]].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
      const total = itens.reduce((a, e) => a + e.value, 0);
      const byCat: Record<string, number> = {};
      itens.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + e.value));
      const porCategoria = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, valor]) => ({ cat, valor, pct: total > 0 ? Math.round((valor / total) * 100) : 0 }));
      return { chave: mk, total, porCategoria, itens };
    });
}

export interface DonutArc {
  color: string;
  dashArray: string;
  dashOffset: string;
}

/** Porta de donutSvg (index.html:8845-8856), separando geometria de markup —
 * a tela decide o `<svg>`. R=52, sw=22, viewBox 128x128, cx=cy=64. */
export function computeDonutArcs(segs: Array<{ value: number; color: string }>, total: number): DonutArc[] {
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return segs
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const dash = frac * C;
      const arc = { color: s.color, dashArray: `${dash} ${C - dash}`, dashOffset: `${-acc * C}` };
      acc += frac;
      return arc;
    });
}

export interface ResumoPeriodo {
  buckets: Array<{ chave: string; label: string; valor: number }>;
  segmentos: Array<{ label: string; valor: number; color: string }>;
  total: number;
  mediaPorBucket: number;
  totalPeriodoAtual: number;
  categoriaTopoPeriodoAtual: { cat: string; valor: number } | null;
  lancamentosPeriodoAtual: number;
}

/** Porta de chartsHtml (index.html:8911-8966) — só os números; a tela
 * desenha o donut/trend a partir daqui. */
export function resumoPorPeriodo(docs: ExpenseDoc[], period: ChartsPeriod): ResumoPeriodo {
  const byBucket: Record<string, number> = {};
  docs.forEach((e) => {
    const k = chartsBucketKey(e.date, period);
    byBucket[k] = (byBucket[k] || 0) + e.value;
  });
  const chaves = Object.keys(byBucket).sort();
  const buckets = chaves.slice(-8).map((k) => ({ chave: k, label: chartsBucketLabel(k, period), valor: byBucket[k] }));

  const byCat: Record<string, number> = {};
  docs.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + e.value));
  const total = Object.values(byCat).reduce((a, v) => a + v, 0);
  const segmentos = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, valor]) => ({ label: cat, valor, color: catColor(cat) }));

  const mediaPorBucket = chaves.length ? chaves.reduce((a, k) => a + byBucket[k], 0) / chaves.length : 0;
  const curKey = chartsBucketKey(localKey(), period);
  const curDocs = docs.filter((e) => chartsBucketKey(e.date, period) === curKey);
  const totalPeriodoAtual = curDocs.reduce((a, e) => a + e.value, 0);
  const curByCat: Record<string, number> = {};
  curDocs.forEach((e) => (curByCat[e.cat] = (curByCat[e.cat] || 0) + e.value));
  const topCat = Object.entries(curByCat).sort((a, b) => b[1] - a[1])[0];

  return {
    buckets,
    segmentos,
    total,
    mediaPorBucket,
    totalPeriodoAtual,
    categoriaTopoPeriodoAtual: topCat ? { cat: topCat[0], valor: topCat[1] } : null,
    lancamentosPeriodoAtual: curDocs.length,
  };
}
