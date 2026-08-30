// Porta parcial de renderExpenseFolder (index.html:8858-9203) — só a lógica
// pura (categorias, cor, agrupamento por período, donut). Sem import/export
// CSV (exImport/paintImport/csvFile) nem sugestão de categoria por
// histórico (sugerirCategoriaDespesa) — gaps documentados em CLAUDE.md >
// "webapp/".
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
