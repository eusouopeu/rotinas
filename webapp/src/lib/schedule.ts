// Porta de index.html:2919-2929 (formatHM/computeSchedule) — puro, sem DOM.
import { routineDurationRaw } from "./routines";
import type { Routine } from "./types";

export const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function formatHM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

export interface ComputedSchedule {
  startMin: number;
  endMin: number;
  startStr: string;
  endStr: string;
  durMin: number;
}

export function computeSchedule(routine: Routine): ComputedSchedule | null {
  if (!routine.schedule || !routine.schedule.enabled || !routine.schedule.time) return null;
  const durMin = Math.round(routineDurationRaw(routine) / 60);
  const [h, m] = routine.schedule.time.split(":").map(Number);
  const anchorMin = h * 60 + m;
  let startMin: number;
  let endMin: number;
  if (routine.schedule.anchor === "end") {
    endMin = anchorMin;
    startMin = anchorMin - durMin;
  } else {
    startMin = anchorMin;
    endMin = anchorMin + durMin;
  }
  return {
    startMin: ((startMin % 1440) + 1440) % 1440,
    endMin: ((endMin % 1440) + 1440) % 1440,
    startStr: formatHM(startMin),
    endStr: formatHM(endMin),
    durMin,
  };
}

export function novoDraftSchedule(): Routine["schedule"] {
  return { enabled: false, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] };
}
