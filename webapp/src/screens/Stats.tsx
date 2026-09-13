// Porta de renderStats/renderWeekView/renderMonthView/renderYearView/
// renderPeriodExtras/dayDetailHtml (index.html:5296-6028) — tela "Estatísticas"
// (aba "Dados" no legado): visão semanal, mensal e anual com filtro por rotina,
// heatmap anual, metas, gráficos, insights e relatório PDF.
import { Fragment, useState, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import {
  getDayDetailData,
  getWeekGridData,
  getMonthGridData,
  getHeatmapData,
  getYearMonthlyBars,
  getPeriodExtrasData,
  getResumoPeriodo,
  getAreasAno,
  computeStreak,
  computeStreakFor,
  type MonthDayData,
  type ResumoPeriodo,
} from "../lib/stats";
import { inicioSemanaISO, ordemDiasSemana } from "../lib/gamificacao";
import { ritmoInfo } from "../lib/boletim";
import { fmtClock, fmtTime } from "../lib/format";
import { relatorioFechamentoHtml } from "../lib/pdfExport";
import { exportPdfView } from "../lib/exportFile";
import type { CountdownDoc } from "../lib/types";
import { Tabbar } from "../components/Tabbar";
import { GraficoLinhaPct } from "../components/GraficoLinhaPct";

const DOWL = ["D", "S", "T", "Q", "Q", "S", "S"];

/** 1,8h · 45m — mesmo formato das barras de tempo por mês. */
function fmtHorasMin(min: number): string {
  return min >= 60 ? (min / 60).toFixed(1).replace(".", ",") + "h" : min + "m";
}

export function Stats() {
  const goTo = useAppStore((s) => s.goTo);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const templates = useAppStore((s) => s.templates);
  const weekStart = useAppStore((s) => s.weekStart);

  const [statsView, setStatsView] = useState<"semanal" | "mensal" | "anual">("semanal");
  const [statsRoutineFilter, setStatsRoutineFilter] = useState<string | null>(null);
  const [calWeek, setCalWeek] = useState<Date>(new Date());
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // quadrimestre do heatmap anual (1 = jan–abr, 2 = mai–ago, 3 = set–dez)
  const [calQuad, setCalQuad] = useState<1 | 2 | 3>(() => (Math.floor(new Date().getMonth() / 4) + 1) as 1 | 2 | 3);
  // seções secundárias de Mensal/Anual começam fechadas; Insights e Cumprimento ficam sempre abertos
  const [abertas, setAbertas] = useState<string[]>([]);

  const snoozes = useAppStore((s) => s.snoozes);

  const aberta = (id: string) => abertas.includes(id);

  /** Card de Dados com título e explicação dentro, no topo. Com `id`, o título
   *  vira o botão que abre/fecha (seções secundárias começam fechadas). */
  function card(titulo: ReactNode, desc: ReactNode, corpo: ReactNode, id?: string) {
    const aberto = !id || aberta(id);
    return (
      <div className="stat-card com-titulo">
        {id ? (
          <button
            className="stat-card-head secao-toggle"
            aria-expanded={aberto}
            onClick={() => setAbertas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
          >
            <span className="stat-card-title">{titulo}</span>
            <Icon name={aberto ? "chevronUp" : "chevronDown"} size={13} />
          </button>
        ) : (
          <div className="stat-card-title">{titulo}</div>
        )}
        {aberto && (
          <>
            {desc && <div className="stat-card-desc">{desc}</div>}
            <div className="stat-card-body">{corpo}</div>
          </>
        )}
      </div>
    );
  }

  function kpis(tiles: Array<{ v: string; l: string; tom?: "bom" | "ruim" | "destaque" }>) {
    return (
      <div className="resumo-grid kpi3">
        {tiles.map((t) => (
          <div className="resumo-tile" key={t.l}>
            <div className={"resumo-v" + (t.tom ? " " + t.tom : "")}>{t.v}</div>
            <div className="resumo-l">{t.l}</div>
          </div>
        ))}
      </div>
    );
  }

  /** Divide linhas em duas faixas coloridas (bom / abaixo); faixa vazia some. */
  function faixas<T>(itens: T[], ehBom: (x: T) => boolean, rotulos: [string, string], linha: (x: T) => ReactNode) {
    const grupos: Array<[string, string, T[]]> = [
      ["faixa-ok", rotulos[0], itens.filter(ehBom)],
      ["faixa-baixo", rotulos[1], itens.filter((x) => !ehBom(x))],
    ];
    return grupos
      .filter(([, , g]) => g.length > 0)
      .map(([cls, lbl, g]) => (
        <div className={`faixa ${cls}`} key={cls}>
          <div className="faixa-lbl">{lbl}</div>
          <div className="bar-grid">{g.map(linha)}</div>
        </div>
      ));
  }

  /** Nota do boletim da semana que começa em `iso` (semana atual = nota ao vivo). */
  function notaDaSemana(iso: string): number | null {
    if (gam.semanaAtual?.inicioISO === iso) return ritmoInfo(gam.semanaAtual, gam.config, new Date(), weekStart).nota;
    const s = gam.historico.semanas.find((x) => x.inicioISO === iso);
    return s && !s.dispensada ? s.nota : null;
  }

  function renderResumo(atual: ResumoPeriodo, anterior: ResumoPeriodo, rotuloAnterior: string) {
    const streak = statsRoutineFilter ? computeStreakFor(statsRoutineFilter, routines, history) : computeStreak(routines, history);
    const pctDelta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
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
      <div className="resumo-grid">
        {tiles.map((t) => (
          <div className="resumo-tile" key={t.l}>
            <div className="resumo-v">{t.v}</div>
            <div className="resumo-l">{t.l}</div>
            <div className={"resumo-d" + (t.d == null ? "" : t.d > 0 ? " up" : t.d < 0 ? " down" : "")}>
              {t.d == null
                ? t.l === "sequência"
                  ? "dias"
                  : " "
                : `${t.d > 0 ? "▲" : t.d < 0 ? "▼" : "="} ${Math.abs(t.d)}${t.u}`}
            </div>
          </div>
        ))}
        <div className="resumo-foot">variação vs {rotuloAnterior}</div>
      </div>
    );
  }

  /* `soFeitos` (aba Semana, pedido do Pedro em 12/09/2026): o dia só lista o
     que foi executado — o que estava agendado e não foi feito já aparece no
     contador da grade acima, e repetir isso aqui virava lista de cobrança. */
  function renderDayDetail(key: string, soFeitos = false) {
    const data = getDayDetailData(key, history, routines, snoozes);
    if (soFeitos && data.executed.length === 0) return null;
    return (
      <Fragment key={key}>
        <div className="section-label">
          {String(data.dateObj.getDate()).padStart(2, "0")}/{String(data.dateObj.getMonth() + 1).padStart(2, "0")}/{data.dateObj.getFullYear()}
        </div>
        <div className="stat-card">
          {data.isEmpty && !soFeitos ? (
            <div className="dev-row">
              <span className="dev-n">Nada executado nem agendado.</span>
            </div>
          ) : (
            <>
              {data.executed.map((h, i) => (
                <div className="dev-row" key={`exec-${i}`}>
                  <span>
                    <Icon name="check" size={14} /> {h.routineName}
                  </span>
                  <span className="dev-n">{h.actualSec != null ? fmtTime(h.actualSec).replace("+", "") : ""}</span>
                  <span className="dev-n">{h.ts ? fmtClock(new Date(h.ts)) : ""}</span>
                </div>
              ))}
              {!soFeitos &&
                data.planned.map((r, i) => (
                  <div className="dev-row" key={`plan-${i}`}>
                    <span>○ {r.routineName}</span>
                    <span className="dev-n">{r.startStr}</span>
                    {r.status === "não feita" ? <b className="late">não feita</b> : <span className="dev-n">agendada</span>}
                  </div>
                ))}
            </>
          )}
        </div>
      </Fragment>
    );
  }

  function renderWeekView() {
    const gridData = getWeekGridData(calWeek, history, routines, snoozes, gam, weekStart);
    const weekStartObj = gridData.days[0].dateObj;
    const weekEndObj = new Date(weekStartObj);
    weekEndObj.setDate(weekEndObj.getDate() + 6);
    const fmtDM = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    // último dia da semana em cima, primeiro embaixo (pedido de 12/09/2026)
    const diasMostrar = selectedDay
      ? [selectedDay]
      : gridData.days
          .filter((d) => d.temAlgo)
          .map((d) => d.key)
          .reverse();

    return (
      <>
        <div className="cal-nav">
          <button
            className="bell-btn"
            onClick={() => {
              const prev = new Date(calWeek);
              prev.setDate(prev.getDate() - 7);
              setCalWeek(prev);
              setSelectedDay(null);
            }}
          >
            &lsaquo;
          </button>
          <span className="cal-title">
            {fmtDM(weekStartObj)} &ndash; {fmtDM(weekEndObj)}
          </span>
          <button
            className="bell-btn"
            onClick={() => {
              const next = new Date(calWeek);
              next.setDate(next.getDate() + 7);
              setCalWeek(next);
              setSelectedDay(null);
            }}
          >
            &rsaquo;
          </button>
        </div>

        <div className="stat-card">
          <div className="mcal-grid">
            {ordemDiasSemana(weekStart).map((dow) => (
              <span key={`lbl-${dow}`} className="mcal-dowlbl">
                {DOWL[dow]}
              </span>
            ))}
            {gridData.days.map((d) => (
              <span
                key={d.key}
                className={`mcal-cell ${d.isToday ? "mcal-today" : ""} ${selectedDay === d.key ? "mcal-sel" : ""}`}
                onClick={() => setSelectedDay(selectedDay === d.key ? null : d.key)}
              >
                <span className="mcal-num">{d.dateObj.getDate()}</span>
                <span className="mcal-dots">
                  {d.dotsColors.map((color, i) => (
                    <span key={i} className="mcal-dot" style={{ background: color }} />
                  ))}
                </span>
                {d.missedCount > 0 && <span className="mcal-missed">{d.missedCount}</span>}
              </span>
            ))}
          </div>
          <div className="stat-foot">
            &#9679; executada &nbsp;{" "}
            <span className="late" style={{ fontWeight: 600 }}>
              n
            </span>{" "}
            agendadas não feitas
            {gridData.rate !== null && (
              <>
                &nbsp;&middot;&nbsp; cumprimento da semana: {gridData.rate}% ({gridData.doneTotal}/{gridData.plannedTotal})
              </>
            )}
          </div>
        </div>

        {diasMostrar.map((k) => renderDayDetail(k, true))}
        <div style={{ height: 20 }} />
      </>
    );
  }

  function renderPeriodExtras(period: "30d" | "ano") {
    const extras = getPeriodExtrasData(period, history, routines, snoozes, gam, statsRoutineFilter, weekStart);
    const periodo = period === "30d" ? "últimos 30 dias" : "últimos 12 meses";
    const evolucaoValida = extras.evolucao.filter((p) => p.pct != null).length >= 2;
    const irRotina = (id: string) => goTo({ tab: "dados", screen: "routineStats", id });

    return (
      <Fragment key={`extras-${period}-${statsRoutineFilter || "all"}`}>
        {/* 1. Insights */}
        {extras.insights.length > 0 &&
          card(
            "Insights",
            `Padrões encontrados no seu histórico dos ${periodo}.`,
            extras.insights.map((txt, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginTop: i ? 10 : 0,
                  paddingTop: i ? 10 : 0,
                  borderTop: i ? "1.5px solid var(--line)" : undefined,
                }}
              >
                <span style={{ flex: "0 0 auto", color: "var(--caneta)", marginTop: 1 }}>
                  <Icon name="exclamationTriangle" size={14} />
                </span>
                <span
                  className="routine-meta"
                  style={{ fontSize: 13.5, color: "var(--ink)" }}
                  dangerouslySetInnerHTML={{ __html: txt }}
                />
              </div>
            )),
          )}

        {/* 2. Metas da semana */}
        {extras.goals.length > 0 &&
          card(
            <>Metas da semana ({extras.janelaSemana})</>,
            "Execuções na semana contra a meta. A marca vertical é o esperado até hoje.",
            faixas(
              extras.goals,
              (g) => g.onPace,
              ["no ritmo", "atrás do ritmo"],
              (g) => (
                <div key={g.routineId} className="bar-row tappable" onClick={() => irRotina(g.routineId)}>
                  <div className="bar-name">
                    {g.icon ? g.icon + " " : ""}
                    {g.routineName}
                  </div>
                  <div className="bar-track goal-track">
                    <div className="bar-fill" style={{ width: `${Math.max(3, g.pct)}%`, background: g.color }} />
                    <span className="goal-marker" style={{ left: `${g.expPct}%` }} />
                  </div>
                  <div className="bar-val" style={{ color: g.onPace ? "var(--ok)" : "var(--erro)" }}>
                    {g.doneCount}/{g.weeklyGoalTimes}x
                  </div>
                </div>
              ),
            ),
            "metas",
          )}

        {/* 3. Distribuição por dia da semana */}
        {extras.hasDowTotals &&
          card(
            "Por dia da semana",
            `Tempo executado em cada dia da semana, empilhado por rotina, nos ${periodo}.`,
            <div className="stack-chart">
              {extras.dowCols.map((col) => (
                <div className="stack-col" key={col.dow}>
                  <span className="trend-val">{col.totalSec ? `${col.totalMin}m` : ""}</span>
                  <div className="stack-bars">
                    {col.segs.map((seg, si) => (
                      <div
                        key={si}
                        className="stack-seg"
                        style={{ height: `${seg.height}px`, background: seg.color }}
                        title={`${seg.routineName}: ${Math.round(seg.sec / 60)}min`}
                      />
                    ))}
                  </div>
                  <span className="trend-lbl">{col.dowLabel}</span>
                </div>
              ))}
            </div>,
            "dow",
          )}

        {/* 4. Horário real de início */}
        {extras.hasHourCounts &&
          card(
            "Horário real de início",
            `Quantas execuções começaram em cada hora do dia, nos ${periodo}.`,
            <div className="hour-chart">
              {extras.hourCols.map((c) => (
                <div className="hour-col" key={c.hour}>
                  <span className="trend-lbl">{c.showLabel ? `${c.hour}h` : ""}</span>
                  <div className="hour-bar-area">
                    <div className="hour-bar" style={{ height: `${c.height}px` }} />
                  </div>
                </div>
              ))}
            </div>,
            "hora",
          )}

        {/* 5. Cumprimento do agendado */}
        {extras.schedCompliance.length > 0 &&
          card(
            "Cumprimento do agendado",
            `Dias agendados em que a rotina foi feita, nos ${periodo}. Linha tracejada = 80%.`,
            faixas(
              extras.schedCompliance,
              (s) => s.pct >= 80,
              ["80% ou mais", "abaixo de 80%"],
              (s) => (
                <div key={s.routineId} className="bar-row tappable" onClick={() => irRotina(s.routineId)}>
                  <div className="bar-name">
                    {s.icon ? s.icon + " " : ""}
                    {s.routineName}
                  </div>
                  <div className="bar-track com-meta">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(3, s.pct)}%`,
                        background: s.pct >= 80 ? "var(--ok)" : s.pct >= 50 ? "var(--caneta)" : "var(--erro)",
                      }}
                    />
                    <span className="meta-tracejada" style={{ left: "80%" }} />
                  </div>
                  <div className="bar-val">
                    {s.pct}% &middot; {s.doneDays}/{s.plannedDays}
                  </div>
                </div>
              ),
            ),
          )}

        {/* 6. Evolução do cumprimento */}
        {evolucaoValida &&
          card(
            "Evolução do cumprimento",
            period === "30d"
              ? "% das agendadas feitas em cada uma das últimas 12 semanas. Linha tracejada = 80%."
              : "% das agendadas feitas em cada um dos últimos 12 meses. Linha tracejada = 80%.",
            <GraficoLinhaPct pontos={extras.evolucao} meta={80} ariaLabel="Evolução do cumprimento do agendado" />,
          )}

        {/* 7. Sequências por rotina */}
        {extras.streaks.length > 0 &&
          card(
            "Sequências por rotina",
            "Sequência atual de cada rotina, da maior para a menor.",
            extras.streaks.map((x) => (
              <div key={x.routineId} className="dev-row tappable" onClick={() => irRotina(x.routineId)}>
                <span>
                  {x.icon ? x.icon + " " : ""}
                  {x.routineName}
                </span>
                <b className="ontime">
                  {x.streak} {x.streakUnidade === "semanas" ? `semana${x.streak > 1 ? "s" : ""}` : `dia${x.streak > 1 ? "s" : ""}`}
                </b>
              </div>
            )),
            "seq",
          )}

        {/* 8. Etapas que mais estouram */}
        {extras.stepBottlenecks.length > 0 &&
          card(
            "Etapas que mais estouram",
            "Diferença média entre o tempo real e o planejado de cada etapa (2+ execuções). Positivo = demora mais. Toque para ver a rotina.",
            <>
              {extras.stepKpi &&
                kpis([
                  {
                    v: `${extras.stepKpi.estouram}/${extras.stepKpi.analisadas}`,
                    l: "etapas estouram",
                    tom: extras.stepKpi.estouram > 0 ? "ruim" : "bom",
                  },
                  { v: extras.stepKpi.estouroMedioStr, l: "estouro médio", tom: extras.stepKpi.estouram > 0 ? "ruim" : undefined },
                  { v: extras.stepKpi.piorStr, l: extras.stepKpi.piorNome, tom: extras.stepKpi.estouram > 0 ? "destaque" : undefined },
                ])}
              {extras.stepBottlenecks.map((s, i) => (
                <div key={i} className="dev-row tappable" onClick={() => irRotina(s.routineId)}>
                  <span>
                    {s.routineName} — {s.stepName}
                  </span>
                  <b className={s.statusClass}>{s.medDevStr}</b>
                  <span className="dev-n">
                    {fmtTime(s.plan).replace("+", "")}&rarr;{fmtTime(s.medAct).replace("+", "")} &middot; {s.n}x
                  </span>
                </div>
              ))}
            </>,
            "etapas",
          )}

        {/* 9. Pontualidade média */}
        {extras.punctuality.length > 0 &&
          card(
            "Pontualidade",
            "Atraso médio entre o horário agendado e o início real. No horário = até 5 min de atraso.",
            <>
              {extras.punctualityKpi &&
                kpis([
                  {
                    v: extras.punctualityKpi.pctNoHorario + "%",
                    l: "no horário",
                    tom: extras.punctualityKpi.pctNoHorario >= 80 ? "bom" : extras.punctualityKpi.pctNoHorario < 50 ? "ruim" : "destaque",
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
                ])}
              {extras.punctuality.map((p, i) => (
                <div className="dev-row" key={i}>
                  <span>{p.routineName}</span>
                  <b className={p.statusClass}>{p.label}</b>
                  <span className="dev-n">{p.count}x</span>
                </div>
              ))}
            </>,
            "pont",
          )}

        {/* 10. Tendência da pontualidade (8 semanas) */}
        {extras.hasDelayTrend &&
          card(
            "Tendência da pontualidade",
            "Atraso médio no início, em minutos, em cada uma das últimas 8 semanas.",
            <div className="trend-chart">
              {extras.delayTrend.map((t, i) => (
                <div className="trend-col" key={i}>
                  <div className="trend-bar-area">
                    {t.val !== null && (
                      <>
                        <span className="trend-val">{t.valLabel}</span>
                        <div className={`trend-bar ${t.statusClass}`} style={{ height: `${t.height}px` }} />
                      </>
                    )}
                  </div>
                  <span className="trend-lbl">{t.dateLabel}</span>
                </div>
              ))}
            </div>,
            "tend",
          )}

        {/* 11. Execuções recentes */}
        {extras.recent.length > 0 &&
          card(
            "Execuções recentes",
            "Últimas execuções: data, hora e duração planejada → real.",
            extras.recent.map((h) => (
              <div className="dev-row exec-row" key={h.ts}>
                <span className="exec-name">{h.routineName}</span>
                <span className="dev-n">
                  {h.dateStr} &middot; {h.timeStr} | <b>{h.plannedStr}</b> &rarr; <b className={h.statusClass}>{h.actualStr}</b>
                </span>
              </div>
            )),
            "recentes",
          )}
      </Fragment>
    );
  }

  function renderMonthView() {
    const gridData = getMonthGridData(calMonth, history, routines, snoozes, gam, weekStart, statsRoutineFilter);
    const y = calMonth.getFullYear();
    const mo = calMonth.getMonth();
    const resumo = getResumoPeriodo(new Date(y, mo, 1, 12), new Date(y, mo + 1, 0, 12), history, routines, snoozes, statsRoutineFilter);
    const resumoAnt = getResumoPeriodo(new Date(y, mo - 1, 1, 12), new Date(y, mo, 0, 12), history, routines, snoozes, statsRoutineFilter);
    const nomeAnterior = new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
    // grade em semanas completas (vazios no começo e no fim) + coluna da nota
    const celulas: Array<MonthDayData | null> = [...Array(gridData.voidCount).fill(null), ...gridData.days];
    while (celulas.length % 7) celulas.push(null);
    const semanas: Array<Array<MonthDayData | null>> = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));

    return (
      <>
        <div className="cal-nav">
          <button
            className="bell-btn"
            onClick={() => {
              const prev = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
              setCalMonth(prev);
              setSelectedDay(null);
            }}
          >
            &lsaquo;
          </button>
          <span className="cal-title">
            {gridData.monthName} {gridData.year}
            {gridData.rate !== null && (
              <span className="cal-rate" title={`cumprimento do mês: ${gridData.doneTotal}/${gridData.plannedTotal} agendadas`}>
                {gridData.rate}%
              </span>
            )}
          </span>
          <button
            className="bell-btn"
            onClick={() => {
              const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
              setCalMonth(next);
              setSelectedDay(null);
            }}
          >
            &rsaquo;
          </button>
        </div>

        {renderResumo(resumo, resumoAnt, nomeAnterior)}

        <div className="stat-card">
          <div className="mcal-grid mcal-compact com-nota">
            {ordemDiasSemana(weekStart).map((dow) => (
              <span key={`lbl-${dow}`} className="mcal-dowlbl">
                {DOWL[dow]}
              </span>
            ))}
            <span className="mcal-dowlbl" title="Nota do boletim da semana">
              nota
            </span>
            {semanas.map((sem, si) => {
              const primeiro = sem.find((d): d is MonthDayData => !!d);
              const nota = primeiro ? notaDaSemana(inicioSemanaISO(primeiro.dateObj, weekStart)) : null;
              return (
                <Fragment key={`sem-${si}`}>
                  {sem.map((d, i) =>
                    d ? (
                      <span
                        key={d.key}
                        className={`mcal-cell ${d.intensity} ${d.isToday ? "mcal-today" : ""} ${selectedDay === d.key ? "mcal-sel" : ""}`}
                        title={d.min ? `${d.day}: ${fmtHorasMin(d.min)}` : undefined}
                        onClick={() => setSelectedDay(selectedDay === d.key ? null : d.key)}
                      >
                        <span className="mcal-num">{d.day}</span>
                      </span>
                    ) : (
                      <span key={`void-${si}-${i}`} className="mcal-cell mcal-void" />
                    )
                  )}
                  <span className="mcal-nota" title={nota == null ? "sem nota" : `nota da semana: ${nota.toFixed(1)}`}>
                    {nota != null && (
                      <>
                        <span className="mcal-nota-bar">
                          <span style={{ height: `${Math.max(4, Math.min(100, nota))}%` }} />
                        </span>
                        <span className="mcal-nota-n">{Math.round(nota)}</span>
                      </>
                    )}
                  </span>
                </Fragment>
              );
            })}
          </div>
          <div className="hm-legend">
            <span>menos</span>
            <span className="hm-cell lv0" />
            <span className="hm-cell lv1" />
            <span className="hm-cell lv2" />
            <span className="hm-cell lv3" />
            <span className="hm-cell lv4" />
            <span>mais tempo</span>
          </div>
        </div>

        {selectedDay && renderDayDetail(selectedDay)}
        {renderPeriodExtras("30d")}
        <div style={{ height: 20 }} />
      </>
    );
  }

  function renderYearView() {
    const heatmapData = getHeatmapData(calYear, history, weekStart, statsRoutineFilter, calQuad);
    const monthlyBars = getYearMonthlyBars(calYear, history, statsRoutineFilter);
    const resumo = getResumoPeriodo(new Date(calYear, 0, 1, 12), new Date(calYear, 11, 31, 12), history, routines, snoozes, statsRoutineFilter);
    const resumoAnt = getResumoPeriodo(new Date(calYear - 1, 0, 1, 12), new Date(calYear - 1, 11, 31, 12), history, routines, snoozes, statsRoutineFilter);
    const hoje = new Date();
    const anoAtual = calYear === hoje.getFullYear();
    const maxMin = Math.max(...monthlyBars.bars.map((b) => b.minutes), 1);
    const mediaMin = monthlyBars.totalMinutes / (anoAtual ? hoje.getMonth() + 1 : 12);
    const areas = getAreasAno(calYear, history, routines, gam, statsRoutineFilter);
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

    return (
      <>
        <div className="cal-nav">
          <button
            className="bell-btn"
            onClick={() => {
              setCalYear(calYear - 1);
              setSelectedDay(null);
            }}
          >
            &lsaquo;
          </button>
          <span className="cal-title">{calYear}</span>
          <button
            className="bell-btn"
            onClick={() => {
              setCalYear(calYear + 1);
              setSelectedDay(null);
            }}
          >
            &rsaquo;
          </button>
        </div>

        {renderResumo(resumo, resumoAnt, String(calYear - 1))}

        <div className="stat-card hm-quad" id="yearHm">
          <div className="hm-pager">
            <button className="icon-btn borderless" title="Quadrimestre anterior" aria-label="Quadrimestre anterior" onClick={() => mudarQuad(-1)}>
              <Icon name="chevronLeft" size={15} />
            </button>
            <span className="hm-pager-lbl">
              {String(calYear).slice(2)}T{calQuad}
            </span>
            <button className="icon-btn borderless" title="Próximo quadrimestre" aria-label="Próximo quadrimestre" onClick={() => mudarQuad(1)}>
              <Icon name="chevronRight" size={15} />
            </button>
          </div>
          <div>
            <div className="hm-months">
              {heatmapData.columns.map((col, i) => (
                <span key={i} className="hm-mlabel">
                  {col.monthLabel}
                </span>
              ))}
            </div>
            <div className="hm-grid">
              {heatmapData.columns.map((col, ci) => (
                <div key={ci} className="hm-col">
                  {col.cells.map((cell) => (
                    <span
                      key={cell.key + "-" + cell.inRange}
                      className={`hm-cell ${cell.intensity} ${selectedDay === cell.key ? "hm-sel" : ""}`}
                      onClick={() => {
                        if (cell.inRange) {
                          setSelectedDay(selectedDay === cell.key ? null : cell.key);
                        }
                      }}
                      title={cell.inRange ? `${cell.key}: ${cell.min}min` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="hm-legend">
            <span>menos</span>
            <span className="hm-cell lv0" />
            <span className="hm-cell lv1" />
            <span className="hm-cell lv2" />
            <span className="hm-cell lv3" />
            <span className="hm-cell lv4" />
            <span>mais</span>
          </div>
        </div>

        {selectedDay && renderDayDetail(selectedDay)}

        {/* Tempo por mês */}
        {monthlyBars.totalMinutes > 0 ? (
          <>
            {card(
              <>Tempo por mês &middot; total {monthlyBars.totalHoursStr}</>,
              "Horas executadas em cada mês. Linha tracejada = média mensal; o mês atual fica destacado.",
              <>
              <div className="mes-plot">
                {monthlyBars.bars.map((bar) => (
                  <div
                    key={bar.monthIdx}
                    className={"mes-col" + (anoAtual && bar.monthIdx === hoje.getMonth() ? " atual" : "")}
                    title={`${bar.monthName}: ${bar.valStr}`}
                  >
                    <div className="mes-bar" style={{ height: `${bar.minutes ? Math.max(3, (bar.minutes / maxMin) * 100) : 0}%` }} />
                  </div>
                ))}
                <div className="mes-media" style={{ bottom: `${(mediaMin / maxMin) * 100}%` }} />
              </div>
              <div className="mes-lbls">
                {monthlyBars.bars.map((bar) => (
                  <span key={bar.monthIdx} className="trend-lbl">
                    {bar.monthName}
                  </span>
                ))}
              </div>
              <div className="stat-foot">
                - - média {fmtHorasMin(Math.round(mediaMin))}/mês
                {anoAtual && ` · ${monthlyBars.bars[hoje.getMonth()].monthName}: ${monthlyBars.bars[hoje.getMonth()].valStr}`}
              </div>
              </>,
            )}

            {areas.length > 0 &&
              card(
                <>Por área &middot; {calYear}</>,
                "Tempo executado no ano em cada área da roda da vida, pela área atual de cada rotina.",
                <>
                  <div className="bar-grid">
                    {areas.map((a) => (
                      <div className="bar-row" key={a.id || "sem-area"}>
                        <div className="bar-name" style={{ color: a.color }}>
                          {a.label}
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${Math.max(3, a.pct)}%`, background: a.color }} />
                        </div>
                        <div className="bar-val">
                          {fmtHorasMin(a.minutos)} &middot; {a.pct}%
                        </div>
                      </div>
                    ))}
                  </div>
                  {melhores.length > 0 && (
                    <div className="routine-meta routine-meta-line" style={{ marginTop: 12 }}>
                      <span className="rc-fact">
                        <Icon name="trophy" size={13} /> melhores meses
                      </span>
                      {melhores.map((b) => (
                        <span className="rc-fact" key={b.monthIdx}>
                          <b>{b.monthName}</b> {b.valStr}
                        </span>
                      ))}
                    </div>
                  )}
                </>,
              )}
          </>
        ) : (
          <div className="stat-card">
            <div className="dev-n">Sem execuções em {calYear}.</div>
          </div>
        )}

        {renderPeriodExtras("ano")}
        <div style={{ height: 20 }} />
      </>
    );
  }

  function handleExportPdf() {
    const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
    const { title, innerHtml } = relatorioFechamentoHtml(
      statsView,
      gam,
      history,
      routines,
      doc?.targets ?? [],
    );
    exportPdfView(title, innerHtml, "Relatórios");
  }

  return (
    <div className="screen screen-wide with-tabbar">
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div className="home-header stats-sticky-head">
          <h1>Dados</h1>
          <div className="header-right">
            <button
              className="bell-btn"
              title="Relatório de fechamento (PDF)"
              aria-label="Relatório de fechamento"
              onClick={handleExportPdf}
            >
              <Icon name="clipboard" size={15} />
            </button>
          </div>
        </div>

        <div id="statsHead">
          <div className="stats-nav">
            <div className="type-toggle view-toggle">
              <span
                className={statsView === "semanal" ? "active" : ""}
                onClick={() => {
                  setStatsView("semanal");
                  setSelectedDay(null);
                }}
              >
                semanal
              </span>
              <span
                className={statsView === "mensal" ? "active" : ""}
                onClick={() => {
                  setStatsView("mensal");
                  setSelectedDay(null);
                }}
              >
                mensal
              </span>
              <span
                className={statsView === "anual" ? "active" : ""}
                onClick={() => {
                  setStatsView("anual");
                  setSelectedDay(null);
                }}
              >
                anual
              </span>
            </div>
          </div>

          <div className="stats-nav">
            <select
              className="routine-select"
              value={statsRoutineFilter || ""}
              onChange={(e) => setStatsRoutineFilter(e.target.value || null)}
            >
              <option value="">Todas as rotinas</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div id="statsBody">
          {history.length === 0 ? (
            <div className="empty-state" style={{ minHeight: "50vh" }}>
              <h2>Sem dados ainda</h2>
              <p>Conclua rotinas para ver seu histórico, desvios de tempo e pontualidade aqui.</p>
            </div>
          ) : statsView === "mensal" ? (
            renderMonthView()
          ) : statsView === "anual" ? (
            renderYearView()
          ) : (
            renderWeekView()
          )}
        </div>
      </div>
      <Tabbar />
    </div>
  );
}

