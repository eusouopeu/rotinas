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

/** Porta de rotinaAgendadaEm (index.html:3166-3176) — decide se a rotina
 * ocorre num dia específico (modo "dias" ou "a cada N dias"). */
export function rotinaAgendadaEm(r: Routine, date: Date): boolean {
  if (!r.schedule || !r.schedule.enabled) return false;
  if (r.schedule.mode === "intervalo") {
    const n = Math.max(1, r.schedule.intervaloDias || 1);
    const [y, m, dd] = (r.schedule.intervaloInicio || isoOf(date)).split("-").map(Number);
    const ref = new Date(y, m - 1, dd);
    const alvo = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDias = Math.round((alvo.getTime() - ref.getTime()) / 86400000);
    return diffDias >= 0 && diffDias % n === 0;
  }
  return (r.schedule.days || []).includes(date.getDay());
}

const DIAS_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function diasDaRotina(r: Routine): number[] {
  const d = r.schedule && r.schedule.days;
  return d && d.length ? d : [0, 1, 2, 3, 4, 5, 6];
}

/** Porta de diasChipHtml (index.html:3196-3207), sem o `<div>` — a tela decide o wrapper. */
export function diasChipLabel(r: Routine): string {
  if (r.schedule && r.schedule.mode === "intervalo") {
    return `a cada ${r.schedule.intervaloDias || 1}d`;
  }
  const dias = diasDaRotina(r)
    .slice()
    .sort((a, b) => a - b);
  if (dias.length === 7) return "todos os dias";
  if (dias.length === 5 && dias.every((d) => d >= 1 && d <= 5)) return "dias úteis";
  if (dias.length === 2 && dias[0] === 0 && dias[1] === 6) return "fim de semana";
  /* Corrida de 3+ dias seguidos vira intervalo ("ter → sex" em vez de
     "ter/qua/qui/sex") — pedido do Pedro em 22/09/2026, para o card não
     encher de barras. Dois dias seguidos continuam listados: "ter/qua" é mais
     curto que "ter → qua" e não ganha nada. Grupos separados se juntam com
     "/", então [dom, ter, qua, qui] sai como "dom/ter → qui". Não há volta ao
     início da semana: sáb+dom+seg fica "dom/seg/sáb", que é o que a ordem
     literal dos dias descreve. */
  const grupos: number[][] = [];
  dias.forEach((d) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && d === ultimo[ultimo.length - 1] + 1) ultimo.push(d);
    else grupos.push([d]);
  });
  return grupos
    .map((g) =>
      g.length >= 3 ? DIAS_ABREV[g[0]] + " → " + DIAS_ABREV[g[g.length - 1]] : g.map((d) => DIAS_ABREV[d]).join("/")
    )
    .join("/");
}

function isoOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
