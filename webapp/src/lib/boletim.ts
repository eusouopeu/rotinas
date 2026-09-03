// Porta das funções puras de renderBoletim (index.html:13342-13501) — nota
// da semana atual, ritmo, contagem de badges, distribuição de pesos, roda
// da vida por área, tendência/correlação entre áreas e orçamento de tempo.
// Sem efeitos colaterais (mesmo padrão de scoring.ts): cada função recebe o
// que precisa e devolve um valor, nunca muta `gam`.
import { BLOCOS_SEMANA_PADRAO, isoToDate, addDaysISO, offsetSemana, pontosGanhosPorArea } from "./gamificacao";
import { stepTagEfetiva } from "./scoring";
import { routineDurationRaw } from "./routines";
import { rotinaAgendadaEm } from "./schedule";
import type { GamificacaoConfig, GamificacaoState, Routine, SemanaAtual } from "./types";

export { BLOCOS_SEMANA_PADRAO };

export interface RitmoInfo {
  nota: number;
  esperado: number;
  saldo: number;
  label: string;
  cor: string;
  diasRestantes: number;
  porDia100: number;
  porDia60: number;
}

export interface BadgeContagem {
  diamante: number;
  ouro: number;
  prata: number;
  bronze: number;
}

export interface DistribuicaoTags {
  alto: number;
  medio: number;
  baixo: number;
  nenhum: number;
  total: number;
}

export interface LinhaRodaSemana {
  label: string;
  color: string;
  pontos: number;
  previsto: number;
  _ordem: number;
}

export interface PontosPorAreaSemanaResult {
  linhas: LinhaRodaSemana[];
  max: number;
}

export interface TendenciaArea {
  label: string;
  color: string;
  valores: number[];
  _ordem: number;
}

export interface NotaEvolucaoItem {
  inicioISO: string;
  nota: number;
  dispensada: boolean;
  emCurso: boolean;
}

export interface CorrelacaoAreaItem {
  a: TendenciaArea;
  b: TendenciaArea;
  r: number;
}

type HistoricoSemana = GamificacaoState["historico"]["semanas"][number];

export const BADGE_CHAR: Record<string, string> = {
  diamante: "◆",
  ouro: "●",
  prata: "○",
  bronze: "◇",
};

export const BADGE_COR: Record<string, string> = {
  diamante: "var(--caneta-2)",
  ouro: "#D4AF37",
  prata: "var(--sub)",
  bronze: "#B08D57",
};

/** Porta de notaSemanaAtual (index.html:1789). */
export function notaSemanaAtual(sem: Pick<SemanaAtual, "concluidos">): number {
  return sem.concluidos.reduce((s, c) => s + c.pontos, 0);
}

/** Porta de esperadoAte (index.html:1790). */
export function esperadoAte(sem: Pick<SemanaAtual, "agendaCongelada">, diaIdx: number): number {
  return (sem.agendaCongelada || []).filter((a) => a.dia <= diaIdx).reduce((s, a) => s + a.pontos, 0);
}

/** Porta de ritmoInfo (index.html:1791-1808) — saldo (nota vs. esperado até
 * hoje), rótulo/cor do ritmo e pontos/dia necessários até sábado. */
export function ritmoInfo(sem: SemanaAtual, config: GamificacaoConfig, hoje: Date = new Date(), weekStart = 0): RitmoInfo {
  const diaIdx = offsetSemana(hoje.getDay(), weekStart);
  const nota = notaSemanaAtual(sem);
  const esperado = esperadoAte(sem, diaIdx);
  const saldo = nota - esperado;

  let label: string;
  let cor: string;
  if (saldo >= 5) {
    label = "Adiantado";
    cor = "var(--ok)";
  } else if (saldo >= -5) {
    label = "No ritmo";
    cor = "var(--sub)";
  } else if (saldo >= -15) {
    label = "Levemente atrasado";
    cor = "var(--caneta)";
  } else {
    label = "Atrasado";
    cor = "var(--erro)";
  }

  const diasRestantes = 7 - diaIdx;
  const faltaPara100 = Math.max(0, 100 - nota);
  const faltaPara60 = Math.max(0, config.notaMinima - nota);

  return {
    nota,
    esperado,
    saldo,
    label,
    cor,
    diasRestantes,
    porDia100: diasRestantes > 0 ? faltaPara100 / diasRestantes : faltaPara100,
    porDia60: diasRestantes > 0 ? faltaPara60 / diasRestantes : faltaPara60,
  };
}

/** Porta de contagemBadges (index.html:1947-1951). */
export function contagemBadges(badges: GamificacaoState["badges"], escopo: string): BadgeContagem {
  const out: BadgeContagem = { diamante: 0, ouro: 0, prata: 0, bronze: 0 };
  badges
    .filter((b) => b.escopo === escopo)
    .forEach((b) => {
      if (b.tipo in out) out[b.tipo as keyof BadgeContagem]++;
    });
  return out;
}

/** Porta de distribuicaoTags (index.html:1956-1966) — contagem de etapas
 * timer por peso efetivo; etapas fora de "timer" não pontuam, ficam fora. */
export function distribuicaoTags(routines: Routine[]): DistribuicaoTags {
  const out: DistribuicaoTags = { alto: 0, medio: 0, baixo: 0, nenhum: 0, total: 0 };
  routines.forEach((r) => {
    (r.steps || []).forEach((s) => {
      if (s.type !== "timer") return;
      const tag = stepTagEfetiva(s, r);
      out[tag] = (out[tag] || 0) + 1;
      if (tag !== "nenhum") out.total++;
    });
  });
  return out;
}

function obterAreaInfo(config: GamificacaoConfig, id: string): { label: string; color: string } {
  const area = config.roda.areas.find((a) => a.id === id);
  return area || { label: "Sem área", color: "var(--sub)" };
}

/** Porta de pontosPorAreaSemana (index.html:1971-1992) — pontos já ganhos
 * na semana somados por área, com a fatia prevista (roda ativa). */
export function pontosPorAreaSemana(sem: SemanaAtual, config: GamificacaoConfig): PontosPorAreaSemanaResult {
  const ganhos = pontosGanhosPorArea(sem);
  const previsto: Record<string, number> = {};
  (sem.agendaCongelada || []).forEach((a) => {
    const k = a.area || "";
    previsto[k] = (previsto[k] || 0) + a.pontos;
  });

  const chaves = Array.from(new Set([...Object.keys(ganhos), ...Object.keys(previsto)])).filter(
    (k) => (ganhos[k] || 0) > 0 || (previsto[k] || 0) > 0,
  );
  if (chaves.length <= 1 && !chaves.some((k) => k)) return { linhas: [], max: 0 };

  const ordemArea = (k: string): number => {
    const i = config.roda.areas.findIndex((a) => a.id === k);
    return k && i >= 0 ? i : 999;
  };
  const rodaAtiva = !!config.roda.ativa;

  const linhas: LinhaRodaSemana[] = chaves
    .map((k) => {
      const info = obterAreaInfo(config, k);
      return { label: info.label, color: info.color, pontos: ganhos[k] || 0, previsto: rodaAtiva ? previsto[k] || 0 : 0, _ordem: ordemArea(k) };
    })
    .sort((a, b) => a._ordem - b._ordem || b.pontos - a.pontos);

  const max = Math.max(...linhas.map((l) => Math.max(l.pontos, l.previsto)), 0);
  return { linhas, max };
}

/** Porta de tendenciaAreaSemanas (index.html:1993-2007) — pontos por área
 * nas últimas `n` semanas fechadas (não dispensadas, com `porArea`
 * gravado). Menos de 2 semanas com dado não formam tendência. */
export function tendenciaAreaSemanas(historicoSemanas: HistoricoSemana[], config: GamificacaoConfig, n: number): TendenciaArea[] {
  const semanas = historicoSemanas.filter((s) => !s.dispensada && s.porArea).slice(-n);
  if (semanas.length < 2) return [];

  const chaves = new Set<string>();
  semanas.forEach((s) => {
    if (s.porArea) Object.keys(s.porArea).forEach((k) => k && chaves.add(k));
  });

  const ordemArea = (k: string): number => {
    const i = config.roda.areas.findIndex((a) => a.id === k);
    return i >= 0 ? i : 999;
  };

  return Array.from(chaves)
    .map((k) => {
      const info = obterAreaInfo(config, k);
      return { label: info.label, color: info.color, valores: semanas.map((s) => Math.round(((s.porArea ? s.porArea[k] : 0) || 0) * 10) / 10), _ordem: ordemArea(k) };
    })
    .sort((a, b) => a._ordem - b._ordem);
}

/** Porta de notaEvolucaoSemanas (index.html:2008-2013) — nota das últimas
 * `n` semanas fechadas + a semana em curso por último (para o gráfico). */
export function notaEvolucaoSemanas(historicoSemanas: HistoricoSemana[], sem: SemanaAtual, n: number): NotaEvolucaoItem[] {
  const fechadas: NotaEvolucaoItem[] = historicoSemanas.slice(-n).map((s) => ({ inicioISO: s.inicioISO, nota: s.nota, dispensada: !!s.dispensada, emCurso: false }));
  fechadas.push({ inicioISO: sem.inicioISO, nota: notaSemanaAtual(sem), dispensada: !!sem.dispensada, emCurso: true });
  return fechadas;
}

/** Porta de correlacaoPearson (index.html:2014-2023) — rudimentar de
 * propósito: só indica que duas séries sobem/descem juntas, sem causalidade. */
export function correlacaoPearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; syy += ys[i] * ys[i]; sxy += xs[i] * ys[i];
  }
  const mx = sx / n, my = sy / n;
  const cov = sxy / n - mx * my;
  const vx = sxx / n - mx * mx, vy = syy / n - my * my;
  if (vx <= 0 || vy <= 0) return null;
  return cov / Math.sqrt(vx * vy);
}

/** Porta de correlacaoAreas (index.html:2030-2043) — pares de área
 * ordenados do mais correlacionado (|r| maior) pro menos. */
export function correlacaoAreas(historicoSemanas: HistoricoSemana[], config: GamificacaoConfig, n: number): CorrelacaoAreaItem[] {
  const tend = tendenciaAreaSemanas(historicoSemanas, config, n);
  if (tend.length < 2) return [];
  const pares: CorrelacaoAreaItem[] = [];
  for (let i = 0; i < tend.length; i++) {
    for (let j = i + 1; j < tend.length; j++) {
      const r = correlacaoPearson(tend[i].valores, tend[j].valores);
      if (r == null) continue;
      pares.push({ a: tend[i], b: tend[j], r });
    }
  }
  return pares.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

/** Porta de minutosPlanejadosSemana (index.html:1840-1847) — minutos totais
 * de rotinas agendadas nos 7 dias da semana `inicioISO`. */
export function minutosPlanejadosSemana(routines: Routine[], inicioISO: string): number {
  let totalSeg = 0;
  for (let off = 0; off < 7; off++) {
    const dataDia = isoToDate(addDaysISO(inicioISO, off));
    routines.forEach((r) => {
      if (rotinaAgendadaEm(r, dataDia)) totalSeg += routineDurationRaw(r);
    });
  }
  return Math.round(totalSeg / 60);
}
