// Porta parcial de index.html:1637-1726 — só Prazos (metas com data-limite).
// Recorrentes (hábitos N vezes/semana, com penalidade se "negativa") ficam
// para outra fase: são um sub-sistema de pontuação à parte, não uma variação
// pequena deste. Sub-metas (parentId/bloqueio) e áreas da roda da vida também
// ficam de fora por ora.
import { localKey, tagMultiplicador, trimestreDe } from "./gamificacao";
import type { GamificacaoState, MetaEscopo, MetaTarget } from "./types";

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
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
