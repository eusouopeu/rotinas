// Porta de renderStats/renderWeekView/dayDetailHtml (index.html:5296-5333,
// 5418-5459, 5842-5909) — tela "Estatísticas" (aba "Dados" no legado). Esta
// fatia cobre só a visão semanal; mensal/anual mostram um placeholder
// "Em breve" (fica pra um port seguinte), igual o relatório em PDF (botão
// sem ação ainda) e o filtro por rotina (funcional no estado, sem efeito
// nesta visão — mesmo comportamento do legado aqui).
import { Fragment, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { load } from "../lib/storage";
import { K_SNOOZES } from "../lib/constants";
import { getDayDetailData, getWeekGridData } from "../lib/stats";
import { ordemDiasSemana } from "../lib/gamificacao";
import { fmtClock, fmtTime } from "../lib/format";

const DOWL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function Stats() {
  const goTo = useAppStore((s) => s.goTo);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const weekStart = useAppStore((s) => s.weekStart);

  const [statsView, setStatsView] = useState<"semanal" | "mensal" | "anual">("semanal");
  const [statsRoutineFilter, setStatsRoutineFilter] = useState<string | null>(null);
  const [calWeek, setCalWeek] = useState<Date>(new Date());
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
              onClick={() => {
                // TODO: relatório PDF, prompt seguinte
              }}
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
            <select className="routine-select" value={statsRoutineFilter || ""} onChange={(e) => setStatsRoutineFilter(e.target.value || null)}>
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
          ) : statsView === "mensal" || statsView === "anual" ? (
            <div className="empty-state" style={{ minHeight: "40vh" }}>
              <p>Em breve.</p>
            </div>
          ) : (
            renderWeekView()
          )}
        </div>
      </div>
    </div>
  );
}
