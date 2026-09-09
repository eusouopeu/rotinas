// Selo de streak reutilizável (recomendações 2/3/7 de 08/09/2026) — mesmo
// `.streak-tag` do legado (index.html:3713, chama + número), só que também
// no React fora da tela de Estatísticas (Home, RoutineDetail), com recorde
// no tooltip e cor de marco (bronze/prata/ouro/diamante, mesmos tons dos
// badges do Boletim) quando o streak atual cruza um patamar.
import { Icon } from "./Icon";
import { BADGE_COR } from "../lib/constants";
import { marcoStreak, streakInfoFor, type StreakInfo } from "../lib/stats";
import type { HistoryEntry } from "../lib/history";
import type { Routine } from "../lib/types";

function tituloStreak(info: StreakInfo): string {
  const unidadeSingular = info.unidade === "semanas" ? "semana" : "dia";
  const base = `${info.atual} ${unidadeSingular}${info.atual > 1 ? "s" : ""} seguido${info.atual > 1 ? "s" : ""}`;
  return info.recorde > info.atual ? `${base} · recorde: ${info.recorde}` : base;
}

export function StreakTag({ routineId, routines, history }: { routineId: string; routines: Routine[]; history: HistoryEntry[] }) {
  const info = streakInfoFor(routineId, routines, history);
  if (info.atual <= 0) return null;
  const marco = marcoStreak(info);
  const cor = marco ? BADGE_COR[marco] : undefined;
  return (
    <span className="streak-tag" title={tituloStreak(info)} style={cor ? { color: cor, borderColor: cor } : undefined}>
      <Icon name="fire" size={12} />
      {info.atual}
    </span>
  );
}
