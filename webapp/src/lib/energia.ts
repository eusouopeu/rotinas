// Energia do dia (recomendação 11 de 30/09/2026): um toque de 1 a 5 por dia,
// guardado no mapa do diário sob a chave "energia:AAAA-MM-DD" (valor "1".."5").
// Assim entra no backup e no sync que o diário já tem, sem coleção nova; as
// telas do diário só leem chaves "dia:"/"semana:"/"mes:"/"ano:".
import type { DiarioMap } from "./types";

export const chaveEnergia = (iso: string) => "energia:" + iso;

export function energiaDoDia(diario: DiarioMap, iso: string): number | null {
  const n = parseInt(diario[chaveEnergia(iso)] || "", 10);
  return n >= 1 && n <= 5 ? n : null;
}

export interface FaixaEnergia {
  rotulo: string;
  dias: number;
  /** % de rotinas agendadas que foram feitas nesses dias (null sem agenda) */
  taxa: number | null;
}

/** Cruza energia × cumprimento: dias com energia 1–2, 3 e 4–5. */
export function energiaXCumprimento(
  diario: DiarioMap,
  dias: Array<{ key: string; feitas: number; faltas: number }>
): FaixaEnergia[] {
  const faixas = [
    { rotulo: "baixa (1–2)", de: 1, ate: 2 },
    { rotulo: "média (3)", de: 3, ate: 3 },
    { rotulo: "alta (4–5)", de: 4, ate: 5 },
  ];
  return faixas.map((f) => {
    let n = 0;
    let feitas = 0;
    let total = 0;
    dias.forEach((d) => {
      const e = energiaDoDia(diario, d.key);
      if (e == null || e < f.de || e > f.ate) return;
      n++;
      feitas += d.feitas;
      total += d.feitas + d.faltas;
    });
    return { rotulo: f.rotulo, dias: n, taxa: total ? Math.round((feitas / total) * 100) : null };
  });
}
