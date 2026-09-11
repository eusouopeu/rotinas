// Porta de storageBytes/checkStorageWarning (index.html:11017-11029). O app é
// local-first sem backend: estourar a cota do backend de storage é perda de
// dados silenciosa. O aviso sai uma única vez por sessão, como no legado.
import { storageSnapshot } from "./storage";

/** Tamanho aproximado, em bytes, de tudo que está no cache síncrono — mesma
 * conta do legado (JSON + chave, ×2 por caractere UTF-16). */
export function storageBytes(): number {
  let total = 0;
  try {
    storageSnapshot().forEach((v, k) => {
      total += (JSON.stringify(v).length + k.length) * 2;
    });
  } catch {
    /* valor incalculável (ciclo no JSON) — trata como 0, igual ao legado */
  }
  return total;
}

let avisado = false;

/** Limiar do legado: 100 MB. */
export const LIMITE_AVISO_MB = 100;

/** Devolve a mensagem de aviso quando o volume passou do limiar, ou null.
 * Uma vez por sessão (`avisado`), como no legado. A store decide o canal
 * (banner). */
export function checkStorageWarning(): string | null {
  if (avisado) return null;
  const mb = storageBytes() / 1048576;
  if (mb <= LIMITE_AVISO_MB) return null;
  avisado = true;
  return "Dados ocupando " + mb.toFixed(0) + " MB. Exporte um backup e considere apagar histórico/notas antigas.";
}

/** Só para teste — zera a marca de "já avisei". */
export function resetStorageWarning(): void {
  avisado = false;
}
