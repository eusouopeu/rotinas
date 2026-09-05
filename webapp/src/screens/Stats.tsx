// Porta de renderStats/renderWeekView/renderMonthView/renderYearView/
// renderPeriodExtras/dayDetailHtml (index.html:5296-6028) — tela "Estatísticas"
// (aba "Dados" no legado): visão semanal, mensal e anual com filtro por rotina,
// heatmap anual, metas, gráficos, insights e relatório PDF.
import { Fragment, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { RodaVidaResumo } from "../components/RodaVidaResumo";
import { load } from "../lib/storage";
import { K_SNOOZES } from "../lib/constants";
import {
  getDayDetailData,
  getWeekGridData,
  getMonthGridData,
  getHeatmapData,
  getYearMonthlyBars,
  getPeriodExtrasData,
} from "../lib/stats";
import { ordemDiasSemana } from "../lib/gamificacao";
import { fmtClock, fmtTime } from "../lib/format";
import { relatorioFechamentoHtml } from "../lib/pdfExport";
import { exportPdfView } from "../lib/exportFile";
import type { CountdownDoc } from "../lib/types";

const DOWL = ["D", "S", "T", "Q", "Q", "S", "S"];

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

  const snoozes = load<Array<{ from: number; to: number }>>(K_SNOOZES, []);

  function renderDayDetail(key: string) {
    const data = getDayDetailData(key, history, routines, snoozes);
    return (
      <Fragment key={key}>
        <div className="section-label">
          {String(data.dateObj.getDate()).padStart(2, "0")}/{String(data.dateObj.getMonth() + 1).padStart(2, "0")}/{data.dateObj.getFullYear()}
        </div>
        <div className="stat-card">
          {data.isEmpty ? (
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
              {data.planned.map((r, i) => (
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

    const diasMostrar = selectedDay ? [selectedDay] : gridData.days.filter((d) => d.temAlgo).map((d) => d.key);

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

        {diasMostrar.map(renderDayDetail)}
        <div style={{ height: 20 }} />
      </>
    );
  }

  function renderPeriodExtras(period: "30d" | "ano") {
    const extras = getPeriodExtrasData(period, history, routines, snoozes, gam, statsRoutineFilter, weekStart);

    return (
      <Fragment key={`extras-${period}-${statsRoutineFilter || "all"}`}>
        {/* 1. Insights */}
        {extras.insights.length > 0 && (
          <>
            <div className="section-label">Insights ({extras.periodLbl})</div>
            <div className="stat-card">
              {extras.insights.map((txt, i) => (
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
              ))}
            </div>
          </>
        )}

        {/* 2. Metas da semana */}
        {extras.goals.length > 0 && (
          <>
            <div className="section-label">
              Metas da semana ({extras.janelaSemana}) &middot; | = esperado até hoje
            </div>
            <div className="stat-card">
              {extras.goals.map((g) => (
                <div
                  key={g.routineId}
                  className="bar-row tappable"
                  onClick={() => goTo({ tab: "stats", screen: "routineStats", id: g.routineId })}
                >
                  <div className="bar-name">
                    {g.icon ? g.icon + " " : ""}
                    {g.routineName}
                  </div>
                  <div className="bar-track goal-track">
                    <div className="bar-fill" style={{ width: `${Math.max(3, g.pct)}%`, background: g.color }} />
                    <span className="goal-marker" style={{ left: `${g.expPct}%` }} />
                  </div>
                  <div
                    className={`bar-val ${g.onPace ? "early" : "late"}`}
                    style={{ color: g.onPace ? "var(--ok)" : "var(--erro)" }}
                  >
                    {g.doneCount}/{g.weeklyGoalTimes}x
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 3. Distribuição por dia da semana */}
        {extras.hasDowTotals && (
          <>
            <div className="section-label">Por dia da semana ({extras.periodLbl})</div>
            <div className="stat-card">
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
              </div>
            </div>
          </>
        )}

        {/* 4. Horário real de início */}
        {extras.hasHourCounts && (
          <>
            <div className="section-label">Horário real de início ({extras.periodLbl})</div>
            <div className="stat-card">
              <div className="hour-chart">
                {extras.hourCols.map((c) => (
                  <div className="hour-col" key={c.hour}>
                    <span className="trend-lbl">{c.showLabel ? `${c.hour}h` : ""}</span>
                    <div className="hour-bar-area">
                      <div className="hour-bar" style={{ height: `${c.height}px` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 5. Cumprimento do agendado */}
        {extras.schedCompliance.length > 0 && (
          <>
            <div className="section-label">Cumprimento do agendado ({extras.periodLbl})</div>
            <div className="stat-card">
              {extras.schedCompliance.map((s) => (
                <div
                  key={s.routineId}
                  className="dev-row tappable"
                  onClick={() => goTo({ tab: "stats", screen: "routineStats", id: s.routineId })}
                >
                  <span>
                    {s.icon ? s.icon + " " : ""}
                    {s.routineName}
                  </span>
                  <b className={s.statusClass}>{s.pct}%</b>
                  <span className="dev-n">
                    {s.doneDays}/{s.plannedDays} dias
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 6. Sequências por rotina */}
        {extras.streaks.length > 0 && (
          <>
            <div className="section-label">Sequências por rotina</div>
            <div className="stat-card">
              {extras.streaks.map((x) => (
                <div
                  key={x.routineId}
                  className="dev-row tappable"
                  onClick={() => goTo({ tab: "stats", screen: "routineStats", id: x.routineId })}
                >
                  <span>
                    {x.icon ? x.icon + " " : ""}
                    {x.routineName}
                  </span>
                  <b className="ontime">
                    {x.streak} dia{x.streak > 1 ? "s" : ""}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 7. Etapas que mais estouram */}
        {extras.stepBottlenecks.length > 0 && (
          <>
            <div className="section-label">Etapas que mais estouram ({extras.periodLbl})</div>
            <div className="stat-card">
              {extras.stepBottlenecks.map((s, i) => (
                <div
                  key={i}
                  className="dev-row tappable"
                  onClick={() => goTo({ tab: "stats", screen: "routineStats", id: s.routineId })}
                >
                  <span>
                    {s.routineName} — {s.stepName}
                  </span>
                  <b className={s.statusClass}>{s.medDevStr}</b>
                  <span className="dev-n">
                    {fmtTime(s.plan).replace("+", "")}&rarr;{fmtTime(s.medAct).replace("+", "")} &middot; {s.n}x
                  </span>
                </div>
              ))}
              <div className="stat-foot">Positivo = etapa demora mais que o planejado. Toque para ver a rotina.</div>
            </div>
          </>
        )}

        {/* 8. Pontualidade mediana */}
        {extras.punctuality.length > 0 && (
          <>
            <div className="section-label">Pontualidade mediana ({extras.periodLbl})</div>
            <div className="stat-card">
              {extras.punctuality.map((p, i) => (
                <div className="dev-row" key={i}>
                  <span>{p.routineName}</span>
                  <b className={p.statusClass}>{p.label}</b>
                  <span className="dev-n">{p.count}x</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 9. Tendência da pontualidade (8 semanas) */}
        {extras.hasDelayTrend && (
          <>
            <div className="section-label">Tendência da pontualidade (8 semanas)</div>
            <div className="stat-card">
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
              </div>
              <div className="stat-foot">minutos de atraso no início &middot; mediana semanal</div>
            </div>
          </>
        )}

        {/* 10. Execuções recentes */}
        {extras.recent.length > 0 && (
          <>
            <div className="section-label">Execuções recentes ({extras.periodLbl})</div>
            <div className="stat-card">
              {extras.recent.map((h) => (
                <div className="dev-row exec-row" key={h.ts}>
                  <span className="exec-name">{h.routineName}</span>
                  <span className="dev-n">
                    {h.dateStr} &middot; {h.timeStr} | <b>{h.plannedStr}</b> &rarr;{" "}
                    <b className={h.statusClass}>{h.actualStr}</b>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Fragment>
    );
  }

  function renderMonthView() {
    const gridData = getMonthGridData(calMonth, history, routines, snoozes, gam, weekStart);

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

        <div className="stat-card">
          <div className="mcal-grid">
            {ordemDiasSemana(weekStart).map((dow) => (
              <span key={`lbl-${dow}`} className="mcal-dowlbl">
                {DOWL[dow]}
              </span>
            ))}
            {Array.from({ length: gridData.voidCount }).map((_, i) => (
              <span key={`void-${i}`} className="mcal-cell mcal-void" />
            ))}
            {gridData.days.map((d) => (
              <span
                key={d.key}
                className={`mcal-cell ${d.isToday ? "mcal-today" : ""} ${selectedDay === d.key ? "mcal-sel" : ""}`}
                onClick={() => setSelectedDay(selectedDay === d.key ? null : d.key)}
              >
                <span className="mcal-num">{d.day}</span>
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
                &nbsp;&middot;&nbsp; cumprimento do mês: {gridData.rate}% ({gridData.doneTotal}/{gridData.plannedTotal})
              </>
            )}
          </div>
        </div>

        {selectedDay && renderDayDetail(selectedDay)}
        {renderPeriodExtras("30d")}
        <div style={{ height: 20 }} />
      </>
    );
  }

  function renderYearView() {
    const heatmapData = getHeatmapData(calYear, history, weekStart);
    const monthlyBars = getYearMonthlyBars(calYear, history, statsRoutineFilter);

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

        <div className="stat-card" id="yearHm">
          <div className="hm-scroll">
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
            <div className="section-label">Tempo por mês &middot; total {monthlyBars.totalHoursStr}</div>
            <div className="stat-card">
              {monthlyBars.bars.map((bar) => (
                <div className="bar-row" key={bar.monthIdx}>
                  <div className="bar-name">{bar.monthName}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${bar.pct}%` }} />
                  </div>
                  <div className="bar-val">{bar.valStr}</div>
                </div>
              ))}
            </div>
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
    <div className="screen screen-wide">
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div className="home-header stats-sticky-head">
          <h1>
            <button
              className="icon-btn borderless"
              title="Voltar para Rotinas"
              aria-label="Voltar para Rotinas"
              onClick={() => goTo({ tab: "home", screen: "home" })}
              style={{ marginRight: 6, verticalAlign: "-8px" }}
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            Dados
          </h1>
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
          <RodaVidaResumo />
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
    </div>
  );
}

