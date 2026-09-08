// Gerador de id local (porta do `uid()` que já existia em useAppStore.ts) —
// extraído para módulo próprio, sem dependência, para poder ser usado tanto
// pela store principal quanto por qualquer slice futuro sem import circular.
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
