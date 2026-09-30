// Selo de streak reutilizável (recomendações 2/3/7 de 08/09/2026) — mesmo
// `.streak-tag` do legado (index.html:3713, chama + número), só que também
// no React fora da tela de Estatísticas (Home, RoutineDetail), com recorde
// no tooltip e cor de marco (bronze/prata/ouro/diamante, mesmos tons dos
// badges do Boletim) quando o streak atual cruza um patamar.
import { useMemo } from "react";
import { Icon } from "./Icon";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/cn";
import { BADGE_COR } from "../lib/constants";
import { marcoStreak, streakInfoFor, type StreakInfo } from "../lib/stats";
import type { HistoryEntry } from "../lib/history";
import type { Routine } from "../lib/types";

function tituloStreak(info: StreakInfo): string {
  const unidadeSingular = info.unidade === "semanas" ? "semana" : "dia";
  const base = `${info.atual} ${unidadeSingular}${info.atual > 1 ? "s" : ""} seguido${info.atual > 1 ? "s" : ""}`;
  const comExec =
    info.execucoes != null ? `${base} · ${info.execucoes} execuç${info.execucoes === 1 ? "ão" : "ões"}` : base;
  return info.recorde > info.atual ? `${comExec} · recorde: ${info.recorde}` : comExec;
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
  const snoozes = useAppStore((s) => s.snoozes);
  // memo (27/09/2026): a conta percorre anos de dias e rodava em todo card a
  // cada redesenho da Home; só refaz quando algo que entra nela muda
  const info = useMemo(
    () => streakInfoFor(routineId, routines, history, snoozes),
    [routineId, routines, history, snoozes]
  );
  if (info.atual <= 0) return null;
  const marco = marcoStreak(info);
  const cor = marco ? BADGE_COR[marco] : undefined;
  // sem marco a cor vem do CSS (laranja sobre --streak-soft, mockup de
  // 30/09/2026: pílula clara sem borda); com marco, a cor do badge vira o texto
  // e um tom claro dela o fundo. Feita hoje: a cor vira fundo cheio.
  const estilo = feitaHoje
    ? { background: cor || "var(--streak)", color: "var(--card)" }
    : cor
      ? { color: cor, background: `color-mix(in srgb, ${cor} 20%, transparent)` }
      : undefined;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center gap-[3px] rounded-pill bg-streak-soft py-[3px] pr-2 pl-1.5 align-middle font-sans text-sm leading-none font-semibold text-streak [&_.icon-svg]:[stroke-width:2]",
        feitaHoje && "bg-streak text-card"
      )}
      title={tituloStreak(info)}
      style={estilo}
    >
      <Icon name="fire" size={13} />
      {info.atual}
      {info.execucoes != null && <span className="opacity-75">· {info.execucoes}×</span>}
    </span>
  );
}
