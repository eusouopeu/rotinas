// Porta parcial de renderHome (index.html:3531-3762) — o piloto desta fase
// cobre header + lista de rotinas + criar/editar/excluir (via o editor de
// verdade, RoutineEditor) + iniciar (via Player). Fica para uma fase
// seguinte: aviso de backup/carga da semana, card de "semana fechada", card
// motivacional, retomar rotina em andamento, agenda inline (semana/dia),
// swipe-to-delete (vira um hook de gesto compartilhado quando o
// drag-and-drop for consolidado).
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { fmtTime } from "../lib/format";
import { EXERCICIO_SET_SEG, routineDurationRaw } from "../lib/routines";

export function Home() {
  const routines = useAppStore((s) => s.routines);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Rotinas</h1>
        </div>

        {routines.length === 0 ? (
          <div className="empty-state">
            <h2>Nenhuma rotina ainda</h2>
            <p>Crie sua primeira sequência de etapas com tempo — igual um ritual de prática.</p>
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => openEditor(null)}>
              + Nova rotina
            </button>
          </div>
        ) : (
          <div className="routine-list" style={{ flex: "0 0 auto", overflow: "visible" }}>
            {routines.map((r) => {
              const dur = routineDurationRaw(r, EXERCICIO_SET_SEG);
              return (
                <div className="routine-card" key={r.id}>
                  <div className="routine-info" style={{ cursor: "pointer" }} onClick={() => openEditor(r.id)}>
                    <h3>
                      {r.icon ? r.icon + " " : ""}
                      {r.name}
                    </h3>
                    <div className="routine-meta">
                      {r.steps.length} etapa{r.steps.length !== 1 ? "s" : ""} ·{" "}
                      {dur > 0 ? fmtTime(dur).replace("+", "") : "sem tempo fixo"}
                    </div>
                  </div>
                  <div className="routine-actions">
                    <button
                      className="icon-btn borderless"
                      title="Excluir rotina"
                      aria-label="Excluir rotina"
                      onClick={() => deleteRoutine(r.id)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                    <button
                      className="play-btn"
                      title="Iniciar rotina"
                      aria-label="Iniciar rotina"
                      disabled={r.steps.length === 0}
                      onClick={() => startPlayer(r.id)}
                    >
                      <Icon name="play" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="fab" title="Novo" onClick={() => openEditor(null)}>
        +
      </button>
      <Tabbar />
    </div>
  );
}
