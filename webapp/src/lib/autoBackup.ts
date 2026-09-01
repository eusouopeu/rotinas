// Porta de autoBackupNative (index.html:10785-10800) — auto-backup nativo
// (Android/Capacitor) a cada 3 dias em Documentos/<pasta>/Backups, com
// retenção dos 5 mais recentes. Só a lógica pura (nome do arquivo, filtro de
// retenção); a escrita em si usa window.Capacitor.Plugins.Filesystem
// (mesma ponte de lib/storage.ts). Igual a SyncCard/McpCard: fiel ao
// legado, mas inerte até o Electron/Capacitor apontar para o build React
// (ver docs/react-migration.md).
export function nomeAutoBackup(localKeyStr: string): string {
  return `rotinas-backup-auto-${localKeyStr}.json`;
}

const RE_AUTOBACKUP = /^rotinas-backup-auto-.*\.json$/;

/** Nomes de arquivo a apagar para manter só os 5 auto-backups mais
 * recentes (ordenação lexicográfica == cronológica, nome contém a data ISO). */
export function autoBackupsParaApagar(nomes: string[]): string[] {
  const autos = nomes.filter((n) => RE_AUTOBACKUP.test(n)).sort();
  return autos.slice(0, Math.max(0, autos.length - 5));
}
