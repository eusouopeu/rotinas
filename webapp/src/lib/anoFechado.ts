// "Ano fechado" (recomendação 9 de 02/10/2026): no molde do Mês fechado, um
// resumo do ano anterior — nota do ano (gam.historico.anos, fechado por
// lib/scoring.ts), meses, rotinas mais feitas, metas com prazo no ano e
// dinheiro (gastos por categoria, receitas e saldo). "Já vi" em
// gam.ultimoAnoVisto.
import { localKey } from "./gamificacao";
import type { HistoryEntry } from "./history";
import { catColor } from "./expense";
import type { AnyTemplateDoc, CountdownDoc, ExpenseDoc, GamificacaoState } from "./types";

export type AnoHistorico = GamificacaoState["historico"]["anos"][number];

/** O ano passado, fechado e ainda não visto (ano mais antigo não vira aviso). */
export function anoFechadoPendente(gam: GamificacaoState, hojeISO = localKey()): AnoHistorico | null {
  const anos = gam.historico?.anos || [];
  const ultimo = anos[anos.length - 1];
  if (!ultimo || gam.ultimoAnoVisto === ultimo.ano) return null;
  return ultimo.ano === +hojeISO.slice(0, 4) - 1 ? ultimo : null;
}

export interface ResumoAno {
  meses: Array<{ anoMes: string; nota: number }>;
  mediaMeses: number | null;
  execucoes: number;
  topRotinas: Array<{ nome: string; vezes: number }>;
  metas: { concluidas: number; total: number };
  gastos: number;
  entradas: number;
  porCategoria: Array<{ cat: string; valor: number; pct: number; cor: string }>;
  delta: number | null;
}

export function resumoAno(
  ano: AnoHistorico,
  gam: GamificacaoState,
  history: HistoryEntry[],
  templates: AnyTemplateDoc[]
): ResumoAno {
  const pref = String(ano.ano);
  const meses = gam.historico.meses
    .filter((m) => m.anoMes.startsWith(pref))
    .map((m) => ({ anoMes: m.anoMes, nota: m.nota }));
  const mediaMeses = meses.length ? meses.reduce((a, m) => a + m.nota, 0) / meses.length : null;

  const doAno = history.filter((h) => h.date.startsWith(pref));
  const contagem = new Map<string, { nome: string; vezes: number }>();
  doAno.forEach((h) => {
    const c = contagem.get(h.routineId) || { nome: h.routineName, vezes: 0 };
    c.vezes++;
    contagem.set(h.routineId, c);
  });
  const topRotinas = [...contagem.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 5);

  const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
  const metasAno = (doc?.targets ?? []).filter((t) => (t.date || "").startsWith(pref) && (t.topics || 0) > 0);
  const concluidas = metasAno.filter((t) => (t.done || 0) >= (t.topics || 0)).length;

  const lanc = templates
    .filter((t): t is ExpenseDoc => t.type === "expense")
    .filter((e) => typeof e.date === "string" && e.date.startsWith(pref));
  let gastos = 0;
  let entradas = 0;
  const byCat: Record<string, number> = {};
  lanc.forEach((e) => {
    if (e.receita) entradas += +e.value || 0;
    else {
      gastos += +e.value || 0;
      byCat[e.cat] = (byCat[e.cat] || 0) + (+e.value || 0);
    }
  });
  const porCategoria = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, valor]) => ({ cat, valor, pct: gastos > 0 ? Math.round((valor / gastos) * 100) : 0, cor: catColor(cat) }));

  const anterior = gam.historico.anos.find((a) => a.ano === ano.ano - 1);
  return {
    meses,
    mediaMeses,
    execucoes: doAno.length,
    topRotinas,
    metas: { concluidas, total: metasAno.length },
    gastos,
    entradas,
    porCategoria,
    delta: anterior ? ano.nota - anterior.nota : null,
  };
}
