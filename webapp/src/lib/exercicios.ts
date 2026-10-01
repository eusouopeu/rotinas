// Descanso entre séries de exercício (pedido do Pedro, 12/09/2026): a rotina
// guarda UM valor ("descanso entre etapas", `Routine.restSeconds`), e o
// descanso entre séries deriva dele conforme o exercício — composto usa o
// valor cheio, isolado usa 0,75x, porque exercício multiarticular pede mais
// recuperação que monoarticular.
import type { HistoryEntry } from "./history";
import type { Exercicio } from "./types";

export const FATOR_DESCANSO_ISOLADO = 0.75;

/** Exercício sem classificação (biblioteca antiga) conta como composto — é o
 *  comportamento que existia antes, descanso cheio para todo mundo. */
export function ehComposto(ex: Exercicio | null | undefined) {
  return ex?.composto !== false;
}

export function descansoEntreSeries(restSeconds: number, ex: Exercicio | null | undefined) {
  const base = Math.max(0, restSeconds || 0);
  return ehComposto(ex) ? base : Math.round(base * FATOR_DESCANSO_ISOLADO);
}

/** Incremento de carga sugerido: composto sobe 2,5 kg, isolado 1 kg. */
export function incrementoCarga(ex: Exercicio | null | undefined): number {
  return ehComposto(ex) ? 2.5 : 1;
}

export interface SugestaoCarga {
  /** "3×12 · 20 kg" — a última execução do exercício. */
  ultima: string;
  /** Carga sugerida para hoje; null = manter a de sempre. */
  peso: number | null;
  motivo: string;
}

/** Sugestão de progressão (recomendação 8 de 26/09/2026): olha a última vez
 * que o exercício foi feito. Todas as séries no topo da faixa de reps (8-12 →
 * 12) com carga > 0 → sobe um incremento; alguma série abaixo do mínimo →
 * mantém a carga; no meio da faixa → mantém e busca mais reps. */
export function sugestaoCarga(
  ex: Exercicio | null | undefined,
  exercicioId: string | undefined,
  faixa: { min: number; max: number },
  history: HistoryEntry[]
): SugestaoCarga | null {
  if (!exercicioId) return null;
  let series: Array<{ reps: number; peso: number }> | null = null;
  let ts = -1;
  for (const h of history) {
    if ((h.ts || 0) <= ts) continue;
    const a = (h.steps || []).find((x) => x.exercicioId === exercicioId && (x.series?.length || 0) > 0);
    if (a) {
      series = a.series!;
      ts = h.ts || 0;
    }
  }
  if (!series) return null;
  const pesoMax = Math.max(...series.map((x) => x.peso || 0));
  const repsTxt = series.every((x) => x.reps === series![0].reps)
    ? `${series.length}×${series[0].reps}`
    : series.map((x) => x.reps).join("/");
  const ultima = pesoMax > 0 ? `${repsTxt} · ${String(pesoMax).replace(".", ",")} kg` : repsTxt;
  if (faixa.max > 0 && pesoMax > 0 && series.every((x) => x.reps >= faixa.max)) {
    return { ultima, peso: pesoMax + incrementoCarga(ex), motivo: "todas as séries no topo da faixa" };
  }
  if (faixa.min > 0 && series.some((x) => x.reps < faixa.min)) {
    return { ultima, peso: null, motivo: "manter a carga até fechar a faixa" };
  }
  return { ultima, peso: null, motivo: "manter a carga e buscar mais repetições" };
}

/** Teto de repetições da progressão: chegou aqui, o próximo passo é carga. */
export const PROGRESSAO_REPS_TETO = 12;
/** Repetições depois de subir a carga. */
export const PROGRESSAO_REPS_BASE = 8;
/** Degrau de carga do botão de progressão (pedido do Pedro, 01/10/2026). */
export const PROGRESSAO_CARGA_KG = 2.5;

/** Botão "subir" do player (01/10/2026, substitui o link "tentar N kg"):
 *  abaixo de 12 repetições mantém a carga e soma 2; em 12 (ou mais) sobe
 *  2,5 kg e volta para 8 repetições. */
export function progressaoCarga(reps: number, peso: number): { reps: number; peso: number } {
  const r = Math.max(0, Math.round(reps || 0));
  const p = Math.max(0, peso || 0);
  if (r >= PROGRESSAO_REPS_TETO)
    return { reps: PROGRESSAO_REPS_BASE, peso: Math.round((p + PROGRESSAO_CARGA_KG) * 100) / 100 };
  return { reps: Math.min(PROGRESSAO_REPS_TETO, r + 2), peso: p };
}
