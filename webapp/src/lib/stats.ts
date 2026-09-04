// Porta das funções puras de renderStats/renderWeekView/dayDetailHtml
// (index.html:5296-5333, 5418-5459, 5842-5909) — visão semanal da tela
// "Estatísticas" (aba "Dados" no legado): grade de cumprimento da semana e
// detalhe de execuções/faltas por dia. Sem efeitos colaterais.
import type { Routine, GamificacaoState, RoutineStep } from "./types";
import type { HistoryEntry } from "./history";
import {
  localKey,
  inicioSemanaISO,
  isoToDate,
  ordemDiasSemana,
  offsetSemana,
  janelaSemanaLabel,
} from "./gamificacao";
import { rotinaAgendadaEm, computeSchedule } from "./schedule";
import { corDaRotina, fillStyle } from "./scoring";
import { fmtClock, fmtTime, fmtMinLabel } from "./format";

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

export interface MonthDayData {
  key: string;
  day: number;
  dateObj: Date;
  isToday: boolean;
  executedRoutineIds: string[];
  dotsColors: string[];
  missedCount: number;
  temAlgo: boolean;
}

export interface MonthGridData {
  monthName: string;
  year: number;
  voidCount: number;
  days: MonthDayData[];
  plannedTotal: number;
  doneTotal: number;
  missedTotal: number;
  rate: number | null;
}

export interface HeatmapCell {
  key: string;
  inRange: boolean;
  min: number;
  intensity: string;
  dateObj: Date;
}

export interface HeatmapColumn {
  monthLabel: string;
  cells: HeatmapCell[];
}

export interface HeatmapData {
  columns: HeatmapColumn[];
}

export interface YearMonthlyBar {
  monthName: string;
  monthIdx: number;
  minutes: number;
  pct: number;
  valStr: string;
}

export interface YearMonthlyData {
  bars: YearMonthlyBar[];
  totalMinutes: number;
  totalHoursStr: string;
}

export interface GoalRoutineData {
  routineId: string;
  routineName: string;
  icon?: string;
  doneCount: number;
  weeklyGoalTimes: number;
  pct: number;
  expCount: number;
  expPct: number;
  onPace: boolean;
  color: string;
}

export interface DowStackSeg {
  routineId: string;
  routineName: string;
  sec: number;
  height: number;
  color: string;
}

export interface DowStackCol {
  dow: number;
  dowLabel: string;
  totalMin: number;
  totalSec: number;
  segs: DowStackSeg[];
}

export interface HourColData {
  hour: number;
  count: number;
  height: number;
  showLabel: boolean;
}

export interface SchedComplianceData {
  routineId: string;
  routineName: string;
  icon?: string;
  doneDays: number;
  plannedDays: number;
  pct: number;
  statusClass: "early" | "ontime" | "late";
}

export interface RoutineStreakData {
  routineId: string;
  routineName: string;
  icon?: string;
  streak: number;
}

export interface StepBottleneckData {
  routineId: string;
  routineName: string;
  stepName: string;
  n: number;
  plan: number;
  medAct: number;
  medDev: number;
  medDevStr: string;
  statusClass: "early" | "ontime" | "late";
}

export interface PunctualityData {
  routineName: string;
  medDelay: number;
  count: number;
  label: string;
  statusClass: "early" | "ontime" | "late";
}

export interface TrendWeekData {
  ts: number;
  dateLabel: string;
  val: number | null;
  valLabel: string;
  height: number;
  statusClass: "early" | "ontime" | "late" | "";
}

export interface RecentExecutionData {
  ts: number;
  routineId: string;
  routineName: string;
  dateStr: string;
  timeStr: string;
  plannedSec?: number;
  plannedStr: string;
  actualSec?: number;
  actualStr: string;
  statusClass: "early" | "ontime" | "late" | "";
}

export interface PeriodExtrasData {
  periodLbl: string;
  insights: string[];
  goals: GoalRoutineData[];
  janelaSemana: string;
  dowCols: DowStackCol[];
  hasDowTotals: boolean;
  hourCols: HourColData[];
  hasHourCounts: boolean;
  schedCompliance: SchedComplianceData[];
  streaks: RoutineStreakData[];
  stepBottlenecks: StepBottleneckData[];
  punctuality: PunctualityData[];
  delayTrend: TrendWeekData[];
  hasDelayTrend: boolean;
  recent: RecentExecutionData[];
}

export interface RoutineStepStat {
  name: string;
  n: number;
  plan: number;
  medAct: number;
  medDev: number;
  medDevStr: string;
  statusClass: "early" | "ontime" | "late";
  suggestAdjust: boolean;
  newSec: number;
  newSecLabel: string;
}

export interface RoutineDurRow {
  name: string;
  n: number;
  plan: number;
  difMedia: number;
  difMediana: number;
  difMediaStr: string;
  difMedianaStr: string;
  statusMedia: "early" | "ontime" | "late";
  statusMediana: "early" | "ontime" | "late";
}

export interface ExerciseAggRow {
  exercicioId: string;
  nome: string;
  maxPeso: number;
  count: number;
  evolucao: number;
  primeiraTs: number;
  serieText: string;
  evoText: string;
}

export interface RoutineHourCol {
  hour: number;
  count: number;
  height: number;
  showLabel: boolean;
}

export interface RoutineExecutionItem {
  ts: number;
  dateStr: string;
  timeStr: string;
  plannedSec?: number;
  actualSec?: number;
  cmpStr: string;
  moodStr: string;
}

export interface RoutineDetailStats {
  allCount: number;
  totalMin: number;
  totalTimeStr: string;
  streak: number;
  medDev: number | null;
  medDevStr: string;
  medDevClass: "early" | "ontime" | "late";
  devsCount: number;
  medMood: number | null;
  moodStars: string;
  moodCount: number;
  medDelay: number | null;
  delayCount: number;
  stepRows: RoutineStepStat[];
  durRows: RoutineDurRow[];
  exerciseRows: ExerciseAggRow[];
  hourCols: RoutineHourCol[];
  hasHourCounts: boolean;
  routineColor: string;
  recent: RoutineExecutionItem[];
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

/** Porta de intensityClass (index.html:5425-5431). */
export function intensityClass(min: number): string {
  if (!min) return "lv0";
  if (min < 15) return "lv1";
  if (min < 45) return "lv2";
  if (min < 90) return "lv3";
  return "lv4";
}

/** Porta de minutesByDate (index.html:5418-5424). */
export function minutesByDate(entries: HistoryEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  entries.forEach((h) => {
    map[h.date] = (map[h.date] || 0) + Math.round((h.actualSec || 0) / 60);
  });
  return map;
}

/** Porta de startTsOf (index.html:5331). */
export function startTsOf(h: HistoryEntry): number {
  return (h.ts || 0) - ((h.actualSec || 0) + (h.pausedSec || 0)) * 1000;
}

/** Porta de computeStreakFor (index.html:2397-2414). */
export function computeStreakFor(routineId: string, routines: Routine[], history: HistoryEntry[]): number {
  const r = routines.find((x) => x.id === routineId);
  const days = new Set(history.filter((h) => h.routineId === routineId).map((h) => h.date));
  if (days.size === 0) return 0;
  const restrito = !!(
    r &&
    r.schedule &&
    r.schedule.enabled &&
    (r.schedule.mode === "intervalo" || (r.schedule.days && r.schedule.days.length < 7))
  );
  const todayKey = localKey();
  let streak = 0;
  const d = new Date();
  let guard = 0;
  while (guard++ < 3700) {
    const key = localKey(d);
    if (restrito && !rotinaAgendadaEm(r, d)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (key === todayKey) {
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Porta de algumaRotinaDevidaEm (index.html:2420-2422). */
export function algumaRotinaDevidaEm(date: Date, routines: Routine[]): boolean {
  return routines.some((r) => rotinaAgendadaEm(r, date));
}

/** Porta de computeStreak (index.html:2423-2436). */
export function computeStreak(routines: Routine[], history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => h.date));
  const todayKey = localKey();
  let streak = 0;
  const d = new Date();
  let guard = 0;
  while (guard++ < 3700) {
    const key = localKey(d);
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (key === todayKey) {
      d.setDate(d.getDate() - 1);
    } else if (!algumaRotinaDevidaEm(d, routines)) {
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Porta de statsRoutineFiltered (index.html:5302-5304). */
export function statsRoutineFiltered(arr: HistoryEntry[], routineFilter?: string | null): HistoryEntry[] {
  return routineFilter ? arr.filter((h) => h.routineId === routineFilter) : arr;
}

/** Porta de richParaPeriodo (index.html:5308-5311). */
export function richParaPeriodo(
  period: "30d" | "ano",
  history: HistoryEntry[],
  routineFilter?: string | null,
  now = Date.now(),
): HistoryEntry[] {
  const startTs = period === "30d" ? now - 30 * 86400000 : now - 365 * 86400000;
  return statsRoutineFiltered(
    history.filter((h) => h.ts && h.ts >= startTs),
    routineFilter,
  );
}

/** Porta de gerarInsights (index.html:5339-5409). */
export function gerarInsights(rich: HistoryEntry[]): string[] {
  const insights: string[] = [];
  const DOW_NOME = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"];

  // 1. Rotina com atraso mediano alto no início (>10min, n>=3)
  const porRotinaAtraso: Record<string, number[]> = {};
  rich.forEach((h) => {
    if (h.schedDelayMin === undefined) return;
    (porRotinaAtraso[h.routineName] = porRotinaAtraso[h.routineName] || []).push(h.schedDelayMin);
  });
  Object.entries(porRotinaAtraso).forEach(([nome, arr]) => {
    if (arr.length < 3) return;
    const med = median(arr);
    if (med > 10) {
      insights.push(`<b>${nome}</b> atrasa em média ${Math.round(med)}min pra começar — considere mudar o horário agendado.`);
    }
  });

  // 2. Dia da semana com atraso bem acima da mediana geral (>=10min de diferença, comDelay>=6, dia>=3)
  const comDelay = rich.filter((h) => h.schedDelayMin !== undefined);
  if (comDelay.length >= 6) {
    const porDow: number[][] = Array.from({ length: 7 }, () => []);
    comDelay.forEach((h) => porDow[new Date(h.ts).getDay()].push(h.schedDelayMin!));
    const medGeral = median(comDelay.map((h) => h.schedDelayMin!));
    let pior: { dow: number; med: number } | null = null;
    for (let dow = 0; dow < porDow.length; dow++) {
      const arr = porDow[dow];
      if (arr.length < 3) continue;
      const med = median(arr);
      if (med - medGeral >= 10 && (!pior || med > pior.med)) pior = { dow, med };
    }
    if (pior) {
      insights.push(`Você atrasa mais às <b>${DOW_NOME[pior.dow]}</b> — média de ${Math.round(pior.med)}min, contra ${Math.round(medGeral)}min nos outros dias.`);
    }
  }

  // 3. Rotina que estoura (ou sobra folga) do tempo planejado com frequência (med >= 25% ou <= -25%, n>=3)
  const porRotinaDur: Record<string, HistoryEntry[]> = {};
  rich.forEach((h) => {
    if (!h.plannedSec) return;
    (porRotinaDur[h.routineName] = porRotinaDur[h.routineName] || []).push(h);
  });
  Object.entries(porRotinaDur).forEach(([nome, arr]) => {
    if (arr.length < 3) return;
    const med = median(arr.map((h) => ((h.actualSec || 0) - h.plannedSec!) / h.plannedSec!));
    if (med >= 0.25) {
      insights.push(`<b>${nome}</b> costuma estourar o tempo planejado em ${Math.round(med * 100)}% — talvez valha ajustar a duração.`);
    } else if (med <= -0.25) {
      insights.push(`<b>${nome}</b> costuma terminar bem antes do planejado (${Math.round(-med * 100)}% mais rápido) — talvez valha encurtar o tempo agendado.`);
    }
  });

  // 4. Rotina com humor sistematicamente mais baixo que a média geral (diferença >= 1, comMood>=6, n>=3)
  const comMood = rich.filter((h) => h.mood != null);
  if (comMood.length >= 6) {
    const medGeralMood = median(comMood.map((h) => h.mood!));
    const porRotinaMood: Record<string, number[]> = {};
    comMood.forEach((h) => {
      (porRotinaMood[h.routineName] = porRotinaMood[h.routineName] || []).push(h.mood!);
    });
    Object.entries(porRotinaMood).forEach(([nome, arr]) => {
      if (arr.length < 3) return;
      const med = median(arr);
      if (medGeralMood - med >= 1) {
        insights.push(`<b>${nome}</b> costuma vir com humor mais baixo (${med.toFixed(1)} contra ${medGeralMood.toFixed(1)} da média) — vale olhar se ela está pesando mais do que deveria.`);
      }
    });
  }

  // 5. Dias de humor baixo puxam mais etapas puladas do que dias de humor alto
  const comMoodSkip = rich.filter((h) => h.mood != null && h.skippedCount != null);
  if (comMoodSkip.length >= 6) {
    const baixos = comMoodSkip.filter((h) => h.mood! <= 2);
    const altos = comMoodSkip.filter((h) => h.mood! >= 4);
    if (baixos.length >= 3 && altos.length >= 3) {
      const medBaixo = median(baixos.map((h) => h.skippedCount!));
      const medAlto = median(altos.map((h) => h.skippedCount!));
      if (medBaixo - medAlto >= 1) {
        insights.push(`Em dias de humor mais baixo você costuma pular ${Math.round(medBaixo - medAlto)} etapa(s) a mais do que em dias de humor alto.`);
      }
    }
  }

  return insights.slice(0, 5);
}

/** Porta de renderMonthView (index.html:5916-5970). */
export function getMonthGridData(
  calMonth: Date,
  history: HistoryEntry[],
  routines: Routine[],
  snoozes: Snooze[],
  gam: GamificacaoState,
  weekStart = 0,
): MonthGridData {
  const MONTH_NAMES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const y = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const first = new Date(y, mo, 1, 12);
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const todayK = localKey(new Date());

  const voidCount = offsetSemana(first.getDay(), weekStart);
  let plannedTotal = 0;
  let doneTotal = 0;
  let missedTotal = 0;
  const days: MonthDayData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, mo, day, 12);
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
      day,
      dateObj: d,
      isToday: key === todayK,
      executedRoutineIds: Array.from(execIds),
      dotsColors,
      missedCount: missed,
      temAlgo,
    });
  }

  const rate = plannedTotal > 0 ? Math.round((doneTotal / plannedTotal) * 100) : null;
  return {
    monthName: MONTH_NAMES[mo],
    year: y,
    voidCount,
    days,
    plannedTotal,
    doneTotal,
    missedTotal,
    rate,
  };
}

/** Porta de heatmapHtml (index.html:5461-5487). */
export function getHeatmapData(calYear: number, history: HistoryEntry[], weekStart = 0): HeatmapData {
  const from = new Date(calYear, 0, 1, 12);
  const to = calYear === new Date().getFullYear() ? new Date() : new Date(calYear, 11, 31, 12);
  to.setHours(12, 0, 0, 0);

  const startIso = inicioSemanaISO(from, weekStart);
  const start = isoToDate(startIso);
  start.setHours(12, 0, 0, 0);

  const byDate = minutesByDate(history);
  const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  const columns: HeatmapColumn[] = [];
  const cur = new Date(start);
  let lastMonth = -1;

  while (cur <= to) {
    const weekStartMonth = cur.getMonth();
    const monthLabel = weekStartMonth !== lastMonth ? MONTHS[weekStartMonth] : "";
    lastMonth = weekStartMonth;

    const cells: HeatmapCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = localKey(cur);
      const inRange = cur >= from && cur <= to;
      const min = byDate[key] || 0;
      cells.push({
        key,
        inRange,
        min,
        intensity: inRange ? intensityClass(min) : "hm-void",
        dateObj: new Date(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }
    columns.push({ monthLabel, cells });
  }

  return { columns };
}

/** Porta do gráfico de horas por mês na visão anual (index.html:6000-6020). */
export function getYearMonthlyBars(calYear: number, history: HistoryEntry[], routineFilter?: string | null): YearMonthlyData {
  const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const monthMin = new Array(12).fill(0);
  statsRoutineFiltered(history, routineFilter).forEach((h) => {
    if (!h.date.startsWith(String(calYear))) return;
    const mo = +h.date.slice(5, 7) - 1;
    monthMin[mo] += Math.round((h.actualSec || 0) / 60);
  });

  const totalMinutes = monthMin.reduce((a, b) => a + b, 0);
  const maxM = Math.max(...monthMin, 1);

  const bars: YearMonthlyBar[] = monthMin.map((min, i) => ({
    monthName: MONTHS[i],
    monthIdx: i,
    minutes: min,
    pct: min ? Math.max(3, (min / maxM) * 100) : 0,
    valStr: min >= 60 ? (min / 60).toFixed(1).replace(".", ",") + "h" : min + "m",
  }));

  return {
    bars,
    totalMinutes,
    totalHoursStr: (totalMinutes / 60).toFixed(1).replace(".", ",") + "h",
  };
}

/** Porta das seções de período de renderPeriodExtras (index.html:5635-5835). */
export function getPeriodExtrasData(
  period: "30d" | "ano",
  history: HistoryEntry[],
  routines: Routine[],
  snoozes: Snooze[],
  gam: GamificacaoState,
  routineFilter?: string | null,
  weekStart = 0,
): PeriodExtrasData {
  const periodLbl = period === "30d" ? "30d" : "ano";
  const rich = richParaPeriodo(period, history, routineFilter);
  const allRich = statsRoutineFiltered(
    history.filter((h) => h.ts),
    routineFilter,
  );

  // 1. Insights
  const insights = gerarInsights(rich);

  // 2. Metas semanais com pró-rata
  const weekStartDate = isoToDate(inicioSemanaISO(new Date(), weekStart));
  const elapsedDays = Math.min(7, Math.floor((Date.now() - weekStartDate.getTime()) / 86400000) + 1);
  const weekEntries = statsRoutineFiltered(
    history.filter((h) => h.ts && h.ts >= weekStartDate.getTime()),
    routineFilter,
  );
  const goalRoutines = routines.filter(
    (r) => (r.weeklyGoalTimes || 0) > 0 && (!routineFilter || r.id === routineFilter),
  );

  const goals: GoalRoutineData[] = goalRoutines.map((r) => {
    const doneCount = weekEntries.filter((h) => h.routineId === r.id).length;
    const goal = r.weeklyGoalTimes!;
    const pct = Math.min(100, Math.round((doneCount / goal) * 100));
    const expCount = (goal * elapsedDays) / 7;
    const expPct = Math.min(100, Math.round((expCount / goal) * 100));
    const onPace = doneCount >= expCount;
    return {
      routineId: r.id,
      routineName: r.name,
      icon: r.icon,
      doneCount,
      weeklyGoalTimes: goal,
      pct,
      expCount,
      expPct,
      onPace,
      color: fillStyle(corDaRotina(r, gam)),
    };
  });

  // 3. Distribuição por dia da semana (empilhada)
  const DOWL = ["D", "S", "T", "Q", "Q", "S", "S"];
  const dowStack: Array<Record<string, number>> = Array.from({ length: 7 }, () => ({}));
  rich.forEach((h) => {
    const dow = new Date(h.ts).getDay();
    dowStack[dow][h.routineId] = (dowStack[dow][h.routineId] || 0) + (h.actualSec || 0);
  });
  const dowTotals = dowStack.map((o) => Object.values(o).reduce((a, b) => a + b, 0));
  const maxDow = Math.max(...dowTotals, 1);
  const hasDowTotals = dowTotals.some((t) => t > 0);

  const dowCols: DowStackCol[] = ordemDiasSemana(weekStart).map((dow) => {
    const o = dowStack[dow];
    const segs: DowStackSeg[] = Object.entries(o).map(([rid, sec]) => {
      const r = routines.find((x) => x.id === rid);
      return {
        routineId: rid,
        routineName: r ? r.name : "",
        sec,
        height: Math.max(2, (sec / maxDow) * 80),
        color: solidColor(r ? corDaRotina(r, gam) : null),
      };
    });
    return {
      dow,
      dowLabel: DOWL[dow],
      totalMin: Math.round(dowTotals[dow] / 60),
      totalSec: dowTotals[dow],
      segs,
    };
  });

  // 4. Histograma de horário de início
  const hourCounts = new Array(24).fill(0);
  rich.forEach((h) => {
    hourCounts[new Date(startTsOf(h)).getHours()]++;
  });
  const maxHour = Math.max(...hourCounts, 1);
  const hasHourCounts = hourCounts.some((c) => c > 0);

  const hourCols: HourColData[] = hourCounts.map((count, hh) => ({
    hour: hh,
    count,
    height: count ? Math.max(3, (count / maxHour) * 54) : 0,
    showLabel: hh % 3 === 0,
  }));

  // 5. Taxa de cumprimento do agendado
  const startPer = period === "30d" ? Date.now() - 30 * 86400000 : Date.now() - 365 * 86400000;
  const schedRoutines = routines.filter(
    (r) => r.schedule && r.schedule.enabled && (!routineFilter || r.id === routineFilter),
  );
  const schedCompliance: SchedComplianceData[] = [];

  schedRoutines.forEach((r) => {
    let plannedDays = 0;
    let doneDays = 0;
    const effStart = Math.max(startPer, r.createdAt || 0);
    const d = new Date(effStart);
    d.setHours(12, 0, 0, 0);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const doneSet = new Set(history.filter((h) => h.routineId === r.id).map((h) => h.date));
    let guard = 0;

    while (d <= today && guard++ < 400) {
      if (rotinaAgendadaEm(r, d) && !snoozedOn(snoozes, d)) {
        plannedDays++;
        if (doneSet.has(localKey(d))) doneDays++;
      }
      d.setDate(d.getDate() + 1);
    }

    if (plannedDays > 0) {
      const pct = Math.round((doneDays / plannedDays) * 100);
      const statusClass = pct >= 80 ? "early" : pct >= 50 ? "ontime" : "late";
      schedCompliance.push({
        routineId: r.id,
        routineName: r.name,
        icon: r.icon,
        doneDays,
        plannedDays,
        pct,
        statusClass,
      });
    }
  });

  // 6. Sequências por rotina
  const streakRoutines = routineFilter ? routines.filter((r) => r.id === routineFilter) : routines;
  const streaks: RoutineStreakData[] = streakRoutines
    .map((r) => ({
      routineId: r.id,
      routineName: r.name,
      icon: r.icon,
      streak: computeStreakFor(r.id, routines, history),
    }))
    .filter((x) => x.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  // 7. Etapas que mais estouram o planejado (cruzando todas as rotinas)
  const stepAggAll: Record<
    string,
    { n: number; acts: number[]; plan: number; routineId: string; routineName: string; name: string }
  > = {};
  rich.forEach((h) =>
    (h.steps || []).forEach((s) => {
      if (s.isRest || s.skipped || s.planned == null) return;
      const base = s.name.replace(/ · volta \d+\/\d+$/, "");
      const key = h.routineId + "|" + base;
      const a =
        stepAggAll[key] ||
        (stepAggAll[key] = {
          n: 0,
          acts: [],
          plan: s.planned,
          routineId: h.routineId,
          routineName: h.routineName,
          name: base,
        });
      a.n++;
      a.acts.push(s.actual);
      a.plan = s.planned;
    }),
  );

  const fmtSg = (v: number) => (v >= 0 ? "+" : "−") + fmtTime(Math.abs(v)).replace("+", "");

  const stepBottlenecks: StepBottleneckData[] = Object.values(stepAggAll)
    .filter((a) => a.n >= 2)
    .map((a) => {
      const medAct = Math.round(median(a.acts));
      const medDev = medAct - a.plan;
      const statusClass: "early" | "ontime" | "late" = medDev > 15 ? "late" : medDev < -15 ? "early" : "ontime";
      return {
        routineId: a.routineId,
        routineName: a.routineName,
        stepName: a.name,
        n: a.n,
        plan: a.plan,
        medAct,
        medDev,
        medDevStr: fmtSg(medDev),
        statusClass,
      };
    })
    .sort((a, b) => b.medDev - a.medDev)
    .slice(0, 8);

  // 8. Pontualidade mediana
  const punc = rich.filter((h) => h.schedDelayMin !== undefined);
  const byR: Record<string, number[]> = {};
  punc.forEach((h) => {
    (byR[h.routineName] = byR[h.routineName] || []).push(h.schedDelayMin!);
  });
  const punctuality: PunctualityData[] = Object.entries(byR).map(([name, arr]) => {
    const med = Math.round(median(arr));
    const statusClass: "early" | "ontime" | "late" = med > 5 ? "late" : med < -5 ? "early" : "ontime";
    return {
      routineName: name,
      medDelay: med,
      count: arr.length,
      label: fmtMinLabel(med),
      statusClass,
    };
  });

  // 9. Tendência da pontualidade (8 semanas)
  function weekKey(ts: number): number {
    return isoToDate(inicioSemanaISO(new Date(ts), weekStart)).getTime();
  }
  const now8 = weekKey(Date.now());
  const weeks: number[] = [];
  for (let w = 7; w >= 0; w--) weeks.push(now8 - w * 7 * 86400000);

  const delayByWeek: Record<number, number[]> = {};
  allRich.forEach((h) => {
    const wk = weekKey(h.ts);
    if (h.schedDelayMin !== undefined) {
      (delayByWeek[wk] = delayByWeek[wk] || []).push(h.schedDelayMin);
    }
  });

  const hasDelayTrend = Object.keys(delayByWeek).length > 0;
  const buckets = weeks.map((wk) => delayByWeek[wk] || null);
  const vals = buckets.map((b) => (b ? median(b) : null));
  const maxAbs = Math.max(1, ...vals.filter((v): v is number => v !== null).map((v) => Math.abs(v)));

  const delayTrend: TrendWeekData[] = vals.map((v, i) => {
    const d = new Date(weeks[i]);
    const dateLabel = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
    if (v === null) {
      return { ts: weeks[i], dateLabel, val: null, valLabel: "", height: 0, statusClass: "" };
    }
    const h = Math.max(6, (Math.abs(v) / maxAbs) * 46);
    const statusClass = v > 0.5 ? "late" : v < -0.5 ? "early" : "ontime";
    const valLabel = (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",");
    return { ts: weeks[i], dateLabel, val: v, valLabel, height: h, statusClass };
  });

  // 10. Execuções recentes
  const recentRaw = [...rich].sort((a, b) => b.ts - a.ts).slice(0, 8);
  const recent: RecentExecutionData[] = recentRaw.map((h) => {
    const d = new Date(h.ts);
    const dateStr = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
    const timeStr = fmtClock(d);
    const plannedStr = h.plannedSec ? fmtTime(h.plannedSec).replace("+", "") : "—";
    const actualStr = fmtTime(h.actualSec || 0).replace("+", "");
    const statusClass = h.plannedSec
      ? (h.actualSec || 0) > h.plannedSec
        ? "late"
        : (h.actualSec || 0) < h.plannedSec
          ? "early"
          : "ontime"
      : "";
    return {
      ts: h.ts,
      routineId: h.routineId,
      routineName: h.routineName,
      dateStr,
      timeStr,
      plannedSec: h.plannedSec,
      plannedStr,
      actualSec: h.actualSec,
      actualStr,
      statusClass,
    };
  });

  return {
    periodLbl,
    insights,
    goals,
    janelaSemana: janelaSemanaLabel(weekStart),
    dowCols,
    hasDowTotals,
    hourCols,
    hasHourCounts,
    schedCompliance,
    streaks,
    stepBottlenecks,
    punctuality,
    delayTrend,
    hasDelayTrend,
    recent,
  };
}

/** Porta de renderRoutineStats (index.html:6052-6175). */
export function getRoutineDetailStats(routine: Routine, history: HistoryEntry[], gam?: GamificacaoState): RoutineDetailStats {
  const entries = history.filter((h) => h.routineId === routine.id && h.ts);
  const all = history.filter((h) => h.routineId === routine.id);
  const totalMin = Math.round(entries.reduce((a, h) => a + (h.actualSec || 0), 0) / 60);
  const totalTimeStr = totalMin >= 60 ? (totalMin / 60).toFixed(1).replace(".", ",") + "h" : totalMin + "min";

  const devs = entries.filter((h) => h.plannedSec).map((h) => (h.actualSec || 0) - h.plannedSec!);
  const delays = entries.filter((h) => h.schedDelayMin !== undefined).map((h) => h.schedDelayMin!);
  const fmtS = (v: number) => (v >= 0 ? "+" : "−") + fmtTime(Math.abs(v)).replace("+", "");

  const medDev = devs.length ? Math.round(median(devs)) : null;
  const medDevClass: "early" | "ontime" | "late" =
    medDev != null ? (medDev > 30 ? "late" : medDev < -30 ? "early" : "ontime") : "ontime";

  const moods = entries.filter((h) => h.mood).map((h) => h.mood!);
  const medMood = moods.length ? Math.round(median(moods)) : null;
  const stars = ["★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"];
  const moodStars = medMood ? stars[medMood - 1] : "";

  const medDelay = delays.length ? Math.round(median(delays)) : null;

  // Análise por etapa
  const stepAgg: Record<string, { n: number; acts: number[]; plan: number }> = {};
  entries.forEach((h) =>
    (h.steps || []).forEach((s) => {
      if (s.isRest || s.skipped || s.planned == null) return;
      const base = s.name.replace(/ · volta \d+\/\d+$/, "");
      const a = stepAgg[base] || (stepAgg[base] = { n: 0, acts: [], plan: s.planned });
      a.n++;
      a.acts.push(s.actual);
      a.plan = s.planned;
    }),
  );

  const stepRows: RoutineStepStat[] = Object.entries(stepAgg)
    .map(([name, a]) => {
      const medAct = Math.round(median(a.acts));
      const dev = medAct - a.plan;
      const statusClass: "early" | "ontime" | "late" = dev > 15 ? "late" : dev < -15 ? "early" : "ontime";
      const suggestAdjust =
        a.n >= 3 &&
        Math.abs(dev) >= 30 &&
        Math.abs(dev) >= a.plan * 0.2 &&
        routine.steps.some((st: RoutineStep) => st.name === name && st.type === "timer");
      const newSec = Math.ceil(medAct / 30) * 30;
      const newSecLabel =
        (newSec / 60) % 1 === 0 ? newSec / 60 + "min" : fmtTime(newSec).replace("+", "");
      return {
        name,
        n: a.n,
        plan: a.plan,
        medAct,
        medDev: dev,
        medDevStr: fmtS(dev),
        statusClass,
        suggestAdjust,
        newSec,
        newSecLabel,
      };
    })
    .sort((a, b) => b.medDev - a.medDev);

  // Planejado - real (média · mediana)
  const durRows: RoutineDurRow[] = Object.entries(stepAgg)
    .map(([name, a]) => {
      const soma = a.acts.reduce((s, v) => s + v, 0);
      const media = soma / a.acts.length;
      const medAct = median(a.acts);
      const difMedia = a.plan - media;
      const difMediana = a.plan - medAct;
      const statusMedia: "early" | "ontime" | "late" = difMedia < -15 ? "late" : difMedia > 15 ? "early" : "ontime";
      const statusMediana: "early" | "ontime" | "late" =
        difMediana < -15 ? "late" : difMediana > 15 ? "early" : "ontime";
      return {
        name,
        n: a.n,
        plan: a.plan,
        difMedia: Math.round(difMedia),
        difMediana: Math.round(difMediana),
        difMediaStr: fmtS(Math.round(difMedia)),
        difMedianaStr: fmtS(Math.round(difMediana)),
        statusMedia,
        statusMediana,
      };
    })
    .sort((x, y) => x.difMedia - y.difMedia);

  // Carga por exercício
  const exAgg: Record<string, { nome: string; sessions: Array<{ ts: number; maxPeso: number }> }> = {};
  entries.forEach((h) =>
    (h.steps || []).forEach((s) => {
      if (!s.exercicioId || !s.series || !s.series.length) return;
      const a = exAgg[s.exercicioId] || (exAgg[s.exercicioId] = { nome: s.name, sessions: [] });
      const maxPeso = Math.max(0, ...s.series.map((x) => x.peso || 0));
      a.sessions.push({ ts: h.ts, maxPeso });
    }),
  );

  const dmy = (ts: number) => {
    const d = new Date(ts);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  };

  const exerciseRows: ExerciseAggRow[] = Object.entries(exAgg)
    .filter(([, a]) => a.sessions.length > 0)
    .map(([exercicioId, a]) => {
      const ord = a.sessions.slice().sort((x, y) => x.ts - y.ts);
      const ultima = ord[ord.length - 1];
      const primeira = ord[0];
      const evolucao = ultima.maxPeso - primeira.maxPeso;
      const evoText =
        ord.length > 1
          ? `${evolucao >= 0 ? "+" : "−"}${Math.abs(evolucao)}kg desde ${dmy(primeira.ts)}`
          : "";
      const serieText = ord
        .slice(-8)
        .map((s) => s.maxPeso + "kg")
        .join(" → ");
      return {
        exercicioId,
        nome: a.nome,
        maxPeso: ultima.maxPeso,
        count: a.sessions.length,
        evolucao,
        primeiraTs: primeira.ts,
        serieText,
        evoText,
      };
    });

  // Horário real de início
  const hourCounts = new Array(24).fill(0);
  entries.forEach((h) => {
    hourCounts[new Date(startTsOf(h)).getHours()]++;
  });
  const maxHour = Math.max(...hourCounts, 1);
  const hasHourCounts = hourCounts.some((c) => c > 0);

  const hourCols: RoutineHourCol[] = hourCounts.map((c, hh) => ({
    hour: hh,
    count: c,
    height: c ? Math.max(3, (c / maxHour) * 54) : 0,
    showLabel: hh % 3 === 0,
  }));

  // Execuções
  const recentRaw = [...entries].sort((a, b) => b.ts - a.ts).slice(0, 15);
  const recent: RoutineExecutionItem[] = recentRaw.map((h) => {
    const d = new Date(h.ts);
    const dateStr =
      String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
    const timeStr = fmtClock(d);
    const cmpStr = h.plannedSec
      ? `${fmtTime(h.plannedSec).replace("+", "")} → ${fmtTime(h.actualSec || 0).replace("+", "")}`
      : fmtTime(h.actualSec || 0).replace("+", "");
    const moodStr = h.mood ? stars[h.mood - 1] : "";
    return {
      ts: h.ts,
      dateStr,
      timeStr,
      plannedSec: h.plannedSec,
      actualSec: h.actualSec,
      cmpStr,
      moodStr,
    };
  });

  const streak = computeStreakFor(routine.id, [routine], history);
  const routineColor = gam ? fillStyle(corDaRotina(routine, gam)) : "var(--caneta)";

  return {
    allCount: all.length,
    totalMin,
    totalTimeStr,
    streak,
    medDev,
    medDevStr: medDev != null ? fmtS(medDev) : "",
    medDevClass,
    devsCount: devs.length,
    medMood,
    moodStars,
    moodCount: moods.length,
    medDelay,
    delayCount: delays.length,
    stepRows,
    durRows,
    exerciseRows,
    hourCols,
    hasHourCounts,
    routineColor,
    recent,
  };
}

