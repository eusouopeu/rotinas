// Cartões de análise que acompanham os períodos de 30 dias (visão mensal) e de
// 12 meses (visão anual): insights, metas da semana, dias da semana, horário,
// cumprimento, evolução, sequências, etapas que estouram, pontualidade,
// tendência e execuções recentes. Cada um é um CartaoSecao; os secundários
// abrem e fecham pelo título.
import { GraficoLinhaPct } from "../../components/GraficoLinhaPct";
import type { HistoryEntry } from "../../lib/history";
import { fmtTime } from "../../lib/format";
import { getPeriodExtrasData } from "../../lib/stats";
import type { GamificacaoState, Routine, Snooze } from "../../lib/types";
import { CelNegrito, CelNota, CelRotulo, LinhaTabela, statusDaClasse } from "../../ui/LinhaTabela";
import { LinhaBarra } from "../../ui/LinhaBarra";
import { BarrasDiaSemana, BarrasHora, BarrasTendencia } from "./Graficos";
import { CartaoSecao } from "./CartaoSecao";
import { Faixas } from "./Faixas";
import { LinhasTexto } from "./LinhasTexto";
import { KpiGrade } from "./Resumo";
import type { EstadoDados } from "./estado";

type Props = {
  periodo: "30d" | "ano";
  history: HistoryEntry[];
  routines: Routine[];
  snoozes: Snooze[];
  gam: GamificacaoState;
  weekStart: number;
  estado: EstadoDados;
  irRotina: (id: string) => void;
};

export function ExtrasPeriodo({
  periodo: period,
  history,
  routines,
  snoozes,
  gam,
  weekStart,
  estado,
  irRotina,
}: Props) {
  const filtro = estado.statsRoutineFilter;
  const extras = getPeriodExtrasData(period, history, routines, snoozes, gam, filtro, weekStart);
  const periodo = period === "30d" ? "últimos 30 dias" : "últimos 12 meses";
  const evolucaoValida = extras.evolucao.filter((p) => p.pct != null).length >= 2;
  const secao = (id: string) => ({ aberto: estado.aberta(id), onAlternar: () => estado.alternar(id) });

  return (
    <>
      {/* 1. Insights */}
      {extras.insights.length > 0 && (
        <CartaoSecao titulo="Insights" desc={`Padrões encontrados no seu histórico dos ${periodo}.`}>
          <LinhasTexto textos={extras.insights} icone="exclamationTriangle" />
        </CartaoSecao>
      )}

      {/* 2. Metas da semana */}
      {extras.goals.length > 0 && (
        <CartaoSecao
          titulo={<>Metas da semana ({extras.janelaSemana})</>}
          desc="Execuções na semana contra a meta. A marca vertical é o esperado até hoje."
          {...secao("metas")}
        >
          <Faixas
            itens={extras.goals}
            ehBom={(g) => g.onPace}
            rotulos={["no ritmo", "atrás do ritmo"]}
            linha={(g) => (
              <LinhaBarra
                key={g.routineId}
                naGrade
                toque
                trilho="faixa"
                marcador="esperado"
                posMarcador={g.expPct}
                rotulo={`${g.icon ? g.icon + " " : ""}${g.routineName}`}
                pct={Math.max(3, g.pct)}
                cor={g.color}
                corValor={g.onPace ? "var(--ok)" : "var(--erro)"}
                valor={`${g.doneCount}/${g.weeklyGoalTimes}x`}
                onClick={() => irRotina(g.routineId)}
              />
            )}
          />
        </CartaoSecao>
      )}

      {/* 3. Distribuição por dia da semana */}
      {extras.hasDowTotals && (
        <CartaoSecao
          titulo="Por dia da semana"
          desc={`Tempo executado em cada dia da semana, empilhado por rotina, nos ${periodo}.`}
          {...secao("dow")}
        >
          <BarrasDiaSemana colunas={extras.dowCols} />
        </CartaoSecao>
      )}

      {/* 4. Horário real de início */}
      {extras.hasHourCounts && (
        <CartaoSecao
          titulo="Horário real de início"
          desc={`Quantas execuções começaram em cada hora do dia, nos ${periodo}.`}
          {...secao("hora")}
        >
          <BarrasHora colunas={extras.hourCols} />
        </CartaoSecao>
      )}

      {/* 5. Cumprimento do agendado */}
      {extras.schedCompliance.length > 0 && (
        <CartaoSecao
          titulo="Cumprimento do agendado"
          desc={`Dias agendados em que a rotina foi feita, nos ${periodo}. Linha tracejada = 80%.`}
        >
          <Faixas
            itens={extras.schedCompliance}
            ehBom={(s) => s.pct >= 80}
            rotulos={["80% ou mais", "abaixo de 80%"]}
            linha={(s) => (
              <LinhaBarra
                key={s.routineId}
                naGrade
                toque
                trilho="faixa"
                marcador="meta"
                posMarcador={80}
                rotulo={`${s.icon ? s.icon + " " : ""}${s.routineName}`}
                pct={Math.max(3, s.pct)}
                cor={s.pct >= 80 ? "var(--ok)" : s.pct >= 50 ? "var(--caneta)" : "var(--erro)"}
                valor={`${s.pct}% · ${s.doneDays}/${s.plannedDays}`}
                onClick={() => irRotina(s.routineId)}
              />
            )}
          />
        </CartaoSecao>
      )}

      {/* 6. Evolução do cumprimento */}
      {evolucaoValida && (
        <CartaoSecao
          titulo="Evolução do cumprimento"
          desc={
            period === "30d"
              ? "% das agendadas feitas em cada uma das últimas 12 semanas. Linha tracejada = 80%."
              : "% das agendadas feitas em cada um dos últimos 12 meses. Linha tracejada = 80%."
          }
        >
          <GraficoLinhaPct pontos={extras.evolucao} meta={80} ariaLabel="Evolução do cumprimento do agendado" />
        </CartaoSecao>
      )}

      {/* 7. Sequências por rotina */}
      {extras.streaks.length > 0 && (
        <CartaoSecao
          titulo="Sequências por rotina"
          desc="Sequência atual de cada rotina, da maior para a menor."
          {...secao("seq")}
        >
          {extras.streaks.map((x) => (
            <LinhaTabela key={x.routineId} toque onClick={() => irRotina(x.routineId)}>
              <CelRotulo>
                {x.icon ? x.icon + " " : ""}
                {x.routineName}
              </CelRotulo>
              <CelNegrito status="pontual">
                {x.streak}{" "}
                {x.streakUnidade === "semanas" ? `semana${x.streak > 1 ? "s" : ""}` : `dia${x.streak > 1 ? "s" : ""}`}
              </CelNegrito>
            </LinhaTabela>
          ))}
        </CartaoSecao>
      )}

      {/* 8. Etapas que mais estouram */}
      {extras.stepBottlenecks.length > 0 && (
        <CartaoSecao
          titulo="Etapas que mais estouram"
          desc="Diferença média entre o tempo real e o planejado de cada etapa (2+ execuções). Positivo = demora mais. Toque para ver a rotina."
          {...secao("etapas")}
        >
          {extras.stepKpi && (
            <KpiGrade
              tiles={[
                {
                  v: `${extras.stepKpi.estouram}/${extras.stepKpi.analisadas}`,
                  l: "etapas estouram",
                  tom: extras.stepKpi.estouram > 0 ? "ruim" : "bom",
                },
                {
                  v: extras.stepKpi.estouroMedioStr,
                  l: "estouro médio",
                  tom: extras.stepKpi.estouram > 0 ? "ruim" : undefined,
                },
                {
                  v: extras.stepKpi.piorStr,
                  l: extras.stepKpi.piorNome,
                  tom: extras.stepKpi.estouram > 0 ? "destaque" : undefined,
                },
              ]}
            />
          )}
          {extras.stepBottlenecks.map((s, i) => (
            <LinhaTabela key={i} toque onClick={() => irRotina(s.routineId)}>
              <CelRotulo>
                {s.routineName} — {s.stepName}
              </CelRotulo>
              <CelNegrito status={statusDaClasse(s.statusClass)}>{s.medDevStr}</CelNegrito>
              <CelNota>
                {fmtTime(s.plan).replace("+", "")}&rarr;{fmtTime(s.medAct).replace("+", "")} &middot; {s.n}x
              </CelNota>
            </LinhaTabela>
          ))}
        </CartaoSecao>
      )}

      {/* 9. Pontualidade média */}
      {extras.punctuality.length > 0 && (
        <CartaoSecao
          titulo="Pontualidade"
          desc="Atraso médio entre o horário agendado e o início real. No horário = até 5 min de atraso."
          {...secao("pont")}
        >
          {extras.punctualityKpi && (
            <KpiGrade
              tiles={[
                {
                  v: extras.punctualityKpi.pctNoHorario + "%",
                  l: "no horário",
                  tom:
                    extras.punctualityKpi.pctNoHorario >= 80
                      ? "bom"
                      : extras.punctualityKpi.pctNoHorario < 50
                        ? "ruim"
                        : "destaque",
                },
                {
                  v: String(extras.punctualityKpi.atrasosGrandes),
                  l: "atrasos > 15 min",
                  tom: extras.punctualityKpi.atrasosGrandes > 0 ? "ruim" : "bom",
                },
                {
                  v: extras.punctualityKpi.mediaLabel,
                  l: "atraso médio",
                  tom: extras.punctualityKpi.mediaAtraso > 5 ? "ruim" : "bom",
                },
              ]}
            />
          )}
          {extras.punctuality.map((p, i) => (
            <LinhaTabela key={i}>
              <CelRotulo>{p.routineName}</CelRotulo>
              <CelNegrito status={statusDaClasse(p.statusClass)}>{p.label}</CelNegrito>
              <CelNota>{p.count}x</CelNota>
            </LinhaTabela>
          ))}
        </CartaoSecao>
      )}

      {/* 10. Tendência da pontualidade (8 semanas) */}
      {extras.hasDelayTrend && (
        <CartaoSecao
          titulo="Tendência da pontualidade"
          desc="Atraso médio no início, em minutos, em cada uma das últimas 8 semanas."
          {...secao("tend")}
        >
          <BarrasTendencia pontos={extras.delayTrend} />
        </CartaoSecao>
      )}

      {/* 11. Execuções recentes */}
      {extras.recent.length > 0 && (
        <CartaoSecao
          titulo="Execuções recentes"
          desc="Últimas execuções: data, hora e duração planejada → real."
          {...secao("recentes")}
        >
          {extras.recent.map((h) => (
            <LinhaTabela key={h.ts} coluna>
              <span className="leading-[1.3]">{h.routineName}</span>
              <span className="font-sans text-sm text-sub">
                {h.dateStr} &middot; {h.timeStr} | <b>{h.plannedStr}</b> &rarr;{" "}
                <b
                  className={
                    h.statusClass === "late"
                      ? "text-erro"
                      : h.statusClass === "early"
                        ? "text-ok"
                        : h.statusClass === "ontime"
                          ? "text-caneta"
                          : undefined
                  }
                >
                  {h.actualStr}
                </b>
              </span>
            </LinhaTabela>
          ))}
        </CartaoSecao>
      )}
    </>
  );
}
