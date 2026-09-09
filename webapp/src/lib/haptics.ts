// Porta de SOUND/HAPTICS (index.html:2445-2470) — só a parte vibratória.
// soundMode() no legado sempre devolve "mudo" (a opção de som foi removida
// do editor, index.html:2461: "sempre vibração, nunca beep"), então cueBeep
// nunca soa de verdade em produção; portar o oscilador WebAudio junto seria
// código morto. Fica só `vibrate`, que continua ativo.
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ambiente sem suporte (desktop/alguns navegadores) — silencioso, como o
    // legado (navigator.vibrate mesmo ausente não lança).
  }
}

/** Troca de etapa (index.html:2467: stepTransitionCue). */
export function stepTransitionCue(): void {
  vibrate([40, 30, 40]);
}

/** Tempo estourado — etapa ou descanso entre séries zerou (index.html:2468). */
export function timeUpCue(): void {
  vibrate([60, 50, 60]);
}

/** Rotina concluída (index.html:2469). */
export function finishCue(): void {
  vibrate([50, 60, 50, 60, 120]);
}
