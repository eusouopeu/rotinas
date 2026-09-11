// Porta de icsEscape/exportAgendaIcs (index.html:10714-10775). Fecha o ciclo
// do calendário externo: até aqui o app só importava .ics (lib/ical.ts) e
// nunca exportava. Rotinas agendadas viram VEVENT recorrente (RRULE semanal
// por dias, ou diária com INTERVAL no modo "intervalo"); compromissos avulsos
// viram ocorrência única — dia inteiro quando não têm horário.
import { computeSchedule } from "./schedule";
import type { Compromisso, Routine } from "./types";

const ICS_DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Porta de icsEscape (index.html:10714-10716). */
export function icsEscape(s: string | undefined): string {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function p2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Data/hora local sem fuso (DTSTART flutuante), igual ao legado. */
function fmtLocal(d: Date): string {
  return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + "T" + p2(d.getHours()) + p2(d.getMinutes()) + "00";
}

/** Porta de proximaOcorrenciaIntervalo (index.html:2790-2798), restrita ao
 * uso do export: primeira data >= hoje que cai no ciclo do intervalo. */
function proximaOcorrenciaIntervalo(r: Routine, aPartirDe: Date): Date {
  const n = Math.max(1, r.schedule?.intervaloDias || 1);
  const inicio = r.schedule?.intervaloInicio;
  const base = new Date(aPartirDe.getFullYear(), aPartirDe.getMonth(), aPartirDe.getDate());
  let ref = base;
  if (inicio) {
    const [y, m, dd] = inicio.split("-").map(Number);
    ref = new Date(y, m - 1, dd);
  }
  const diff = Math.round((base.getTime() - ref.getTime()) / 86400000);
  const offset = diff < 0 ? -diff : (n - (diff % n)) % n;
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Monta o texto .ics. Devolve null quando não há nada agendado — o chamador
 * mostra o banner "Nada agendado para exportar", como no legado. */
export function agendaIcs(routines: Routine[], compromissos: Compromisso[], agora: Date = new Date()): string | null {
  const comHorario = routines.filter((r) => computeSchedule(r));
  if (comHorario.length === 0 && compromissos.length === 0) return null;

  const dtstamp = agora.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Brita//Rotinas//PT", "CALSCALE:GREGORIAN"];

  comHorario.forEach((r) => {
    const sched = computeSchedule(r);
    if (!sched) return;
    let dtStart: Date;
    let rrule: string;
    if (r.schedule?.mode === "intervalo") {
      dtStart = proximaOcorrenciaIntervalo(r, agora);
      dtStart.setHours(Math.floor(sched.startMin / 60), sched.startMin % 60, 0, 0);
      rrule = "RRULE:FREQ=DAILY;INTERVAL=" + Math.max(1, r.schedule?.intervaloDias || 1);
    } else {
      const dias = r.schedule?.days && r.schedule.days.length ? [...r.schedule.days].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
      let delta = 0;
      while (!dias.includes((agora.getDay() + delta) % 7)) delta++;
      dtStart = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + delta);
      dtStart.setHours(Math.floor(sched.startMin / 60), sched.startMin % 60, 0, 0);
      rrule = "RRULE:FREQ=WEEKLY;BYDAY=" + dias.map((d) => ICS_DOW[d]).join(",");
    }
    // Mínimo de 15 min: uma rotina sem etapas de tempo teria duração 0 e o
    // evento seria descartado por vários calendários (index.html:10744).
    const dtEnd = new Date(dtStart.getTime() + Math.max(sched.durMin, 15) * 60000);
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + r.id + "@brita");
    lines.push("DTSTAMP:" + dtstamp);
    lines.push("DTSTART:" + fmtLocal(dtStart));
    lines.push("DTEND:" + fmtLocal(dtEnd));
    lines.push(rrule);
    lines.push("SUMMARY:" + icsEscape(r.name));
    lines.push("END:VEVENT");
  });

  compromissos.forEach((c) => {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + c.id + "@brita");
    lines.push("DTSTAMP:" + dtstamp);
    if (c.time) {
      const [hh, mm] = c.time.split(":").map(Number);
      const dtStart = new Date(c.date + "T00:00:00");
      dtStart.setHours(hh, mm, 0, 0);
      const dtEnd = new Date(dtStart.getTime() + 60 * 60000);
      lines.push("DTSTART:" + fmtLocal(dtStart));
      lines.push("DTEND:" + fmtLocal(dtEnd));
    } else {
      lines.push("DTSTART;VALUE=DATE:" + c.date.replace(/-/g, ""));
    }
    lines.push("SUMMARY:" + icsEscape(c.title));
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
