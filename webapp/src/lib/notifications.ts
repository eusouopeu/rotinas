// Porta parcial de syncNativeSchedules (index.html:2765-2865) — só a fatia
// de compromissos avulsos. O resto do sistema (rotinas agendadas, metas
// recorrentes, digest semanal) fica fora desta fase; ver lib/nativeBridge.ts
// > LocalNotificationsPlugin.
import type { Compromisso } from "./types";

/** Porta de notifIdFor (index.html:2766-2770), fixando o "dia" em 7 — cada
 * compromisso agenda no máximo uma notificação (não recorrente por semana
 * como as rotinas), então não precisa do slot por dia da semana. */
export function notifIdFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 200000000) * 8 + 7;
}

export interface NotifPlan {
  id: number;
  title: string;
  body: string;
  when: number; // epoch ms
}

/** Porta do trecho de compromissos em syncNativeSchedules
 * (index.html:2849-2865) — notificação única por compromisso com
 * `notify` != "nenhuma", no horário marcado ou um dia antes; nada para
 * compromissos já concluídos ou no passado. */
export function planoNotificacaoCompromissos(compromissos: Compromisso[], agora: number): NotifPlan[] {
  const out: NotifPlan[] = [];
  compromissos.forEach((c) => {
    if (!c.date || !c.notify || c.notify === "nenhuma" || c.feito) return;
    const hhmm = c.time || "09:00";
    const when = new Date(c.date + "T" + hhmm + ":00");
    if (c.notify === "diaanterior") when.setDate(when.getDate() - 1);
    if (isNaN(when.getTime()) || when.getTime() <= agora) return;
    out.push({
      id: notifIdFor("cp-" + c.id),
      title: (c.notify === "diaanterior" ? "Amanhã: " : "Hoje: ") + c.title,
      body: c.time ? "Horário: " + c.time : "Compromisso do dia",
      when: when.getTime(),
    });
  });
  return out;
}
