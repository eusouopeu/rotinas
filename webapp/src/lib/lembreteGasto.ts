// Lembrete de gastos (recomendação 12 de 30/09/2026): às 21h, se nenhuma
// despesa foi lançada naquele dia, uma notificação pergunta se teve gasto e o
// toque abre a Nova despesa. Agenda os próximos 7 dias de uma vez (o app pode
// ficar dias fechado) e refaz o plano a cada mudança nas despesas — lançar uma
// despesa hoje tira o aviso de hoje. Liga/desliga em Ajustes › Avisos
// (preferência local K_LEMBRETEGASTO, fora do backup).
import { K_LEMBRETEGASTO } from "./constants";
import { addDaysISO, isoToDate, localKey } from "./gamificacao";
import { notifIdFor } from "./notifications";
import { isNative, load } from "./storage";
import type { AnyTemplateDoc } from "./types";

export const HORA_LEMBRETE_GASTO = 21;
export const TAG_LEMBRETE_GASTO = "sched-gasto";

export function lembreteGastoLigado(): boolean {
  return load<boolean>(K_LEMBRETEGASTO, false);
}

/** Dias (ISO) e instantes dos próximos avisos, a partir de `agora`. */
export function planoLembreteGasto(
  datasComGasto: Set<string>,
  agora: Date,
  dias = 7
): Array<{ id: number; iso: string; at: number }> {
  const hoje = localKey(agora);
  const out: Array<{ id: number; iso: string; at: number }> = [];
  for (let i = 0; i < dias; i++) {
    const iso = addDaysISO(hoje, i);
    const at = isoToDate(iso);
    at.setHours(HORA_LEMBRETE_GASTO, 0, 0, 0);
    if (at.getTime() <= agora.getTime() || datasComGasto.has(iso)) continue;
    out.push({ id: notifIdFor("gasto-" + iso, 0), iso, at: at.getTime() });
  }
  return out;
}

export async function syncLembreteGasto(templates: AnyTemplateDoc[], ligado = lembreteGastoLigado()): Promise<void> {
  const LN = isNative ? window.Capacitor?.Plugins.LocalNotifications : undefined;
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    const minhas = (pending.notifications || []).filter((n) => n.extra && n.extra.brita === TAG_LEMBRETE_GASTO);
    if (minhas.length) await LN.cancel({ notifications: minhas.map((n) => ({ id: n.id })) });
    if (!ligado) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const datas = new Set(
      templates
        .filter((t) => t.type === "expense" && !(t as { receita?: boolean }).receita)
        .map((t) => (t as { date: string }).date)
    );
    const plano = planoLembreteGasto(datas, new Date());
    if (!plano.length) return;
    await LN.schedule({
      notifications: plano.map((p) => ({
        id: p.id,
        title: "Teve algum gasto hoje?",
        body: "Nada lançado hoje — toque para registrar uma despesa.",
        extra: { brita: TAG_LEMBRETE_GASTO },
        schedule: { at: new Date(p.at), allowWhileIdle: true },
      })),
    });
  } catch (e) {
    console.error("Lembrete de gastos falhou:", e);
  }
}
