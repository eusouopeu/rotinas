// Porta de renderRoutineStats (index.html:6031-6201) — detalhe de
// estatísticas por rotina acessível a partir da tela de Estatísticas
// (view.screen === "routineStats").
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { getRoutineDetailStats } from "../lib/stats";
import { fmtTime } from "../lib/format";

export function RoutineStats() {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const adjustRoutineStep = useAppStore((s) => s.adjustRoutineStep);
  const deleteHistoryEntry = useAppStore((s) => s.deleteHistoryEntry);

  const routine = routines.find((x) => x.id === view.id);

  if (!routine) {
    return (
      <div className="screen">
        <div className="topbar">
          <button
            className="link-btn muted"
            onClick={() => goTo({ tab: "stats", screen: "stats" })}
          >
            &larr; Dados
          </button>
        </div>
        <div className="empty-state">
          <h2>Rotina não encontrada</h2>
        </div>
      </div>
    );
  }

  const stats = getRoutineDetailStats(routine, history, gam);

  function handleAdjust(stepName: string, plan: number, newSec: number, newSecLabel: string) {
    if (
      window.confirm(
        `Ajustar a etapa "${stepName}" de ${fmtTime(plan).replace("+", "")} para ${newSecLabel}?`,
      )
    ) {
      adjustRoutineStep(routine!.id, stepName, newSec);
    }
  }

  function handleDeleteExec(ts: number) {
    if (
      window.confirm(
        "Apagar este registro de execução?\nEle sai de todas as estatísticas.",
      )
    ) {
      deleteHistoryEntry(ts);
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button
          className="link-btn muted"
          onClick={() => goTo({ tab: "stats", screen: "stats" })}
        >
          &larr; Dados
        </button>
        <span className="section-label" style={{ margin: 0 }}>
          {routine.icon ? routine.icon + " " : ""}
          {routine.name}
        </span>
      </div>

      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        {stats.allCount === 0 ? (
          <div className="empty-state" style={{ minHeight: "40vh" }}>
            <h2>Sem execuções</h2>
            <p>Conclua esta rotina para gerar dados.</p>
          </div>
        ) : (
          <>
            {/* 1. Resumo geral */}
            <div className="section-label">Resumo geral</div>
            <div className="stat-card">
              <div className="dev-row">
                <span>Execuções</span>
                <b className="ontime">{stats.allCount}</b>
              </div>
              <div className="dev-row">
                <span>Tempo total registrado</span>
                <b className="ontime">{stats.totalTimeStr}</b>
              </div>
              <div className="dev-row">
                <span>Sequência atual</span>
                <b className="ontime">{stats.streak} dia(s)</b>
              </div>
              {stats.medDev != null && (
                <div className="dev-row">
                  <span>Desvio mediano</span>
                  <b className={stats.medDevClass}>{stats.medDevStr}</b>
                  <span className="dev-n">{stats.devsCount}x</span>
                </div>
              )}
              {stats.medMood != null && stats.moodStars && (
                <div className="dev-row">
                  <span>Humor mediano</span>
                  <b className="ontime">{stats.moodStars}</b>
                  <span className="dev-n">{stats.moodCount}x</span>
                </div>
              )}
              {stats.medDelay != null && (
                <div className="dev-row">
                  <span>Atraso mediano no início</span>
                  <b className={stats.medDelay > 5 ? "late" : "ontime"}>{stats.medDelay}min</b>
                  <span className="dev-n">{stats.delayCount}x</span>
                </div>
              )}
            </div>

            {/* 2. Análise por etapa */}
            {stats.stepRows.length > 0 && (
              <>
                <div className="section-label">Por etapa (desvio mediano)</div>
                <div className="stat-card">
                  {stats.stepRows.map((s, si) => (
                    <div key={`step-${si}`} style={{ marginBottom: s.suggestAdjust ? 8 : 0 }}>
                      <div className="dev-row">
                        <span>{s.name}</span>
                        <b className={s.statusClass}>{s.medDevStr}</b>
                        <span className="dev-n">
                          {fmtTime(s.plan).replace("+", "")}&rarr;{fmtTime(s.medAct).replace("+", "")} &middot; {s.n}x
                        </span>
                      </div>
                      {s.suggestAdjust && (
                        <div className="suggest-row">
                          <span className="dev-n">A mediana real é {fmtTime(s.medAct).replace("+", "")}.</span>
                          <button
                            className="suggest-btn"
                            onClick={() => handleAdjust(s.name, s.plan, s.newSec, s.newSecLabel)}
                          >
                            ajustar para {s.newSecLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 3. Planejado − real (média · mediana) */}
                <div className="section-label">Planejado &minus; real (média &middot; mediana)</div>
                <div className="stat-card">
                  <div className="dev-row dev-head">
                    <span>tarefa</span>
                    <b>média</b>
                    <b>mediana</b>
                  </div>
                  {stats.durRows.map((d, di) => (
                    <div className="dev-row" key={`dur-${di}`}>
                      <span>{d.name}</span>
                      <b className={d.statusMedia}>{d.difMediaStr}</b>
                      <b className={d.statusMediana}>{d.difMedianaStr}</b>
                    </div>
                  ))}
                  <div className="stat-foot">Positivo sobrou tempo, negativo estourou o planejado.</div>
                </div>
              </>
            )}

            {/* 4. Carga por exercício */}
            {stats.exerciseRows.length > 0 && (
              <>
                <div className="section-label">Carga por exercício</div>
                <div className="stat-card">
                  {stats.exerciseRows.map((ex, ei) => (
                    <div key={`ex-${ei}`} style={{ marginBottom: 8 }}>
                      <div className="dev-row">
                        <span>{ex.nome}</span>
                        <b className="ontime">{ex.maxPeso}kg</b>
                        <span className="dev-n">{ex.count}x</span>
                      </div>
                      <div className="suggest-row">
                        <span className="dev-n">{ex.serieText}</span>
                        {ex.evoText && <span className="dev-n">{ex.evoText}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 5. Horário real de início */}
            {stats.hasHourCounts && (
              <>
                <div className="section-label">Horário real de início</div>
                <div className="stat-card">
                  <div className="hour-chart">
                    {stats.hourCols.map((c, ci) => (
                      <div className="hour-col" key={`hc-${ci}`}>
                        <span className="trend-lbl">{c.showLabel ? `${c.hour}h` : ""}</span>
                        <div className="hour-bar-area">
                          <div
                            className="hour-bar"
                            style={{
                              height: `${c.height}px`,
                              background: c.count ? stats.routineColor : undefined,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 6. Últimas execuções */}
            {stats.recent.length > 0 && (
              <>
                <div className="section-label">
                  Últimas execuções &middot; <Icon name="xmark" size={14} /> apaga o registro
                </div>
                <div className="stat-card">
                  {stats.recent.map((h) => (
                    <div className="dev-row" key={`rec-${h.ts}`}>
                      <span className="dev-n">
                        {h.dateStr} {h.timeStr}
                      </span>
                      <span className="dev-n">
                        {h.cmpStr} {h.moodStr}
                      </span>
                      <button
                        className="del-exec"
                        onClick={() => handleDeleteExec(h.ts)}
                        title="Apagar este registro de execução"
                        aria-label="Apagar registro"
                      >
                        <Icon name="xmark" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
