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
