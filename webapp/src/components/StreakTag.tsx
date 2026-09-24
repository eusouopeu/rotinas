// Selo de streak reutilizável (recomendações 2/3/7 de 08/09/2026) — mesmo
// `.streak-tag` do legado (index.html:3713, chama + número), só que também
// no React fora da tela de Estatísticas (Home, RoutineDetail), com recorde
// no tooltip e cor de marco (bronze/prata/ouro/diamante, mesmos tons dos
// badges do Boletim) quando o streak atual cruza um patamar.
import { Icon } from "./Icon";
import { cn } from "../lib/cn";
import { BADGE_COR } from "../lib/constants";
import { marcoStreak, streakInfoFor, type StreakInfo } from "../lib/stats";
import type { HistoryEntry } from "../lib/history";
import type { Routine } from "../lib/types";

function tituloStreak(info: StreakInfo): string {
  const unidadeSingular = info.unidade === "semanas" ? "semana" : "dia";
  const base = `${info.atual} ${unidadeSingular}${info.atual > 1 ? "s" : ""} seguido${info.atual > 1 ? "s" : ""}`;
  return info.recorde > info.atual ? `${base} · recorde: ${info.recorde}` : base;
}

/** `feitaHoje`: o selo inverte as cores (fundo cheio na cor da sequência,
 *  chama e número na cor do cartão) — o efeito de "preencher" do mockup de
 *  22/09/2026, que marca o dia já cumprido sem apagar o selo. */
export function StreakTag({
  routineId,
  routines,
  history,
  feitaHoje,
}: {
  routineId: string;
  routines: Routine[];
  history: HistoryEntry[];
  feitaHoje?: boolean;
}) {
  const info = streakInfoFor(routineId, routines, history);
  if (info.atual <= 0) return null;
  const marco = marcoStreak(info);
  const cor = marco ? BADGE_COR[marco] : undefined;
  // sem marco a cor vem do CSS (var(--streak)); com marco, do badge. No estado
  // preenchido a mesma cor vira fundo e o texto cai para a cor do cartão.
  const estilo = feitaHoje
    ? { background: cor || "var(--streak)", borderColor: cor || "var(--streak)", color: "var(--card)" }
    : cor
      ? { color: cor, borderColor: cor }
      : undefined;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center gap-[3px] rounded-pill border-[1.5px] border-streak py-0.5 pr-[7px] pl-[5px] align-middle font-sans text-xs leading-none font-semibold text-streak [&_.icon-svg]:[stroke-width:2]",
        feitaHoje && "bg-streak text-card"
      )}
      title={tituloStreak(info)}
      style={estilo}
    >
      <Icon name="fire" size={12} />
      {info.atual}
    </span>
  );
}
