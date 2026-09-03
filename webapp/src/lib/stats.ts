// Porta das funções puras de renderStats/renderWeekView/dayDetailHtml
// (index.html:5296-5333, 5418-5459, 5842-5909) — visão semanal da tela
// "Estatísticas" (aba "Dados" no legado): grade de cumprimento da semana e
// detalhe de execuções/faltas por dia. Sem efeitos colaterais.
import type { Routine, GamificacaoState } from "./types";
import type { HistoryEntry } from "./history";
import { localKey, inicioSemanaISO, isoToDate } from "./gamificacao";
import { rotinaAgendadaEm, computeSchedule } from "./schedule";
import { corDaRotina } from "./scoring";

export interface Snooze {
  from: number;
  to: number;
}

export interface WeekDayData {
  key: string;
  dow: number;
  dateObj: Date;
  isToday: boolean;
  executedRoutineIds: string[];
  dotsColors: string[];
  missedCount: number;
  temAlgo: boolean;
}

export interface WeekGridData {
  days: WeekDayData[];
  plannedTotal: number;
  doneTotal: number;
  missedTotal: number;
  rate: number | null;
}

export interface DayDetailExecuted {
  routineName: string;
  actualSec: number | null;
  ts: number | null;
}

export interface DayDetailPlanned {
  routineName: string;
  startStr: string;
  status: "agendada" | "não feita";
}

export interface DayDetailData {
  key: string;
  dateObj: Date;
  executed: DayDetailExecuted[];
  planned: DayDetailPlanned[];
  isEmpty: boolean;
}

/** Porta de snoozedOn (index.html:11027-11030) — dia (não "agora") dentro de
 * algum período de agenda pausada. */
export function snoozedOn(snoozes: Snooze[], dateObj: Date): boolean {
  const t = dateObj.getTime();
  return snoozes.some((s) => t >= s.from && t <= s.to);
}

/** Porta de solidColor (index.html:2388) — fallback diferente de
 * `fillStyle` (scoring.ts), só para os gráficos de Estatísticas. */
export function solidColor(c: string | undefined | null): string {
  return !c || c === "grad" || c === "#C98A3E" ? "#B96BC4" : c;
}

/** Porta de median (index.html:5323-5327) — usado pelas próximas fatias
 * (detalhe por rotina: desvio/humor/atraso mediano). */
export function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Porta de renderWeekView (index.html:5842-5878), separando dado de HTML —
 * `days` já vem na ordem do dia de início configurado (weekStart), porque
 * `inicioSemanaISO` já ancora nele; só os RÓTULOS de coluna (D/S/T/Q/Q/S/S)
 * precisam de `ordemDiasSemana()` à parte, na tela. */
export function getWeekGridData(
  calWeek: Date,
  history: HistoryEntry[],
  routines: Routine[],
  snoozes: Snooze[],
  gam: GamificacaoState,
  weekStart = 0,
): WeekGridData {
  const weekStartIso = inicioSemanaISO(calWeek, weekStart);
  const weekStartDate = isoToDate(weekStartIso);
  const todayK = localKey(new Date());

  let plannedTotal = 0;
  let doneTotal = 0;
  let missedTotal = 0;
  const days: WeekDayData[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);

    const key = localKey(d);
    const executed = history.filter((h) => h.date === key);
    const execIds = new Set(executed.map((h) => h.routineId));

    const planned = routines.filter((r) => {
      if (!rotinaAgendadaEm(r, d)) return false;
      if (r.createdAt && d.getTime() < new Date(new Date(r.createdAt).setHours(0, 0, 0, 0)).getTime()) return false;
      if (snoozedOn(snoozes, d)) return false;
      return true;
    });

    const isPast = key < todayK;
    const missed = isPast ? planned.filter((r) => !execIds.has(r.id)).length : 0;

    if (isPast || key === todayK) {
      plannedTotal += planned.length;
      doneTotal += planned.filter((r) => execIds.has(r.id)).length;
      missedTotal += missed;
    }

    const dotsColors: string[] = [];
    Array.from(execIds)
      .slice(0, 3)
      .forEach((id) => {
        const r = routines.find((x) => x.id === id);
        dotsColors.push(r ? solidColor(corDaRotina(r, gam)) : "var(--sub)");
      });
    if (executed.length > 0 && execIds.size === 0) dotsColors.push("var(--sub)");

    const temAlgo = executed.length > 0 || planned.length > 0;

    days.push({
      key,
      dow: d.getDay(),
      dateObj: d,
      isToday: key === todayK,
      executedRoutineIds: Array.from(execIds),
      dotsColors,
      missedCount: missed,
      temAlgo,
    });
  }

  const rate = plannedTotal > 0 ? Math.round((doneTotal / plannedTotal) * 100) : null;
  return { days, plannedTotal, doneTotal, missedTotal, rate };
}

/** Porta de dayDetailHtml (index.html:5433-5455) — execuções do dia e
 * rotinas planejadas ainda não feitas (com status "agendada"/"não feita"). */
export function getDayDetailData(key: string, history: HistoryEntry[], routines: Routine[], snoozes: Snooze[]): DayDetailData {
  const d = new Date(key + "T12:00:00");
  const executed = history.filter((h) => h.date === key);
  const isPastOrToday = key <= localKey(new Date());

  const plannedRoutines = routines.filter((r) => rotinaAgendadaEm(r, d));
  const planned: DayDetailPlanned[] = [];

  plannedRoutines.forEach((r) => {
    const done = executed.some((h) => h.routineId === r.id);
    if (done) return;
    if (r.createdAt && d.getTime() < new Date(new Date(r.createdAt).setHours(0, 0, 0, 0)).getTime()) return;
    if (snoozedOn(snoozes, d)) return;

    const sched = computeSchedule(r);
    const status = isPastOrToday && key < localKey(new Date()) ? "não feita" : "agendada";
    planned.push({ routineName: r.name, startStr: sched ? sched.startStr : "", status });
  });

  const executedMapped: DayDetailExecuted[] = executed.map((h) => ({
    routineName: h.routineName,
    actualSec: h.actualSec ?? null,
    ts: h.ts ?? null,
  }));

  return { key, dateObj: d, executed: executedMapped, planned, isEmpty: executed.length === 0 && planned.length === 0 };
}
