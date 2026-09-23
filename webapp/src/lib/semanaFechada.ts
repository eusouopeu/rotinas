// Porta das funções puras de fechamento de semana (index.html:13502-13524) —
// verificação de semana pendente, marcação de vista, cálculo de delta vs.
// semana anterior não dispensada, cor conforme nota e nota mínima, e
// formatação do período e título da nota de reflexão.
import { addDaysISO, isoToDate } from "./gamificacao";
import { load, save } from "./storage";
import { K_GAMIFICACAO } from "./constants";
import { planejadasEm } from "./stats";
import { daysUntil, metaConcluida } from "./metas";
import type { HistoryEntry } from "./history";
import type { CountdownDoc, GamificacaoState, MetaTarget, Routine, Snooze } from "./types";

/* ---------- Revisão guiada (recomendação 6, 13/09/2026 — diverge do legado) ----------
   A tela deixa de ser só números: resultado + reflexão, rotinas que ficaram
   para trás (com troca de dias ali mesmo) e metas da semana que começa. */

export interface RotinaAtrasada {
  id: string;
  nome: string;
  planejadas: number;
  feitas: number;
}

/** Rotinas agendadas na semana `inicioISO` que tiveram menos execuções do
 * que o planejado (mesma regra de "planejada" do cumprimento em Dados:
 * agendada, já existia e fora de pausa). Maior falta primeiro. */
export function rotinasAtrasadasSemana(
  inicioISO: string,
  routines: Routine[],
  history: HistoryEntry[],
  snoozes: Snooze[]
): RotinaAtrasada[] {
  const feitasSet = new Set(history.map((h) => h.routineId + "|" + h.date));
  const out: RotinaAtrasada[] = [];
  routines.forEach((r) => {
    let planejadas = 0;
    let feitas = 0;
    for (let k = 0; k < 7; k++) {
      const iso = addDaysISO(inicioISO, k);
      if (!planejadasEm(isoToDate(iso), [r], snoozes).length) continue;
      planejadas++;
      if (feitasSet.has(r.id + "|" + iso)) feitas++;
    }
    if (planejadas > 0 && feitas < planejadas) out.push({ id: r.id, nome: r.name, planejadas, feitas });
  });
  return out.sort((a, b) => b.planejadas - b.feitas - (a.planejadas - a.feitas));
}

/** Metas com prazo ainda abertas que vencem nos próximos 14 dias, por data. */
export function metasProximasSemana(templates: unknown[]): MetaTarget[] {
  return (templates as Array<{ type?: string }>)
    .filter((t) => t.type === "countdown")
    .flatMap((d) => (d as CountdownDoc).targets || [])
    .filter((t) => !metaConcluida(t) && daysUntil(t.date) >= 0 && daysUntil(t.date) <= 14)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Conteúdo da nota da revisão: seções com título (viram toggles no editor). */
export function notaRevisaoSemana(p: { reflexao: string; ajustes: string[]; foco: string }): string {
  const partes: string[] = [];
  if (p.reflexao.trim()) partes.push("## O que levo da semana\n" + p.reflexao.trim());
  if (p.ajustes.length) partes.push("## Ajustes nas rotinas\n" + p.ajustes.map((a) => "- " + a).join("\n"));
  if (p.foco.trim()) partes.push("## Foco da próxima semana\n" + p.foco.trim());
  return partes.join("\n\n");
}

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
