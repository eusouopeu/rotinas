import { useMemo } from "react";
import type { HistoryEntry } from "../../lib/history";
import { getMonthGridData, getResumoPeriodo, type MonthDayData } from "../../lib/stats";
import { inicioSemanaISO, ordemDiasSemana } from "../../lib/gamificacao";
import { ritmoInfo } from "../../lib/boletim";
import type { GamificacaoState, Routine, Snooze } from "../../lib/types";
import { CalendarioMes } from "./Calendarios";
import { DetalheDia } from "./DetalheDia";
import { ExtrasPeriodo } from "./ExtrasPeriodo";
import { NavPeriodo } from "./NavPeriodo";
import { NO_PAINEL } from "./colunas";
import { fmtHorasMin, ResumoPeriodo } from "./ResumoPeriodo";
import { ROTULO_DOW } from "./VistaSemanal";
import type { EstadoDados } from "./estado";
import { cn } from "../../lib/cn";

type Props = {
  history: HistoryEntry[];
  routines: Routine[];
  snoozes: Snooze[];
  gam: GamificacaoState;
  weekStart: number;
  estado: EstadoDados;
  irRotina: (id: string) => void;
};

export function VistaMensal({ history, routines, snoozes, gam, weekStart, estado, irRotina }: Props) {
  const { calMonth, setCalMonth, selectedDay, setSelectedDay, statsRoutineFilter: filtro } = estado;
  const gridData = getMonthGridData(calMonth, history, routines, snoozes, gam, weekStart, filtro);
  const y = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const resumo = getResumoPeriodo(new Date(y, mo, 1, 12), new Date(y, mo + 1, 0, 12), history, routines, snoozes, filtro);
  const resumoAnt = getResumoPeriodo(new Date(y, mo - 1, 1, 12), new Date(y, mo, 0, 12), history, routines, snoozes, filtro);
  const nomeAnterior = new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long" });

  // grade em semanas completas (vazios no começo e no fim) + coluna da nota
  const semanas = useMemo(() => {
    const celulas: Array<MonthDayData | null> = [...Array(gridData.voidCount).fill(null), ...gridData.days];
    while (celulas.length % 7) celulas.push(null);
    const out: Array<Array<MonthDayData | null>> = [];
    for (let i = 0; i < celulas.length; i += 7) out.push(celulas.slice(i, i + 7));
    return out;
  }, [gridData]);

  /** Nota do boletim da semana que começa em `iso` (semana atual = nota ao vivo). */
  function notaDaSemana(iso: string): number | null {
    if (gam.semanaAtual?.inicioISO === iso) return ritmoInfo(gam.semanaAtual, gam.config, new Date(), weekStart).nota;
    const s = gam.historico.semanas.find((x) => x.inicioISO === iso);
    return s && !s.dispensada ? s.nota : null;
  }

  function mover(delta: number) {
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <>
      <NavPeriodo rotuloAnterior="Mês anterior" rotuloProximo="Próximo mês" onAnterior={() => mover(-1)} onProximo={() => mover(1)}>
        {gridData.monthName} {gridData.year}
        {gridData.rate !== null && (
          <span
            className="ml-2 rounded-[10px] bg-caneta-soft px-2 py-0.5 align-middle font-sans text-sm font-semibold text-caneta"
            title={`cumprimento do mês: ${gridData.doneTotal}/${gridData.plannedTotal} agendadas`}
          >
            {gridData.rate}%
          </span>
        )}
      </NavPeriodo>

      <ResumoPeriodo atual={resumo} anterior={resumoAnt} rotuloAnterior={nomeAnterior} routines={routines} history={history} filtro={filtro} />

      <CalendarioMes
        ordemDias={ordemDiasSemana(weekStart).map((dow) => ROTULO_DOW[dow])}
        semanas={semanas}
        notaDaSemana={(primeiro) => notaDaSemana(inicioSemanaISO(primeiro.dateObj, weekStart))}
        selecionado={selectedDay}
        onSelecionar={setSelectedDay}
        horasMin={fmtHorasMin}
      />

      {selectedDay && <DetalheDia dia={selectedDay} history={history} routines={routines} snoozes={snoozes} />}
      <ExtrasPeriodo periodo="30d" history={history} routines={routines} snoozes={snoozes} gam={gam} weekStart={weekStart} estado={estado} irRotina={irRotina} />
      <div className={cn("h-5", NO_PAINEL)} />
    </>
  );
}
