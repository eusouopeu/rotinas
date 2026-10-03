// Porta de index.html:1052-1058.
export function fmtTime(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return (neg ? "+" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

/** Número no formato brasileiro, com `casas` decimais fixas: vírgula decimal e
 * ponto de milhar ("83,6", "1.800,00"). Única porta de exibição de números
 * com casas decimais desde 03/10/2026 — `toFixed` fica para chaves e CSV. */
export function fmtNum(n: number, casas = 1): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
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

/** xp dos cartões: "2,5" / "0,125" (até 3 casas abaixo de 1, uma acima). */
export function fmtXp(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(n) < 1 ? 3 : 1 });
}
