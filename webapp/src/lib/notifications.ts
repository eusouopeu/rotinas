// Porta de syncNativeSchedules/notifyDigestSemanal (index.html:2570-2586,
// 2765-2886) — compromissos avulsos, rotinas agendadas e o resumo semanal.
// Fora do escopo: metas recorrentes (index.html:8069-8080) — o campo
// `recorrentes` do doc de metas ainda não existe no modelo de dados do
// React (CountdownDoc só tem `targets`, metas com prazo); a notificação não
// tem o que agendar até essa parte da feature ser portada. Ver
// lib/nativeBridge.ts > LocalNotificationsPlugin.
import { BADGE_NOME, K_DIGESTSEMANAL } from "./constants";
import { computeSchedule, rotinaAgendadaEm } from "./schedule";
import { isDesktop, isNative, load } from "./storage";
import type { Compromisso, Routine } from "./types";

/** Porta de notifIdFor (index.html:2766-2770) — hash da chave + slot do dia
 * (0-6 = dia da semana das rotinas, 7 = "sem dia" para compromisso/digest,
 * usado só pra permitir colisão detectável e resolvida com +8, como no
 * legado). */
export function notifIdFor(key: string, day = 7): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 200000000) * 8 + (day % 8);
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

export interface NotifPlanRotina {
  id: number;
  title: string;
  body: string;
  weekday?: number; // 1(domingo)..7(sábado), convenção do plugin — modo "dias"
  hour?: number;
  minute?: number;
  at?: number; // epoch ms — modo "intervalo" (ocorrência avulsa, não recorrente)
}

/** Próximas `count` datas em que a rotina de modo "intervalo" ocorre, a
 * partir de `from` (inclusive) — mesmo resultado de
 * proximasOcorrenciasIntervalo (index.html:3187-3193), reaproveitando
 * rotinaAgendadaEm em vez de duplicar a conta de "a cada N dias". */
function proximasOcorrenciasIntervalo(r: Routine, count: number, from: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let guard = 0; guard < 3660 && out.length < count; guard++) {
    if (rotinaAgendadaEm(r, d)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Porta do trecho de rotinas em syncNativeSchedules (index.html:2791-2828)
 * — modo "dias" vira notificação recorrente por dia da semana; modo
 * "intervalo" não repete num dia fixo, então agenda as próximas 10
 * ocorrências avulsas (mesmo padrão dos compromissos). */
export function planoNotificacaoRotinas(routines: Routine[], agora: number): NotifPlanRotina[] {
  const out: NotifPlanRotina[] = [];
  const usedIds = new Set<number>();
  const idFor = (key: string, day: number) => {
    let nid = notifIdFor(key, day);
    while (usedIds.has(nid)) nid += 8;
    usedIds.add(nid);
    return nid;
  };
  routines.forEach((r) => {
    const sched = computeSchedule(r);
    if (!sched || !r.schedule) return;
    const title = "Hora de começar: " + r.name;
    const body = "Início previsto às " + sched.startStr;
    if (r.schedule.mode === "intervalo") {
      proximasOcorrenciasIntervalo(r, 10, new Date(agora)).forEach((data, i) => {
        const quando = new Date(data);
        quando.setHours(Math.floor(sched.startMin / 60), sched.startMin % 60, 0, 0);
        if (quando.getTime() <= agora) return;
        out.push({ id: idFor(r.id, i), title, body, at: quando.getTime() });
      });
      return;
    }
    const days = r.schedule.days && r.schedule.days.length ? r.schedule.days : [0, 1, 2, 3, 4, 5, 6];
    days.forEach((d) => {
      out.push({ id: idFor(r.id, d), title, body, weekday: d + 1, hour: Math.floor(sched.startMin / 60), minute: sched.startMin % 60 });
    });
  });
  return out;
}

/** Porta de notifyDigestSemanal (index.html:2570-2586) — disparada quando o
 * boot detecta uma semana recém-fechada (gam.historico.semanas cresceu).
 * Três canais, igual ao legado: nativo agenda imediato (sem `schedule`,
 * dispara na hora); desktop e navegador usam a Notification API — o toque
 * chama `onOpenBoletim` (a store decide pra onde navegar). */
export function notifyDigestSemanal(sem: { dispensada?: boolean; nota: number; badge: string | null }, onOpenBoletim: () => void): void {
  if (!load(K_DIGESTSEMANAL, true)) return;
  const title = sem.dispensada ? "Semana dispensada" : "Semana fechada: " + sem.nota.toFixed(1) + " pontos";
  const body = sem.badge ? "Badge " + (BADGE_NOME[sem.badge] || sem.badge) + " conquistada — toque para ver o boletim." : "Toque para ver o boletim da semana.";

  if (isNative) {
    window.Capacitor?.Plugins.LocalNotifications?.schedule({
      notifications: [{ id: notifIdFor("brita-digest-semanal", 0), title, body, extra: { brita: "digest" } }],
    }).catch(() => {});
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (isDesktop) {
    try {
      const n = new Notification(title, { body });
      n.onclick = () => {
        try {
          (window.electronBridge as unknown as { showWindow?: () => void } | undefined)?.showWindow?.();
        } catch {
          /* ok sem trazer a janela pra frente */
        }
        try {
          window.focus();
        } catch {
          /* ok */
        }
        onOpenBoletim();
      };
    } catch {
      /* permissão pode ter sido revogada entre o check e a criação */
    }
    return;
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, tag: "digest-semanal" }).catch(() => {
        try {
          new Notification(title, { body });
        } catch {
          /* ok */
        }
      });
    });
  } else {
    try {
      new Notification(title, { body });
    } catch {
      /* ok */
    }
  }
}
