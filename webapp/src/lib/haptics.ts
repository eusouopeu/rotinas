// Porta de SOUND/HAPTICS (index.html:2445-2470). Até 11/09/2026 daqui só
// saía vibração, porque `soundMode()` no legado está amarrado em "mudo"
// (index.html:2461) e o oscilador virava código morto. Com o som agora
// configurável em Ajustes (lib/sound.ts > somModo, K_SOMMODO), cada cue volta
// a ser o par som+vibração do legado — e cada metade pode ser desligada
// sozinha (K_VIBRAR).
import { cueBeep, somModo, vibracaoLigada } from "./sound";

export function vibrate(pattern: number | number[]): void {
  if (!vibracaoLigada()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ambiente sem suporte (desktop/alguns navegadores) — silencioso, como o
    // legado (navigator.vibrate mesmo ausente não lança).
  }
}

/** Troca de etapa (index.html:2467: stepTransitionCue). */
export function stepTransitionCue(): void {
  cueBeep(880, 0.15, somModo());
  vibrate([40, 30, 40]);
}

/** Tempo estourado — etapa ou descanso entre séries zerou (index.html:2468). */
export function timeUpCue(): void {
  cueBeep(760, 0.18, somModo());
  vibrate([60, 50, 60]);
}

/** Rotina concluída (index.html:2469: finishCue) — dois tons, o segundo mais
 * agudo, com 140ms de intervalo. */
export function finishCue(): void {
  const m = somModo();
  cueBeep(660, 0.12, m);
  setTimeout(() => cueBeep(990, 0.22, m), 140);
  vibrate([50, 60, 50, 60, 120]);
}

/** Alarme de rotina (index.html:2470: alarmCue) — três toques iguais. Usado
 * pelo botão "testar" de Ajustes; no legado servia ao alarme in-app. */
export function alarmCue(): void {
  const m = somModo();
  cueBeep(720, 0.3, m);
  setTimeout(() => cueBeep(720, 0.3, m), 420);
  setTimeout(() => cueBeep(720, 0.4, m), 840);
  vibrate([200, 100, 200, 100, 200]);
}
