// Porta parcial de renderHome (index.html:3531-3762) — o piloto desta fase
// cobre header + lista de rotinas + criar/editar/excluir (via o editor de
// verdade, RoutineEditor) + ver detalhe (RoutineDetail, de onde "Começar"
// fica a um toque, mesmo padrão do app antigo) + iniciar (via Player) + a
// agenda inline (visão "semana", lista simples via itensAgendaDoDia — ver
// AgendaSemana abaixo). Fica para uma fase seguinte: aviso de backup/carga
// da semana, card de "semana fechada", card motivacional, retomar rotina em
// andamento, a visão "dia" (grade de minuto, desktop e mobile — reusaria
// computeGradeLayout mas com blocosAgendaDia, um caminho de dados diferente
// de itensAgendaDoDia, ver comentário em lib/agenda.ts), agenda pausada
// (snoozes), arrastar cartão pra outro dia/coluna, e swipe-to-delete (vira
// um hook de gesto compartilhado quando o drag-and-drop for consolidado).
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { fmtTime } from "../lib/format";
import { EXERCICIO_SET_SEG, routineDurationRaw } from "../lib/routines";
import { itensAgendaDoDia, type AgendaItemDia } from "../lib/agenda";
import { fillStyle } from "../lib/scoring";
import { addDaysISO, isoToDate, localKey } from "../lib/gamificacao";
import { formatHM } from "../lib/schedule";
import { DIAS_ABREV } from "../lib/constants";

function AgendaLinha({ it, onClick, onDelete }: { it: AgendaItemDia; onClick: () => void; onDelete?: () => void }) {
  const horas = it.ini == null ? "sem hora" : it.tipo === "compromisso" ? formatHM(it.ini) : `${formatHM(it.ini)}–${formatHM(it.fim!)}`;
  return (
    <div className={"dev-row agenda-row" + (it.feito ? " feito" : "")} onClick={onClick} style={{ cursor: "pointer" }}>
      <span className="agenda-time">{horas}</span>
      <span className="agenda-nome">
        {it.tipo === "rotina" ? <span className="r-dot" style={{ background: fillStyle(it.cor) }} /> : <span className="ag-square" />}
        {it.texto}
      </span>
      {onDelete ? (
        <button
          className="icon-btn borderless"
          title="Excluir"
          aria-label="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={13} />
        </button>
      ) : (
        <span className="agenda-edit-slot" />
      )}
    </div>
  );
}

function AgendaSemana() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const diaKanban = useAppStore((s) => s.diaKanban);
  const compromissos = useAppStore((s) => s.compromissos);
  const goTo = useAppStore((s) => s.goTo);
  const toggleDiaKanbanCard = useAppStore((s) => s.toggleDiaKanbanCard);
  const deleteDiaKanbanCard = useAppStore((s) => s.deleteDiaKanbanCard);
  const toggleCompromisso = useAppStore((s) => s.toggleCompromisso);
  const deleteCompromisso = useAppStore((s) => s.deleteCompromisso);
  const addDiaKanbanCard = useAppStore((s) => s.addDiaKanbanCard);

  const hojeISO = localKey();
  const [inicioISO, setInicioISO] = useState(hojeISO);
  const [addingDia, setAddingDia] = useState<string | null>(null);
  const [novaTarefa, setNovaTarefa] = useState("");

  const fimISO = addDaysISO(inicioISO, 6);
  const rangeLabel =
    inicioISO === hojeISO ? "próximos 7 dias" : `${inicioISO.slice(8, 10)}/${inicioISO.slice(5, 7)} – ${fimISO.slice(8, 10)}/${fimISO.slice(5, 7)}`;

  function confirmarNovaTarefa(iso: string) {
    const texto = novaTarefa.trim();
    if (texto) addDiaKanbanCard(iso, texto);
    setNovaTarefa("");
    setAddingDia(null);
  }

  return (
    <div className="ag-semana">
      <div className="ag-semana-topo">
        <button className="icon-btn borderless" title="Semana anterior" aria-label="Semana anterior" onClick={() => setInicioISO(addDaysISO(inicioISO, -7))}>
          <Icon name="chevronLeft" size={15} />
        </button>
        <span className="dev-n">{rangeLabel}</span>
        <button className="icon-btn borderless" title="Próxima semana" aria-label="Próxima semana" onClick={() => setInicioISO(addDaysISO(inicioISO, 7))}>
          <Icon name="chevronRight" size={15} />
        </button>
      </div>
      {inicioISO !== hojeISO && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button className="link-btn" onClick={() => setInicioISO(hojeISO)}>
            hoje
          </button>
        </div>
      )}
      {Array.from({ length: 7 }, (_, d) => {
        const iso = addDaysISO(inicioISO, d);
        const ehHoje = iso === hojeISO;
        const dow = isoToDate(iso).getDay();
        const itens = itensAgendaDoDia(iso, isoToDate(iso), routines, gam, history, diaKanban, compromissos);
        return (
          <div key={iso}>
            <div className="ag-dia-head">
              <span className="ag-dia-nome">
                {DIAS_ABREV[dow].charAt(0).toUpperCase() + DIAS_ABREV[dow].slice(1)}
                {ehHoje ? " · hoje" : ""}
              </span>
              <span className="dev-n">
                {iso.slice(8, 10)}/{iso.slice(5, 7)}
              </span>
              <button
                className="icon-btn borderless"
                title="Nova tarefa neste dia"
                aria-label="Nova tarefa neste dia"
                onClick={() => setAddingDia(addingDia === iso ? null : iso)}
              >
                <Icon name="plus" size={15} />
              </button>
            </div>
            <div className={"stat-card" + (ehHoje ? " agenda-today" : "")}>
              {addingDia === iso && (
                <div style={{ display: "flex", gap: 8, marginBottom: itens.length ? 10 : 0 }}>
                  <input
                    className="mk-e-name"
                    placeholder="Nova tarefa..."
                    autoFocus
                    value={novaTarefa}
                    onChange={(e) => setNovaTarefa(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmarNovaTarefa(iso)}
                  />
                  <button className="btn-primary" style={{ flex: "0 0 auto" }} onClick={() => confirmarNovaTarefa(iso)}>
                    Adicionar
                  </button>
                </div>
              )}
              {itens.length ? (
                itens.map((it) => (
                  <AgendaLinha
                    key={it.tipo + ":" + it.id}
                    it={it}
                    onClick={() => {
                      if (it.tipo === "rotina") goTo({ tab: "home", screen: "routineDetail", id: it.id });
                      else if (it.tipo === "cartao") toggleDiaKanbanCard(it.id);
                      else toggleCompromisso(it.id);
                    }}
                    onDelete={it.tipo === "cartao" ? () => deleteDiaKanbanCard(it.id) : it.tipo === "compromisso" ? () => deleteCompromisso(it.id) : undefined}
                  />
                ))
              ) : addingDia === iso ? null : (
                <div className="dev-n" style={{ padding: "4px 0" }}>
                  nada agendado
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Home() {
  const routines = useAppStore((s) => s.routines);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const goTo = useAppStore((s) => s.goTo);
  const homeView = useAppStore((s) => s.homeView);
  const setHomeView = useAppStore((s) => s.setHomeView);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header" style={{ marginBottom: 10 }}>
          <h1>Rotinas</h1>
        </div>

        <div className="type-toggle view-toggle" style={{ marginBottom: 14 }}>
          <span className={homeView === "rotinas" ? "active" : ""} onClick={() => setHomeView("rotinas")}>
            Lista
          </span>
          <span className={homeView === "semana" ? "active" : ""} onClick={() => setHomeView("semana")}>
            Semana
          </span>
        </div>

        {homeView === "semana" ? (
          <AgendaSemana />
        ) : routines.length === 0 ? (
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
                  <div
                    className="routine-info"
                    style={{ cursor: "pointer" }}
                    onClick={() => goTo({ tab: "home", screen: "routineDetail", id: r.id })}
                  >
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
                      title="Editar rotina"
                      aria-label="Editar rotina"
                      onClick={() => openEditor(r.id)}
                    >
                      <Icon name="notes" size={16} />
                    </button>
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

      {homeView === "rotinas" && (
        <button className="fab" title="Novo" onClick={() => openEditor(null)}>
          +
        </button>
      )}
      <Tabbar />
    </div>
  );
}
