// Descanso entre séries de exercício (pedido do Pedro, 12/09/2026): a rotina
// guarda UM valor ("descanso entre etapas", `Routine.restSeconds`), e o
// descanso entre séries deriva dele conforme o exercício — composto usa o
// valor cheio, isolado usa 0,75x, porque exercício multiarticular pede mais
// recuperação que monoarticular.
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
