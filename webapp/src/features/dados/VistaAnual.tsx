import type { HistoryEntry } from "../../lib/history";
import { getAreasAno, getHeatmapData, getResumoPeriodo, getYearMonthlyBars } from "../../lib/stats";
import { Icon } from "../../components/Icon";
import type { GamificacaoState, Routine, Snooze } from "../../lib/types";
import { Cartao } from "../../ui/Cartao";
import { Fato, Fatos } from "../../ui/Fatos";
import { GradeBarras, LinhaBarra } from "../../ui/LinhaBarra";
import { Legenda } from "../../ui/Legenda";
import { BarrasMes } from "./Graficos";
import { CartaoSecao } from "./CartaoSecao";
import { MapaCalorAno } from "./Calendarios";
import { DetalheDia } from "./DetalheDia";
import { ExtrasPeriodo } from "./ExtrasPeriodo";
import { NavPeriodo } from "./NavPeriodo";
import { NO_PAINEL } from "./colunas";
import { fmtHorasMin, ResumoPeriodo } from "./ResumoPeriodo";
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

export function VistaAnual({ history, routines, snoozes, gam, weekStart, estado, irRotina }: Props) {
  const { calYear, setCalYear, calQuad, setCalQuad, selectedDay, setSelectedDay, statsRoutineFilter: filtro } = estado;
  const heatmapData = getHeatmapData(calYear, history, weekStart, filtro, calQuad);
  const monthlyBars = getYearMonthlyBars(calYear, history, filtro);
  const resumo = getResumoPeriodo(new Date(calYear, 0, 1, 12), new Date(calYear, 11, 31, 12), history, routines, snoozes, filtro);
  const resumoAnt = getResumoPeriodo(new Date(calYear - 1, 0, 1, 12), new Date(calYear - 1, 11, 31, 12), history, routines, snoozes, filtro);
  const hoje = new Date();
  const anoAtual = calYear === hoje.getFullYear();
  const maxMin = Math.max(...monthlyBars.bars.map((b) => b.minutes), 1);
  const mediaMin = monthlyBars.totalMinutes / (anoAtual ? hoje.getMonth() + 1 : 12);
  const areas = getAreasAno(calYear, history, routines, gam, filtro);
  const melhores = monthlyBars.bars
    .filter((b) => b.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3);

  function mudarQuad(delta: number) {
    let q = calQuad + delta;
    let ano = calYear;
    if (q < 1) {
      q = 3;
      ano--;
    }
    if (q > 3) {
      q = 1;
      ano++;
    }
    setCalQuad(q as 1 | 2 | 3);
    setCalYear(ano);
    setSelectedDay(null);
  }

  function mudarAno(delta: number) {
    setCalYear(calYear + delta);
    setSelectedDay(null);
  }

  return (
    <>
      <NavPeriodo rotuloAnterior="Ano anterior" rotuloProximo="Próximo ano" onAnterior={() => mudarAno(-1)} onProximo={() => mudarAno(1)}>
        {calYear}
      </NavPeriodo>

      <ResumoPeriodo atual={resumo} anterior={resumoAnt} rotuloAnterior={String(calYear - 1)} routines={routines} history={history} filtro={filtro} />

      <MapaCalorAno
        rotulo={`${String(calYear).slice(2)}T${calQuad}`}
        colunas={heatmapData.columns}
        selecionado={selectedDay}
        onSelecionar={setSelectedDay}
        onQuad={mudarQuad}
      />

      {selectedDay && <DetalheDia dia={selectedDay} history={history} routines={routines} snoozes={snoozes} />}

      {/* Tempo por mês */}
      {monthlyBars.totalMinutes > 0 ? (
        <>
          <CartaoSecao
            titulo={<>Tempo por mês &middot; total {monthlyBars.totalHoursStr}</>}
            desc="Horas executadas em cada mês. Linha tracejada = média mensal; o mês atual fica destacado."
          >
            <BarrasMes barras={monthlyBars.bars} maxMin={maxMin} mediaMin={mediaMin} mesAtual={anoAtual ? hoje.getMonth() : null} />
            <Legenda className="mt-3">
              - - média {fmtHorasMin(Math.round(mediaMin))}/mês
              {anoAtual && ` · ${monthlyBars.bars[hoje.getMonth()].monthName}: ${monthlyBars.bars[hoje.getMonth()].valStr}`}
            </Legenda>
          </CartaoSecao>

          {areas.length > 0 && (
            <CartaoSecao
              titulo={<>Por área &middot; {calYear}</>}
              desc="Tempo executado no ano em cada área da roda da vida, pela área atual de cada rotina."
            >
              <GradeBarras>
                {areas.map((a) => (
                  <LinhaBarra
                    key={a.id || "sem-area"}
                    naGrade
                    rotulo={a.label}
                    corRotulo={a.color}
                    cor={a.color}
                    pct={Math.max(3, a.pct)}
                    valor={`${fmtHorasMin(a.minutos)} · ${a.pct}%`}
                  />
                ))}
              </GradeBarras>
              {melhores.length > 0 && (
                <Fatos className="mt-3">
                  <Fato>
                    <Icon name="trophy" size={13} /> melhores meses
                  </Fato>
                  {melhores.map((b) => (
                    <Fato key={b.monthIdx}>
                      <b>{b.monthName}</b> {b.valStr}
                    </Fato>
                  ))}
                </Fatos>
              )}
            </CartaoSecao>
          )}
        </>
      ) : (
        <Cartao className={cn("mb-1.5", NO_PAINEL)}>
          <Legenda>Sem execuções em {calYear}.</Legenda>
        </Cartao>
      )}

      <ExtrasPeriodo periodo="ano" history={history} routines={routines} snoozes={snoozes} gam={gam} weekStart={weekStart} estado={estado} irRotina={irRotina} />
      <div className={cn("h-5", NO_PAINEL)} />
    </>
  );
}
