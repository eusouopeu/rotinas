// Porta parcial de index.html:1637-1726 — só Prazos (metas com data-limite).
// Recorrentes (hábitos N vezes/semana, com penalidade se "negativa") ficam
// para outra fase: são um sub-sistema de pontuação à parte, não uma variação
// pequena deste. Sub-metas (parentId/bloqueio) e áreas da roda da vida também
// ficam de fora por ora.
import { inicioSemanaISO, localKey, tagMultiplicador, trimestreDe } from "./gamificacao";
import { K_METASSUBVIEW, K_METASSUBVIEWSEL } from "./constants";
import type { CountdownDoc, GamificacaoState, MetaEscopo, MetaRecProgresso, MetaRecorrente, MetaTarget } from "./types";

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function cdUnit(t: { unit?: string }): string {
  return (t.unit && t.unit.trim()) || "tópicos";
}

export interface MetaPace {
  days: number;
  remaining: number;
  txt: string;
}

export function cdPace(t: Pick<MetaTarget, "date" | "topics" | "done" | "unit">): MetaPace | null {
  const days = daysUntil(t.date);
  if (t.topics == null) return null;
  const unit = cdUnit(t);
  const remaining = Math.max(0, t.topics - (t.done || 0));
  if (days <= 0 || remaining <= 0) return { days, remaining, txt: remaining === 0 ? "concluído" : "prazo esgotado" };
  const perDay = remaining / days;
  const txt =
    perDay >= 1
      ? perDay.toFixed(1).replace(".", ",") + " " + unit + "/dia"
      : "1 a cada " + (days / remaining).toFixed(1).replace(".", ",") + " dias";
  return { days, remaining, txt };
}

/** <30 dias de prazo desde a criação = mensal, <=90 = trimestral, resto anual. */
export function metaEscopo(t: Pick<MetaTarget, "createdAt" | "date">): MetaEscopo {
  const ini = t.createdAt ? new Date(t.createdAt) : new Date();
  const dias = Math.round((new Date(t.date).getTime() - ini.getTime()) / 86400000);
  if (dias < 30) return "mensal";
  if (dias <= 90) return "trimestral";
  return "anual";
}

export function periodoDeEscopo(escopo: MetaEscopo, data: Date): string {
  const anoMes = localKey(data).slice(0, 7);
  if (escopo === "mensal") return anoMes;
  if (escopo === "trimestral") return trimestreDe(anoMes);
  return anoMes.slice(0, 4);
}

export function metaConcluida(t: Pick<MetaTarget, "topics" | "done">): boolean {
  return t.topics != null && (t.done || 0) >= t.topics;
}

/** Peso da meta (padrão alto, ×3) multiplica os pontos-base do escopo dela. */
export function metaPontosTotais(t: MetaTarget, gam: GamificacaoState): number {
  return (gam.config.pontosMeta[metaEscopo(t)] || 0) * tagMultiplicador(t.tagValor || "alto", gam.config);
}

export function metaCreditado(t: Pick<MetaTarget, "creditos">): number {
  const c = t.creditos || {};
  return Object.keys(c).reduce((s, k) => s + c[k], 0);
}

export function metaPontosDevidos(t: MetaTarget, gam: GamificacaoState): number {
  if (!t.topics || t.topics <= 0) return 0;
  const frac = Math.max(0, Math.min(1, (t.done || 0) / t.topics));
  return metaPontosTotais(t, gam) * frac;
}

/**
 * Porta de aplicarDeltaMeta (index.html:1688-1710), sem efeitos colaterais —
 * devolve cópias atualizadas de `target`/`gam` em vez de mutar+save() direto,
 * pra caber no padrão de store do React (quem chama decide o que persistir).
 */
export function aplicarDeltaMeta(
  t: MetaTarget,
  gam: GamificacaoState,
  delta: number
): { target: MetaTarget; gam: GamificacaoState } {
  if (Math.abs(delta) < 1e-9) return { target: t, gam };
  const creditos = { ...(t.creditos || {}) };
  const metasPontos = { ...gam.metasPontos };
  const atual = periodoDeEscopo(metaEscopo(t), new Date());

  if (delta > 0) {
    creditos[atual] = (creditos[atual] || 0) + delta;
    metasPontos[atual] = (metasPontos[atual] || 0) + delta;
  } else {
    let resta = -delta;
    const periodos = [atual, ...Object.keys(creditos).filter((p) => p !== atual).sort().reverse()];
    for (const p of periodos) {
      if (resta <= 1e-9) break;
      const tira = Math.min(creditos[p] || 0, resta);
      if (tira <= 0) continue;
      creditos[p] -= tira;
      metasPontos[p] = Math.max(0, (metasPontos[p] || 0) - tira);
      if (metasPontos[p] < 1e-9) delete metasPontos[p];
      if (creditos[p] < 1e-9) delete creditos[p];
      resta -= tira;
    }
  }
  return { target: { ...t, creditos }, gam: { ...gam, metasPontos } };
}

/** Porta de sincronizarPontosMeta (index.html:1713-1726) — chamar depois de
 * qualquer mudança em done/topics/prazo/peso. */
export function sincronizarPontosMeta(
  t: MetaTarget,
  gam: GamificacaoState
): { target: MetaTarget; gam: GamificacaoState; delta: number } {
  const devido = metaPontosDevidos(t, gam);
  const delta = devido - metaCreditado(t);
  if (Math.abs(delta) < 0.05) return { target: t, gam, delta: 0 };
  const r = aplicarDeltaMeta(t, gam, delta);
  return { ...r, delta };
}

/** Porta de estornarMetaConcluida (index.html:1730-1735) — usar ao excluir. */
export function estornarMeta(t: MetaTarget, gam: GamificacaoState): { target: MetaTarget; gam: GamificacaoState } {
  const pago = metaCreditado(t);
  if (pago <= 0) return { target: { ...t, creditos: undefined }, gam };
  const r = aplicarDeltaMeta(t, gam, -pago);
  return { target: { ...r.target, creditos: undefined }, gam: r.gam };
}

/* ---- Metas Recorrentes (index.html:7960-8420) ---- */

export function metaRecPeriodoAtual(rec: Pick<MetaRecorrente, "tipo">, data: Date = new Date()): string {
  return rec.tipo === "semanal" ? "semana:" + inicioSemanaISO(data) : "dia:" + localKey(data);
}

/**
 * Lê o progresso do período corrente, com reset preguiçoso quando o dia ou semana vira.
 */
export function metaRecProgresso(rec: MetaRecorrente, data: Date = new Date()): MetaRecProgresso {
  const per = metaRecPeriodoAtual(rec, data);
  if (!rec.progresso || rec.progresso.periodo !== per) {
    rec.progresso = { periodo: per, feitas: 0 };
  }
  return rec.progresso;
}

export function metaRecFeitas(rec: MetaRecorrente, data: Date = new Date()): number {
  return metaRecProgresso(rec, data).feitas;
}

export function metaRecCompleta(rec: MetaRecorrente, data: Date = new Date()): boolean {
  return metaRecFeitas(rec, data) >= rec.vezes;
}

/**
 * Meta negativa (ex: "delivery no máx 2x/semana"): vezes vira limite. Excedeu quando feitas > vezes.
 */
export function metaRecExcesso(rec: MetaRecorrente, data: Date = new Date()): number {
  return Math.max(0, metaRecFeitas(rec, data) - rec.vezes);
}

export function metaRecExcedida(rec: MetaRecorrente, data: Date = new Date()): boolean {
  return metaRecExcesso(rec, data) > 0;
}

export function duplicarMetaRec(
  doc: CountdownDoc,
  id: string,
  newId: () => string = () => Math.random().toString(36).slice(2, 9)
): CountdownDoc {
  const recorrentes = doc.recorrentes || [];
  const src = recorrentes.find((x) => x.id === id);
  if (!src) return doc;
  const copy: MetaRecorrente = {
    ...src,
    id: newId(),
    titulo: src.titulo + " (cópia)",
    progresso: null,
    criadoEm: Date.now(),
  };
  return {
    ...doc,
    recorrentes: [...recorrentes, copy],
    updatedAt: Date.now(),
  };
}

export function ajustarProgressoMetaRec(
  rec: MetaRecorrente,
  delta: number,
  data: Date = new Date()
): {
  rec: MetaRecorrente;
  excessoAntes: number;
  excessoDepois: number;
  feitasAntes: number;
  feitasDepois: number;
} {
  const p = metaRecProgresso(rec, data);
  const excessoAntes = metaRecExcesso(rec, data);
  const feitasAntes = !rec.negativa && rec.pontua ? p.feitas : 0;
  p.feitas = Math.max(0, rec.negativa ? p.feitas + delta : Math.min(rec.vezes, p.feitas + delta));
  const excessoDepois = metaRecExcesso(rec, data);
  const feitasDepois = !rec.negativa && rec.pontua ? p.feitas : 0;
  return {
    rec: { ...rec, progresso: { ...p } },
    excessoAntes,
    excessoDepois,
    feitasAntes,
    feitasDepois,
  };
}

export type MetasSubview = "prazos" | "recorrentes";

export function loadMetasSubviewSel(
  loadFn: <T>(key: string, fallback: T) => T
): MetasSubview[] {
  const v = loadFn<MetasSubview[] | null>(K_METASSUBVIEWSEL, null);
  if (Array.isArray(v) && v.length) return v;
  const leg = loadFn<string>(K_METASSUBVIEW, "recorrentes");
  return [leg === "prazos" ? "prazos" : "recorrentes"];
}

export function toggleMetasSubview(
  current: MetasSubview[],
  view: MetasSubview
): MetasSubview[] {
  const pos = current.indexOf(view);
  if (pos >= 0) {
    if (current.length <= 1) return current; // não deixa ambos desmarcados
    return current.filter((v) => v !== view);
  }
  return [...current, view];
}
