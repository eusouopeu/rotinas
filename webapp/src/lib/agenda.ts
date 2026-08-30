// Porta parcial da agenda do Diário (index.html:12802-13066) — só o
// time-blocking da nota Markdown (RE_TIMEBLOCK/RE_WEEKBLOCK/RE_MONTHBLOCK/
// RE_YEARBLOCK, distribuirColunas, agendaGradeHtml/agendaGrupoHtml). Cartões
// do kanban do Diário, compromissos avulsos e eventos iCal ainda não têm
// dados no React, então não entram na agenda aqui — só a nota. Adiar por
// swipe/arrastar também fica de fora; o clique alterna feito/pendente.
import { DIAS_ABREV } from "./constants";

const MESES_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export interface TimeBlock {
  linha: number;
  ini: number;
  fim: number;
  feito: boolean;
  adiado: boolean;
  texto: string;
  col: number;
  cols: number;
}

const RE_TIMEBLOCK = /^\s*[-*]\s*\[([ xX>])\]\s*(\d{1,2}):(\d{2})(?:\s*[-–—]\s*(\d{1,2}):(\d{2}))?\s*(.*)$/;

export function parseTimeBlocks(texto: string): TimeBlock[] {
  const blocos: TimeBlock[] = [];
  (texto || "").split("\n").forEach((raw, i) => {
    const m = raw.match(RE_TIMEBLOCK);
    if (!m) return;
    const ini = Number(m[2]) * 60 + Number(m[3]);
    if (ini >= 24 * 60) return;
    let fim = m[4] !== undefined ? Number(m[4]) * 60 + Number(m[5]) : null;
    if (fim == null || fim <= ini) fim = ini + 60;
    blocos.push({
      linha: i,
      ini,
      fim,
      feito: m[1].toLowerCase() === "x",
      adiado: m[1] === ">",
      texto: (m[6] || "").trim(),
      col: 0,
      cols: 1,
    });
  });
  blocos.sort((a, b) => a.ini - b.ini || a.linha - b.linha);
  return blocos;
}

/** Blocos que se sobrepõem dividem a largura em colunas, como numa agenda.
 * Muta `blocos` (col/cols); espera a lista já ordenada por início. */
export function distribuirColunas(blocos: TimeBlock[]): void {
  let grupo: TimeBlock[] = [];
  let fimGrupo = -1;
  const fecharGrupo = () => {
    const cols = grupo.reduce((n, b) => Math.max(n, b.col + 1), 0);
    grupo.forEach((b) => (b.cols = cols));
    grupo = [];
  };
  blocos.forEach((b) => {
    if (grupo.length && b.ini >= fimGrupo) fecharGrupo();
    const ocupadas = grupo.filter((g) => g.fim > b.ini).map((g) => g.col);
    let c = 0;
    while (ocupadas.includes(c)) c++;
    b.col = c;
    grupo.push(b);
    fimGrupo = Math.max(fimGrupo, b.fim);
  });
  if (grupo.length) fecharGrupo();
}

export const AG_PX_MIN = 1.15;

export interface GradeLayout {
  alturaPx: number;
  horas: Array<{ min: number; label: string; topPx: number; meia: boolean }>;
  blocos: Array<TimeBlock & { topPx: number; alturaBlocoPx: number; leftPct: number; larguraPct: number }>;
  linhaAgoraPx: number | null;
}

/** Porta de agendaGradeHtml (index.html:12891-12931), separando o layout
 * (topo/altura/coluna em px/%) do desenho — quem chama decide o markup. */
export function computeGradeLayout(blocos: TimeBlock[], nowMin: number | null, opts: { mIni?: number; mFim?: number; pxMin?: number } = {}): GradeLayout {
  const pxMin = opts.pxMin || AG_PX_MIN;
  const ordenados = [...blocos].sort((a, b) => a.ini - b.ini || a.linha - b.linha);
  distribuirColunas(ordenados);
  const mIni = opts.mIni != null ? opts.mIni : Math.max(0, Math.floor(Math.min(...ordenados.map((b) => b.ini)) / 60) - 1) * 60;
  const mFim = opts.mFim != null ? opts.mFim : Math.min(24, Math.max(Math.ceil(Math.max(...ordenados.map((b) => b.fim)) / 60) + 1, 21)) * 60;
  const topo = (min: number) => (min - mIni) * pxMin;
  const hhmm = (min: number) => String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  const horas: GradeLayout["horas"] = [];
  for (let m = mIni; m <= mFim; m += 60) {
    horas.push({ min: m, label: hhmm(m), topPx: topo(m), meia: m % 60 !== 0 });
  }
  const blocosLayout = ordenados.map((b) => ({
    ...b,
    topPx: topo(b.ini),
    alturaBlocoPx: Math.max(24, (b.fim - b.ini) * pxMin - 3),
    leftPct: (b.col * 100) / b.cols,
    larguraPct: 100 / b.cols,
  }));
  const linhaAgoraPx = nowMin != null && nowMin >= mIni && nowMin <= mFim ? topo(nowMin) : null;
  return { alturaPx: topo(mFim) + 24, horas, blocos: blocosLayout, linhaAgoraPx };
}

const RE_CHECKBOX_PREFIX = /^\s*[-*]\s*\[([ xX>])\]/;

/** Alterna "[ ]"/"[x]" na linha `linha` (0-based) de `texto` — usado pelo
 * clique num bloco da agenda (dia/semana/mês/ano) para marcar/desmarcar
 * feito, sem tocar no resto da nota. */
export function toggleLinhaFeita(texto: string, linha: number): string {
  const linhas = texto.split("\n");
  const raw = linhas[linha];
  if (raw == null) return texto;
  const m = raw.match(RE_CHECKBOX_PREFIX);
  if (!m) return texto;
  const novoMarcador = m[1].toLowerCase() === "x" ? " " : "x";
  const idx = raw.indexOf("[" + m[1] + "]");
  if (idx === -1) return texto;
  linhas[linha] = raw.slice(0, idx) + "[" + novoMarcador + "]" + raw.slice(idx + 3);
  return linhas.join("\n");
}

export interface GrupoAgenda {
  label: string;
  itens: Array<{ linha: number; hora: number | null; feito: boolean; adiado: boolean; texto: string }>;
}

const RE_WEEKBLOCK = /^\s*[-*]\s*\[([ xX>])\]\s*(dom|seg|ter|qua|qui|sex|s[aá]b)\b(?:\s+(\d{1,2}):(\d{2}))?\s*(.*)$/i;
const RE_MONTHBLOCK = /^\s*[-*]\s*\[([ xX>])\]\s*(\d{1,2})(?!\s*[:\d])\s+(.*)$/;
const RE_YEARBLOCK = /^\s*[-*]\s*\[([ xX>])\]\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b\s*(.*)$/i;

function normalizeStr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function agendaGruposSemana(texto: string, ordemDias: number[], diasPt: string[]): GrupoAgenda[] {
  const itens: Array<{ linha: number; grupo: number; hora: number | null; feito: boolean; adiado: boolean; texto: string }> = [];
  (texto || "").split("\n").forEach((raw, i) => {
    const m = raw.match(RE_WEEKBLOCK);
    if (!m) return;
    const dow = DIAS_ABREV.findIndex((d) => normalizeStr(d) === normalizeStr(m[2]));
    if (dow === -1) return;
    itens.push({
      linha: i,
      grupo: dow,
      hora: m[3] !== undefined ? Number(m[3]) * 60 + Number(m[4]) : null,
      feito: m[1].toLowerCase() === "x",
      adiado: m[1] === ">",
      texto: (m[5] || "").trim(),
    });
  });
  return ordemDias
    .map((dow) => ({
      label: diasPt[dow].charAt(0).toUpperCase() + diasPt[dow].slice(1),
      itens: itens
        .filter((b) => b.grupo === dow)
        .sort((a, b) => (a.hora ?? 9999) - (b.hora ?? 9999) || a.linha - b.linha)
        .map(({ linha, hora, feito, adiado, texto: t }) => ({ linha, hora, feito, adiado, texto: t })),
    }))
    .filter((g) => g.itens.length > 0);
}

export function agendaGruposMes(texto: string): GrupoAgenda[] {
  const porDia: Record<number, Array<{ linha: number; texto: string; feito: boolean; adiado: boolean }>> = {};
  (texto || "").split("\n").forEach((raw, i) => {
    const m = raw.match(RE_MONTHBLOCK);
    if (!m) return;
    const dia = Number(m[2]);
    if (dia < 1 || dia > 31) return;
    (porDia[dia] = porDia[dia] || []).push({ linha: i, texto: (m[3] || "").trim(), feito: m[1].toLowerCase() === "x", adiado: m[1] === ">" });
  });
  return Object.keys(porDia)
    .map(Number)
    .sort((a, b) => a - b)
    .map((dia) => ({
      label: "dia " + String(dia).padStart(2, "0"),
      itens: porDia[dia].sort((a, b) => a.linha - b.linha).map((b) => ({ ...b, hora: null })),
    }));
}

export function agendaGruposAno(texto: string): GrupoAgenda[] {
  const porMes: Record<number, Array<{ linha: number; texto: string; feito: boolean; adiado: boolean }>> = {};
  (texto || "").split("\n").forEach((raw, i) => {
    const m = raw.match(RE_YEARBLOCK);
    if (!m) return;
    const mes = MESES_PT.findIndex((a) => normalizeStr(a) === normalizeStr(m[2]));
    if (mes === -1) return;
    (porMes[mes] = porMes[mes] || []).push({ linha: i, texto: (m[3] || "").trim(), feito: m[1].toLowerCase() === "x", adiado: m[1] === ">" });
  });
  return Object.keys(porMes)
    .map(Number)
    .sort((a, b) => a - b)
    .map((mes) => ({
      label: MESES_PT[mes].charAt(0).toUpperCase() + MESES_PT[mes].slice(1),
      itens: porMes[mes].sort((a, b) => a.linha - b.linha).map((b) => ({ ...b, hora: null })),
    }));
}
