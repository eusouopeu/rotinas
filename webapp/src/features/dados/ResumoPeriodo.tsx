import type { HistoryEntry } from "../../lib/history";
import { computeStreak, computeStreakFor, type ResumoPeriodo as Dados } from "../../lib/stats";
import type { Routine } from "../../lib/types";
import { ResumoGrade } from "./Resumo";

/** 1,8h · 45m — mesmo formato das barras de tempo por mês. */
export function fmtHorasMin(min: number): string {
  return min >= 60 ? (min / 60).toFixed(1).replace(".", ",") + "h" : min + "m";
}

const pctDelta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);

/** Quatro números do período (horas, execuções, cumprimento, sequência) e a
 *  variação contra o período anterior. */
export function ResumoPeriodo({
  atual,
  anterior,
  rotuloAnterior,
  routines,
  history,
  filtro,
}: {
  atual: Dados;
  anterior: Dados;
  rotuloAnterior: string;
  routines: Routine[];
  history: HistoryEntry[];
  filtro: string | null;
}) {
  const streak = filtro ? computeStreakFor(filtro, routines, history) : computeStreak(routines, history);
  const tiles = [
    { l: "horas", v: fmtHorasMin(atual.minutos), d: pctDelta(atual.minutos, anterior.minutos), u: "%" },
    { l: "execuções", v: String(atual.execucoes), d: pctDelta(atual.execucoes, anterior.execucoes), u: "%" },
    {
      l: "cumprimento",
      v: atual.cumprimento == null ? "–" : atual.cumprimento + "%",
      d: atual.cumprimento != null && anterior.cumprimento != null ? atual.cumprimento - anterior.cumprimento : null,
      u: " pp",
    },
    { l: "sequência", v: String(streak), d: null, u: "" },
  ];
  return (
    <ResumoGrade
      rodape={`variação vs ${rotuloAnterior}`}
      tiles={tiles.map((t) => ({
        l: t.l,
        v: t.v,
        d:
          t.d == null
            ? t.l === "sequência"
              ? "dias"
              : " "
            : `${t.d > 0 ? "▲" : t.d < 0 ? "▼" : "="} ${Math.abs(t.d)}${t.u}`,
        tom: t.d == null ? undefined : t.d > 0 ? "up" : t.d < 0 ? "down" : undefined,
      }))}
    />
  );
}
