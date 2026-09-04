// Porta de index.html:1052-1058.
export function fmtTime(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return (neg ? "+" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

/** Porta de fmtClock (index.html:1058) — "HH:MM" a partir de um Date. */
export function fmtClock(date: Date): string {
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

/** Porta de fmtMinLabel (index.html:1060-1065) — "+171min" vira "+2h51",
 * minutos crus só até 59; a partir de 1h vira h+min. */
export function fmtMinLabel(min: number): string {
  const abs = Math.abs(Math.round(min));
  const sinal = min > 0 ? "+" : min < 0 ? "−" : "";
  if (abs < 60) return sinal + (abs || 0) + "min";
  return sinal + Math.floor(abs / 60) + "h" + String(abs % 60).padStart(2, "0");
}

