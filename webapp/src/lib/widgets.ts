// Ponte app → widgets Android. O widget de sequência lia o histórico cru e
// refazia a conta em Java com uma regra própria (sem a tolerância de dia sem
// rotina devida do computeStreak); agora o app grava o valor pronto em
// K_WIDGETSTREAK e pede o redesenho (recomendação 1 de 26/09/2026).
import { K_WIDGETSTREAK } from "./constants";
import type { HistoryEntry } from "./history";
import { atualizarWidgets } from "./nativeBridge";
import { cacheSequenciaWidget } from "./stats";
import { isNative, load, save } from "./storage";
import type { Routine } from "./types";

export function publicarSequenciaWidget(routines: Routine[], history: HistoryEntry[], agora = new Date()): void {
  if (!isNative) return;
  const novo = cacheSequenciaWidget(routines, history, agora);
  const atual = load<typeof novo | null>(K_WIDGETSTREAK, null);
  if (JSON.stringify(atual) === JSON.stringify(novo)) return;
  save(K_WIDGETSTREAK, novo);
  atualizarWidgets();
}
