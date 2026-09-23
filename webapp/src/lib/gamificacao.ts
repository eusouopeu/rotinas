// Motor de gamificação — porta o núcleo PURO de index.html:1141-1584 (só as
// funções que não dependem de `routines`/agendamento, que ainda não foram
// portados para o React — ver CLAUDE.md > "webapp/" para o que falta:
// construirAgendaSemana/congelarSemana/avancarGamificacaoAteAgora precisam do
// módulo de rotinas+agenda antes de fazer sentido portar de verdade, em vez
// de fingir uma dependência que ainda não existe).
import { load } from "./storage";
import { DIAS_ABREV, K_WEEKSTART } from "./constants";
import type { GamificacaoConfig, GamificacaoState, SemanaAtual, Tag } from "./types";

export function criarEstadoGamificacaoInicial(): GamificacaoState {
  return {
    config: {
      multiplicadores: { nenhum: 0, baixo: 1.0, medio: 1.75, alto: 3.0 },
      divisorDuracao: 30,
      notaMinima: 60,
      faixas: { bronze: 60, prata: 75, ouro: 90, diamante: 100 },
      pontosMeta: { mensal: 10, trimestral: 20, anual: 40 },
      roda: { ativa: false, areas: [], pesoSemArea: 5 },
      habito: { ativo: true, streakMin: 21, fator: 0.6 },
      vagas: { alto: 1, medio: 3, baixo: 0 },
    },
    semanaAtual: null,
    historico: { semanas: [], meses: [], trimestres: [], anos: [] },
    metasPontos: {},
    badges: [],
  };
}

export function localKey(d?: Date): string {
  const date = d || new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + p(date.getMonth() + 1) + "-" + p(date.getDate());
}

/** Dia (0=domingo..6=sábado) em que a semana começa a contar, configurável. */
export function weekStartDow(): number {
  const v = load<number>(K_WEEKSTART, 0);
  return v >= 0 && v <= 6 ? v : 0;
}

/** Dia que abre a semana da data dada, respeitando weekStartDow(). */
export function inicioSemanaISO(date: Date, weekStart = weekStartDow()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return localKey(d);
}

export function isoToDate(iso: string): Date {
  const [y, m, dd] = iso.split("-").map(Number);
  return new Date(y, m - 1, dd);
}

export function addDaysISO(iso: string, n: number): string {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return localKey(d);
}

/** Converte um dia literal (Date.getDay()) para o offset dentro da semana configurada. */
export function offsetSemana(dowLiteral: number, weekStart = weekStartDow()): number {
  return (dowLiteral - weekStart + 7) % 7;
}

export function ordemDiasSemana(weekStart = weekStartDow()): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

export function janelaSemanaLabel(weekStart = weekStartDow()): string {
  return DIAS_ABREV[weekStart] + "–" + DIAS_ABREV[(weekStart + 6) % 7];
}

export function tagMultiplicador(tag: string, config: GamificacaoConfig): number {
  const m = config.multiplicadores as Record<string, number>;
  return m[tag] !== undefined ? m[tag] : m.medio;
}

export function pesoBruto(tag: Tag, minutos: number, config: GamificacaoConfig): number {
  if (!minutos || minutos <= 0) return 0;
  return tagMultiplicador(tag, config) * Math.sqrt(minutos / config.divisorDuracao);
}

export const BLOCOS_SEMANA_PADRAO = 20;

/** Sem nada agendado o denominador seria 0 — cai numa escala fixa (20 blocos
 * médios de 30min = 100 pontos) para não zerar a semana inteira. */
export function fatorNormalizacaoPara(totalBruto: number, config: GamificacaoConfig): number {
  const base = totalBruto > 0 ? totalBruto : BLOCOS_SEMANA_PADRAO * pesoBruto("medio", 30, config);
  return base > 0 ? 100 / base : 0;
}

function pesoDaArea(id: string, config: GamificacaoConfig): number {
  const a = config.roda.areas.find((x) => x.id === id);
  return a ? Math.max(0.1, +a.peso || 0.1) : Math.max(0.1, +config.roda.pesoSemArea || 0.1);
}

/** Áreas que reservam fatia da semana: TODAS as áreas cadastradas na roda,
 * mais "sem área" apenas quando existe algo agendado sem área, mais qualquer
 * área órfã que ainda tenha peso agendado.
 *
 * Antes de 22/09/2026 só entravam as áreas com peso agendado na semana. Como
 * o conjunto de rotinas agendadas muda de semana para semana, a mesma área
 * ganhava fatia numa semana e virava "extra" na outra — era o relato do Pedro
 * de "área que aparece numa semana e some na seguinte". */
export function areasComFatia(porArea: Record<string, number>, config: GamificacaoConfig): string[] {
  const out = config.roda.areas.map((a) => a.id);
  Object.keys(porArea).forEach((k) => {
    if (porArea[k] > 0 && !out.includes(k)) out.push(k);
  });
  return out;
}

/** Quanto dos 100 pontos da semana cabe a cada área, pelo peso configurado. */
export function fatiasPorArea(porArea: Record<string, number>, config: GamificacaoConfig): Record<string, number> {
  if (!config.roda.ativa) return {};
  const areas = areasComFatia(porArea, config);
  if (!areas.length) return {};
  const somaPesos = areas.reduce((s, k) => s + pesoDaArea(k, config), 0);
  if (somaPesos <= 0) return {};
  const out: Record<string, number> = {};
  areas.forEach((k) => {
    out[k] = (100 * pesoDaArea(k, config)) / somaPesos;
  });
  return out;
}

/** Roda da vida: reparte os 100 pontos ENTRE áreas antes de repartir dentro
 * de cada uma. Área com agenda divide a fatia dela entre o que está agendado;
 * área sem nada agendado mantém a fatia reservada e pontua no ritmo normal da
 * semana (`fatorPadrao`), para itens avulsos — kanban, meta recorrente,
 * rotina fora do dia. */
export function fatoresPorArea(
  porArea: Record<string, number>,
  config: GamificacaoConfig,
  fatorPadrao = 0
): Record<string, number> {
  const fatias = fatiasPorArea(porArea, config);
  const out: Record<string, number> = {};
  Object.keys(fatias).forEach((k) => {
    const bruto = porArea[k] || 0;
    out[k] = bruto > 0 ? fatias[k] / bruto : fatorPadrao;
  });
  return out;
}

export function fatorParaArea(
  area: string | null | undefined,
  fatoresArea: Record<string, number>,
  fatorPadrao: number
): number {
  return area != null && fatoresArea[area] != null ? fatoresArea[area] : fatorPadrao;
}

export function badgeParaNota(nota: number, config: GamificacaoConfig): string | null {
  const f = config.faixas;
  if (nota < config.notaMinima) return null;
  if (nota < f.prata) return "bronze";
  if (nota < f.ouro) return "prata";
  if (nota < f.diamante) return "ouro";
  return "diamante";
}

/** A semana pertence ao mês em que ela termina (sábado). */
export function anoMesDoFimDaSemana(inicioISO: string): string {
  const d = isoToDate(addDaysISO(inicioISO, 6));
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function pontosGanhosPorArea(sem: Pick<SemanaAtual, "concluidos">): Record<string, number> {
  const out: Record<string, number> = {};
  (sem.concluidos || []).forEach((c) => {
    const k = c.area || "";
    out[k] = (out[k] || 0) + c.pontos;
  });
  return out;
}

export function destaquesDaSemana(
  sem: Pick<SemanaAtual, "concluidos">
): Array<{ nome: string; pontos: number }> {
  const porRotulo: Record<string, number> = {};
  (sem.concluidos || []).forEach((c) => {
    const k = c.rotulo || "Outros";
    porRotulo[k] = (porRotulo[k] || 0) + c.pontos;
  });
  return Object.keys(porRotulo)
    .map((nome) => ({ nome, pontos: porRotulo[nome] }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 5);
}

export function trimestreDe(anoMes: string): string {
  const ano = anoMes.slice(0, 4);
  const mes = +anoMes.slice(5, 7);
  return ano + "-T" + (Math.floor((mes - 1) / 3) + 1);
}
