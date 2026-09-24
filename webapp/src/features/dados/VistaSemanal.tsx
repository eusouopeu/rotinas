import type { HistoryEntry } from "../../lib/history";
import { getWeekGridData } from "../../lib/stats";
import { ordemDiasSemana } from "../../lib/gamificacao";
import type { GamificacaoState, Routine, Snooze } from "../../lib/types";
import { DetalheDia } from "./DetalheDia";
import { CalendarioSemana } from "./Calendarios";
import { NO_PAINEL } from "./colunas";
import { NavPeriodo } from "./NavPeriodo";
import type { EstadoDados } from "./estado";
import { cn } from "../../lib/cn";

export const ROTULO_DOW = ["D", "S", "T", "Q", "Q", "S", "S"];
const fmtDM = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

type Props = {
  history: HistoryEntry[];
  routines: Routine[];
  snoozes: Snooze[];
  gam: GamificacaoState;
  weekStart: number;
  estado: EstadoDados;
};

export function VistaSemanal({ history, routines, snoozes, gam, weekStart, estado }: Props) {
  const { calWeek, setCalWeek, selectedDay, setSelectedDay } = estado;
  const gridData = getWeekGridData(calWeek, history, routines, snoozes, gam, weekStart);
  const inicio = gridData.days[0].dateObj;
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);

  // último dia da semana em cima, primeiro embaixo (pedido de 12/09/2026)
  const diasMostrar = selectedDay
    ? [selectedDay]
    : gridData.days
        .filter((d) => d.temAlgo)
        .map((d) => d.key)
        .reverse();

  function mover(delta: number) {
    const novo = new Date(calWeek);
    novo.setDate(novo.getDate() + delta);
    setCalWeek(novo);
    setSelectedDay(null);
  }

  return (
    <>
      <NavPeriodo
        rotuloAnterior="Semana anterior"
        rotuloProximo="Próxima semana"
        onAnterior={() => mover(-7)}
        onProximo={() => mover(7)}
      >
        {fmtDM(inicio)} &ndash; {fmtDM(fim)}
      </NavPeriodo>

      <CalendarioSemana
        ordemDias={ordemDiasSemana(weekStart).map((dow) => ROTULO_DOW[dow])}
        dias={gridData.days}
        selecionado={selectedDay}
        onSelecionar={setSelectedDay}
        rodape={
          <>
            &#9679; executada &nbsp; <span className="font-semibold">n</span> agendadas não feitas
            {gridData.rate !== null && (
              <>
                &nbsp;&middot;&nbsp; cumprimento da semana: {gridData.rate}% ({gridData.doneTotal}/
                {gridData.plannedTotal})
              </>
            )}
          </>
        }
      />

      {diasMostrar.map((k) => (
        <DetalheDia key={k} dia={k} history={history} routines={routines} snoozes={snoozes} soFeitos />
      ))}
      <div className={cn("h-5", NO_PAINEL)} />
    </>
  );
}
