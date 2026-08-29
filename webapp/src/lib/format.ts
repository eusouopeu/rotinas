// Porta de index.html:1052-1057.
export function fmtTime(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return (neg ? "+" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
