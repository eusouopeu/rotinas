// Calendários de Dados: a semana (com pontos coloridos e faltas), o mês
// (mapa de calor + nota do boletim de cada semana) e o mapa do ano por
// quadrimestre.
import { Fragment, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import type { MonthDayData, HeatmapColumn } from "../../lib/stats";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Cartao } from "../../ui/Cartao";
import { fundoCalor, LegendaCalor } from "./Calor";
import { NO_PAINEL } from "./colunas";

const CARTAO_CAL = cn("mb-1.5", NO_PAINEL);
const ROTULO_DIA = "pb-0.5 text-center font-sans text-2xs text-sub";
const NUM = "font-sans text-xs text-sub";

export type DiaSemana = {
  key: string;
  isToday: boolean;
  dateObj: Date;
  dotsColors: string[];
  missedCount: number;
};

/** Grade da semana: sete dias com pontos por rotina executada e o número de faltas. */
export function CalendarioSemana({
  ordemDias,
  dias,
  selecionado,
  onSelecionar,
  rodape,
}: {
  ordemDias: string[];
  dias: DiaSemana[];
  selecionado: string | null;
  onSelecionar: (key: string | null) => void;
  rodape: ReactNode;
}) {
  return (
    <Cartao className={CARTAO_CAL}>
      <div className="grid grid-cols-7 gap-1">
        {ordemDias.map((l, i) => (
          <span key={`lbl-${i}`} className={ROTULO_DIA}>
            {l}
          </span>
        ))}
        {dias.map((d) => (
          <span
            key={d.key}
            onClick={() => onSelecionar(selecionado === d.key ? null : d.key)}
            className={cn(
              "relative flex aspect-[0.85] flex-col items-center gap-0.5 rounded-app-sm bg-card-2 pt-1",
              d.isToday && "outline-[1.5px] outline-caneta-soft",
              selecionado === d.key && "outline-2 outline-ink"
            )}
          >
            <span className={cn(NUM, d.isToday && "font-bold text-caneta")}>{d.dateObj.getDate()}</span>
            <span className="flex max-w-[90%] flex-wrap justify-center gap-0.5">
              {d.dotsColors.map((color, i) => (
                <span key={i} className="size-1.5 rounded-full" style={{ background: color }} />
              ))}
            </span>
            {d.missedCount > 0 && (
              <span className="absolute top-0.5 right-[3px] font-sans text-[9px] font-bold text-erro">
                {d.missedCount}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-3 font-sans text-sm text-sub">{rodape}</div>
    </Cartao>
  );
}

/** Mês em semanas completas (vazios no começo/fim) + coluna com a nota da semana. */
export function CalendarioMes({
  ordemDias,
  semanas,
  notaDaSemana,
  selecionado,
  onSelecionar,
  horasMin,
}: {
  ordemDias: string[];
  semanas: Array<Array<MonthDayData | null>>;
  notaDaSemana: (primeiro: MonthDayData) => number | null;
  selecionado: string | null;
  onSelecionar: (key: string | null) => void;
  horasMin: (min: number) => string;
}) {
  return (
    <Cartao className={CARTAO_CAL}>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_32px] gap-1">
        {ordemDias.map((l, i) => (
          <span key={`lbl-${i}`} className={ROTULO_DIA}>
            {l}
          </span>
        ))}
        <span className={ROTULO_DIA} title="Nota do boletim da semana">
          nota
        </span>
        {semanas.map((sem, si) => {
          const primeiro = sem.find((d): d is MonthDayData => !!d);
          const nota = primeiro ? notaDaSemana(primeiro) : null;
          return (
            <Fragment key={`sem-${si}`}>
              {sem.map((d, i) =>
                d ? (
                  <span
                    key={d.key}
                    title={d.min ? `${d.day}: ${horasMin(d.min)}` : undefined}
                    onClick={() => onSelecionar(selecionado === d.key ? null : d.key)}
                    className={cn(
                      "relative flex h-[30px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-app-sm p-0",
                      fundoCalor(d.intensity),
                      d.isToday && "outline-[1.5px] outline-caneta-soft",
                      selecionado === d.key && "outline-2 outline-ink"
                    )}
                  >
                    <span
                      className={cn(
                        NUM,
                        d.isToday && "font-bold text-caneta",
                        /lv[34]/.test(d.intensity) && "text-card"
                      )}
                    >
                      {d.day}
                    </span>
                  </span>
                ) : (
                  <span
                    key={`void-${si}-${i}`}
                    className="relative flex h-[30px] cursor-default flex-col items-center justify-center gap-0.5 rounded-app-sm bg-transparent p-0"
                  />
                )
              )}
              <span
                className="flex h-[30px] items-center justify-center gap-0.5"
                title={nota == null ? "sem nota" : `nota da semana: ${nota.toFixed(1)}`}
              >
                {nota != null && (
                  <>
                    <span className="flex h-[22px] w-[3px] items-end overflow-hidden rounded-[2px] bg-card-2">
                      <span className="w-full bg-caneta" style={{ height: `${Math.max(4, Math.min(100, nota))}%` }} />
                    </span>
                    <span className="font-sans text-[9px] text-sub tabular-nums">{Math.round(nota)}</span>
                  </>
                )}
              </span>
            </Fragment>
          );
        })}
      </div>
      <LegendaCalor fim="mais tempo" />
    </Cartao>
  );
}

/** Mapa de calor do ano, um quadrimestre por vez, com paginação ‹ 26T3 ›. */
export function MapaCalorAno({
  rotulo,
  colunas,
  selecionado,
  onSelecionar,
  onQuad,
}: {
  rotulo: string;
  colunas: HeatmapColumn[];
  selecionado: string | null;
  onSelecionar: (key: string | null) => void;
  onQuad: (delta: number) => void;
}) {
  return (
    <Cartao className={CARTAO_CAL} id="yearHm">
      <div className="-mt-1 mb-1.5 flex items-center justify-between">
        <BotaoIcone rotulo="Quadrimestre anterior" semBorda onClick={() => onQuad(-1)}>
          <Icon name="chevronLeft" size={15} />
        </BotaoIcone>
        <span className="font-sans text-md font-semibold text-ink">{rotulo}</span>
        <BotaoIcone rotulo="Próximo quadrimestre" semBorda onClick={() => onQuad(1)}>
          <Icon name="chevronRight" size={15} />
        </BotaoIcone>
      </div>
      <div>
        <div className="mb-1 grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-[3px]">
          {colunas.map((col, i) => (
            <span key={i} className="overflow-visible font-sans text-[9px] whitespace-nowrap text-sub">
              {col.monthLabel}
            </span>
          ))}
        </div>
        <div className="grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-[3px]">
          {colunas.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.cells.map((cell) => (
                <span
                  key={cell.key + "-" + cell.inRange}
                  className={cn(
                    "aspect-square shrink-0 rounded-[3px]",
                    fundoCalor(cell.intensity),
                    selecionado === cell.key && "outline-2 outline-offset-1 outline-ink"
                  )}
                  title={cell.inRange ? `${cell.key}: ${cell.min}min` : undefined}
                  onClick={() => {
                    if (cell.inRange) onSelecionar(selecionado === cell.key ? null : cell.key);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <LegendaCalor fim="mais" />
    </Cartao>
  );
}
