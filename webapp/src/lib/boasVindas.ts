// Primeira abertura guiada (recomendação 12 de 30/09/2026): num app vazio,
// escolher as áreas da roda e uma ou duas rotinas prontas. A marca de "já
// passou" (K_BOASVINDAS) é preferência deste aparelho, fora do backup/sync —
// em outro aparelho os dados sincronizados já impedem o aviso.
import { CORES_AREA_600 as C, K_BOASVINDAS } from "./constants";
import type { HistoryEntry } from "./history";
import { load, save } from "./storage";
import type { GamificacaoState, Note, Routine } from "./types";

export const AREAS_SUGERIDAS: Array<{ label: string; color: string }> = [
  { label: "Saúde", color: C.green },
  { label: "Estudos", color: C.blue },
  { label: "Trabalho", color: C.amber },
  { label: "Relações", color: C.pink },
  { label: "Finanças", color: C.teal },
  { label: "Lazer", color: C.violet },
];

export function deveMostrarBoasVindas(p: {
  routines: Routine[];
  notes: Note[];
  history: HistoryEntry[];
  gam: GamificacaoState;
  visto?: boolean;
}): boolean {
  const visto = p.visto ?? !!load<number>(K_BOASVINDAS, 0);
  return (
    !visto && !p.routines.length && !p.notes.length && !p.history.length && !p.gam.config.roda.areas.length
  );
}

export function marcarBoasVindasVistas(): void {
  save(K_BOASVINDAS, Date.now());
}
