// "Mês fechado" (recomendação 11 de 30/09/2026): fechamento curto do mês
// anterior, no molde da Semana fechada. A nota e o selo do mês já existem em
// gam.historico.meses (fechados por lib/scoring.ts); aqui só se monta o resumo
// e se controla o "já vi" (gam.ultimoMesVisto).
import { anoMesDoFimDaSemana, localKey } from "./gamificacao";
import type { HistoryEntry } from "./history";
import type { AnyTemplateDoc, ExpenseDoc, GamificacaoState } from "./types";

export type MesHistorico = GamificacaoState["historico"]["meses"][number];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function nomeMes(anoMes: string): string {
  return `${MESES[+anoMes.slice(5, 7) - 1]} de ${anoMes.slice(0, 4)}`;
}

function mesAnterior(anoMes: string): string {
  let a = +anoMes.slice(0, 4);
  let m = +anoMes.slice(5, 7) - 1;
  if (m < 1) {
    m = 12;
    a--;
  }
  return `${a}-${String(m).padStart(2, "0")}`;
}

/** Último mês fechado ainda não visto — só se for o mês passado: um mês
 * antigo que ficou para trás não vira aviso atrasado. */
export function mesFechadoPendente(gam: GamificacaoState, hojeISO = localKey()): MesHistorico | null {
  const meses = gam.historico?.meses || [];
  const ultimo = meses[meses.length - 1];
  if (!ultimo || gam.ultimoMesVisto === ultimo.anoMes) return null;
  return ultimo.anoMes === mesAnterior(hojeISO.slice(0, 7)) ? ultimo : null;
}

export interface ResumoMes {
  semanas: Array<{ inicioISO: string; nota: number; dispensada?: boolean }>;
  execucoes: number;
  topRotinas: Array<{ nome: string; vezes: number }>;
  gastos: number;
  delta: number | null;
}

export function resumoMes(
  mes: MesHistorico,
  gam: GamificacaoState,
  history: HistoryEntry[],
  templates: AnyTemplateDoc[]
): ResumoMes {
  const am = mes.anoMes;
  const semanas = gam.historico.semanas.filter((s) => anoMesDoFimDaSemana(s.inicioISO) === am);
  const doMes = history.filter((h) => h.date.startsWith(am));
  const contagem = new Map<string, { nome: string; vezes: number }>();
  doMes.forEach((h) => {
    const c = contagem.get(h.routineId) || { nome: h.routineName, vezes: 0 };
    c.vezes++;
    contagem.set(h.routineId, c);
  });
  const topRotinas = [...contagem.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 3);
  const gastos = templates
    .filter((t): t is ExpenseDoc => t.type === "expense")
    .filter((e) => typeof e.date === "string" && e.date.startsWith(am))
    .reduce((acc, e) => acc + (+e.value || 0), 0);
  const anterior = gam.historico.meses.find((m) => m.anoMes === mesAnterior(am));
  return {
    semanas,
    execucoes: doMes.length,
    topRotinas,
    gastos,
    delta: anterior ? mes.nota - anterior.nota : null,
  };
}

export function tituloNotaMes(anoMes: string, nota: number): string {
  return `Mês de ${nomeMes(anoMes)} · nota ${nota.toFixed(1)}`;
}
