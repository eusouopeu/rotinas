// Ponte app → widgets Android. O widget de sequência lia o histórico cru e
// refazia a conta em Java com uma regra própria (sem a tolerância de dia sem
// rotina devida do computeStreak); agora o app grava o valor pronto em
// K_WIDGETSTREAK e pede o redesenho (recomendação 1 de 26/09/2026).
import { K_WIDGETSTREAK } from "./constants";
import type { HistoryEntry } from "./history";
import { atualizarWidgets } from "./nativeBridge";
import { cacheSequenciaWidget } from "./stats";
import { isNative, load, save } from "./storage";
import type { Routine, Snooze } from "./types";

export function publicarSequenciaWidget(
  routines: Routine[],
  history: HistoryEntry[],
  snoozes: Snooze[],
  agora = new Date()
): void {
  if (!isNative) return;
  const novo = cacheSequenciaWidget(routines, history, agora, snoozes);
  const atual = load<typeof novo | null>(K_WIDGETSTREAK, null);
  if (JSON.stringify(atual) === JSON.stringify(novo)) return;
  save(K_WIDGETSTREAK, novo);
  agendarAtualizacaoWidgets();
}

let timerWidgets: ReturnType<typeof setTimeout> | null = null;

/** Redesenho dos widgets depois que a gravação assíncrona dos arquivos
 * (fila do storage) teve tempo de terminar — chamar na hora fazia o widget
 * ler o arquivo anterior. Agrupa rajadas (vários toques seguidos no contador). */
export function agendarAtualizacaoWidgets(atrasoMs = 1200): void {
  if (!isNative) return;
  if (timerWidgets) clearTimeout(timerWidgets);
  timerWidgets = setTimeout(() => {
    timerWidgets = null;
    atualizarWidgets();
  }, atrasoMs);
}

/** "+1" tocado no widget de metas (02/10/2026): `dia` é o dia do toque. */
export interface ToqueWidget {
  id: string;
  dia: string;
  delta: number;
}

/** Lê e esvazia a fila de toques do widget (WidgetToques.java). Fora do
 *  Android, ou com a ponte ausente, devolve vazio. */
export async function consumirToquesWidget(): Promise<ToqueWidget[]> {
  const w = isNative ? window.Capacitor?.Plugins.Widgets : undefined;
  if (!w?.consumirToques) return [];
  try {
    const r = await w.consumirToques();
    return (r?.toques || [])
      .filter((t) => t && typeof t.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dia))
      .map((t) => ({ id: t.id, dia: t.dia, delta: t.delta || 1 }));
  } catch {
    return [];
  }
}
