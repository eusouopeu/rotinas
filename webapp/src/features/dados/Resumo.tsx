// Faixa de números-resumo de um período (horas, execuções, cumprimento,
// sequência) com variação contra o período anterior, e a versão de KPIs
// coloridos em três colunas dos cartões de análise.
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { NO_PAINEL } from "./colunas";

const PEQUENO = "font-sans text-2xs text-sub";

export type TileResumo = { l: string; v: string; d: string; tom?: "up" | "down" };

export function ResumoGrade({ tiles, rodape }: { tiles: TileResumo[]; rodape: ReactNode }) {
  return (
    <div className={cn("mb-3 grid grid-cols-4 gap-1.5", NO_PAINEL)}>
      {tiles.map((t) => (
        <div key={t.l} className="min-w-0 rounded-app-sm border-[1.5px] border-line bg-card px-1 py-2 text-center">
          <div className="font-titulo text-2xl font-bold whitespace-nowrap text-ink">{t.v}</div>
          <div className={PEQUENO}>{t.l}</div>
          <div className={cn(PEQUENO, "mt-0.5 whitespace-nowrap", t.tom === "up" && "text-ok", t.tom === "down" && "text-erro")}>
            {t.d}
          </div>
        </div>
      ))}
      <div className={cn(PEQUENO, "col-span-full text-right")}>{rodape}</div>
    </div>
  );
}

export type KpiTom = "bom" | "ruim" | "destaque";
const COR_KPI: Record<KpiTom, string> = { bom: "text-ok", ruim: "text-erro", destaque: "text-caneta" };

export function KpiGrade({ tiles }: { tiles: Array<{ v: string; l: string; tom?: KpiTom }> }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={t.l} className="min-w-0 rounded-app-sm border-[1.5px] border-line bg-card px-1 py-2.5 text-center">
          <div className={cn("font-titulo text-4xl font-bold whitespace-nowrap text-ink", t.tom && COR_KPI[t.tom])}>{t.v}</div>
          <div className={cn(PEQUENO, "mt-0.5 overflow-hidden leading-[1.3] tracking-[0.03em] text-ellipsis uppercase")}>{t.l}</div>
        </div>
      ))}
    </div>
  );
}
