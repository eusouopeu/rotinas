// Porta parcial de renderRoutineDetail (index.html:3908-4013) — nome/ícone,
// meta (etapas/duração), chip de horário+dias, lista de etapas só leitura e
// os botões Editar/Começar. Ficam para depois: reordenar etapa por arrastar,
// editar etapa direto daqui (openStepEditor), duplicar/excluir etapa por
// swipe — dependem do hook de drag-and-drop único (ainda não consolidado, ver
// CLAUDE.md) em vez de reimplementar aqui. Ainda não existe a variante split
// (lista + detalhe lado a lado) do desktop (`.home-split-detail` no app
// antigo, index.html:3891) — sem ela, `.routine-list` viraria grid de 2
// colunas em telas largas (regra pensada pra lista de cards, app.css:1310),
// por isso o display:flex/column é forçado inline abaixo.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { fmtTime } from "../lib/format";
import { EXERCICIO_SET_SEG, routineDurationRaw } from "../lib/routines";
import { computeSchedule, diasChipLabel } from "../lib/schedule";
import { corDaRotina, fillStyle } from "../lib/scoring";

export function RoutineDetail() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const goTo = useAppStore((s) => s.goTo);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const id = useAppStore((s) => s.view.id);

  const r = routines.find((x) => x.id === id);

  if (!r) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="link-btn muted" onClick={() => goTo({ tab: "home", screen: "home" })}>
            &larr; Rotinas
          </button>
        </div>
        <div className="empty-state">
          <h2>Rotina não encontrada</h2>
        </div>
      </div>
    );
  }

  const dur = routineDurationRaw(r, EXERCICIO_SET_SEG);
  const sched = computeSchedule(r);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link-btn muted" onClick={() => goTo({ tab: "home", screen: "home" })}>
          &larr; Rotinas
        </button>
      </div>
      <div
        className="routine-list"
        style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", paddingBottom: 110 }}
      >
        <div className="home-header" style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 26 }}>
            <span className="r-dot" style={{ background: fillStyle(corDaRotina(r, gam)) }} />
            {r.icon ? r.icon + " " : ""}
            {r.name}
          </h1>
        </div>
        <div className="routine-meta" style={{ marginBottom: 4 }}>
          {r.steps.length} etapa{r.steps.length !== 1 ? "s" : ""} ·{" "}
          {dur > 0 ? fmtTime(dur).replace("+", "") : "sem tempo fixo"}
        </div>
        {sched && (
          <>
            <div className="sched-chip">
              <Icon name="clock" size={13} /> {sched.startStr} &rarr; {sched.endStr}
            </div>
            <div className="sched-chip chip-block" style={{ color: "var(--sub)" }}>
              {diasChipLabel(r)}
            </div>
            <div style={{ height: 10 }} />
          </>
        )}
        <div className="section-label">Etapas</div>

        {r.steps.length === 0 ? (
          <div className="empty-state" style={{ minHeight: "20vh" }}>
            <p>Esta rotina não tem etapas.</p>
          </div>
        ) : (
          r.steps.map((s, i) => {
            const iconName = s.type === "timer" ? "clock" : s.type === "exercicio" ? "trophy" : "check";
            let metaTxt: string;
            if (s.type === "timer") metaTxt = fmtTime(s.seconds || 0).replace("+", "");
            else if (s.type === "exercicio") metaTxt = `${s.sets || 1}x · ${r.restSeconds || 120}s descanso`;
            else metaTxt = "checklist";
            if (s.journaling) metaTxt += " · anotações";
            return (
              <div className="routine-card" style={{ gap: 10 }} key={s.id}>
                <div
                  className="routine-info"
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  <span style={{ flex: "0 0 auto", fontSize: 16, color: "var(--sub)" }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name={iconName} size={13} /> {s.name || "sem nome"}
                    </h3>
                    <div className="routine-meta" style={{ marginTop: 2 }}>
                      {metaTxt}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="bottom-actions">
        <button
          className="btn-danger-outline"
          style={{ borderColor: "var(--line)", color: "var(--sub)" }}
          onClick={() => openEditor(r.id)}
        >
          Editar
        </button>
        <button className="btn-primary" disabled={r.steps.length === 0} onClick={() => startPlayer(r.id)}>
          <Icon name="play" size={16} /> Começar
        </button>
      </div>
    </div>
  );
}
