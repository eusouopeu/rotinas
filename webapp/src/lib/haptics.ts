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

/* Avisos distintos (03/10/2026): dá para saber pelo bolso o que aconteceu.
   Troca de etapa = dois toques curtos; fim de descanso = três toques rápidos e
   agudos ("volta"); fim do tempo da tarefa = dois toques longos e graves. */

/** Tempo da tarefa zerou (index.html:2468, timeUpCue) — dois toques longos. */
export function fimEtapaCue(): void {
  cueBeep(620, 0.3, somModo());
  vibrate([280, 120, 280]);
}

/** Descanso acabou (pausa entre etapas ou entre séries) — três toques rápidos. */
export function fimDescansoCue(): void {
  const m = somModo();
  cueBeep(990, 0.08, m);
  setTimeout(() => cueBeep(990, 0.08, m), 130);
  setTimeout(() => cueBeep(1180, 0.12, m), 260);
  vibrate([50, 60, 50, 60, 50]);
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
