// Porta das funções puras de fechamento de semana (index.html:13502-13524) —
// verificação de semana pendente, marcação de vista, cálculo de delta vs.
// semana anterior não dispensada, cor conforme nota e nota mínima, e
// formatação do período e título da nota de reflexão.
import { addDaysISO, isoToDate } from "./gamificacao";
import { load, save } from "./storage";
import { K_GAMIFICACAO } from "./constants";
import type { GamificacaoState } from "./types";

export type HistoricoSemana = GamificacaoState["historico"]["semanas"][number];

/**
 * Porta de semanaFechadaPendente (index.html:13507-13510).
 * Compara a última semana fechada com gam.ultimaSemanaVista.
 * Se já vista ou sem histórico, devolve null.
 */
export function semanaFechadaPendente(gam?: GamificacaoState | null): HistoricoSemana | null {
  const g = gam ?? load<GamificacaoState | null>(K_GAMIFICACAO, null);
  if (!g || !g.historico || !g.historico.semanas || g.historico.semanas.length === 0) {
    return null;
  }
  const ultima = g.historico.semanas[g.historico.semanas.length - 1];
  if (!ultima) return null;
  return g.ultimaSemanaVista === ultima.inicioISO ? null : ultima;
}

/**
 * Porta de marcarSemanaVista (index.html:13512-13514).
 * Grava gam.ultimaSemanaVista = ultima.inicioISO via save(K_GAMIFICACAO, gam).
 */
export function marcarSemanaVista(gam?: GamificacaoState | null): GamificacaoState | null {
  const g = gam ?? load<GamificacaoState | null>(K_GAMIFICACAO, null);
  if (!g || !g.historico || !g.historico.semanas || g.historico.semanas.length === 0) {
    return g;
  }
  const ultima = g.historico.semanas[g.historico.semanas.length - 1];
  if (ultima) {
    g.ultimaSemanaVista = ultima.inicioISO;
    save(K_GAMIFICACAO, g);
  }
  return g;
}

/**
 * Cálculo de delta (index.html:13519-13521).
 * Compara a nota da semana dada com a semana anterior NÃO dispensada.
 * Se não houver semana anterior válida, devolve null.
 */
export function calcularDeltaSemana(
  sem: HistoricoSemana,
  historicoSemanas: HistoricoSemana[]
): number | null {
  const anteriores = historicoSemanas.filter((s) => !s.dispensada && s.inicioISO < sem.inicioISO);
  const anterior = anteriores[anteriores.length - 1];
  return anterior != null ? sem.nota - anterior.nota : null;
}

/**
 * Cálculo de cor da nota (index.html:13524).
 * - Dispensada: var(--sub)
 * - Aprovada (nota >= notaMinima): var(--ok)
 * - Reprovada (nota < notaMinima): var(--erro)
 */
export function calcularCorSemana(
  sem: Pick<HistoricoSemana, "nota" | "dispensada">,
  notaMinima: number
): "var(--sub)" | "var(--ok)" | "var(--erro)" {
  if (sem.dispensada) return "var(--sub)";
  return sem.nota >= notaMinima ? "var(--ok)" : "var(--erro)";
}

/**
 * Formata o intervalo da semana em "DD/MM a DD/MM" (index.html:13522-13523).
 */
export function formatarPeriodoSemana(inicioISO: string): { iniStr: string; fimStr: string; label: string } {
  const ini = isoToDate(inicioISO);
  const fim = isoToDate(addDaysISO(inicioISO, 6));
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  const iniStr = dd(ini);
  const fimStr = dd(fim);
  return {
    iniStr,
    fimStr,
    label: `${iniStr} a ${fimStr}`,
  };
}

/**
 * Monta o título da nota de reflexão (index.html:13559):
 * "Semana DD/MM–DD/MM · nota X.X"
 */
export function tituloNotaReflexao(inicioISO: string, nota: number): string {
  const { iniStr, fimStr } = formatarPeriodoSemana(inicioISO);
  return `Semana ${iniStr}–${fimStr} · nota ${nota.toFixed(1)}`;
}
