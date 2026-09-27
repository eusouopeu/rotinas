// Aviso de backup atrasado na aba Rotinas (recomendação 11, 27/09/2026). Sem
// servidor, a cópia dos dados depende do usuário: vale como proteção o que
// for mais recente entre exportação/arquivo (K_LASTBACKUP), auto-backup do
// Android (K_AUTOBAK) e a última sincronização com o Drive.

export const DIAS_AVISO_BACKUP = 7;
const DIA_MS = 86400000;

/**
 * Dias desde a última proteção dos dados, ou null quando não há o que avisar.
 * Sem nenhum backup, conta a partir do item mais antigo (`desde`), para um
 * app recém-instalado não pedir backup no primeiro dia.
 */
export function diasSemBackup(p: {
  marcas: Array<number | null | undefined>;
  desde: number | null;
  agora?: number;
}): number | null {
  const agora = p.agora ?? Date.now();
  const ultimo = Math.max(0, ...p.marcas.map((m) => (typeof m === "number" && m > 0 ? m : 0)));
  const base = ultimo || p.desde;
  if (!base) return null;
  const dias = Math.floor((agora - base) / DIA_MS);
  return dias >= DIAS_AVISO_BACKUP ? dias : null;
}
