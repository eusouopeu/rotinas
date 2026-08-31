// Porta parcial de renderEditor (index.html:4315-4740). Cobre nome, etapas
// (só tipo "tempo" — "checklist"/"exercício" ficam para quando os editores
// deles existirem no React), reordenar etapa por arrastar (useDragReorder,
// ver webapp/src/lib/dnd.ts) e agendamento (dias + horário). Fica para
// depois: peso no boletim, área da roda da vida, hábito, nota anexada, meta
// semanal, modo "a cada N dias".
import { useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { computeSchedule, DAY_LETTERS } from "../lib/schedule";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import type { RoutineStep } from "../lib/types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function RoutineEditor() {
  const draft = useAppStore((s) => s.editorDraft);
  const routines = useAppStore((s) => s.routines);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const cancelEdit = useAppStore((s) => s.cancelEdit);
  const saveDraft = useAppStore((s) => s.saveDraft);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);

  if (!draft) {
    cancelEdit();
    return null;
  }

  const isNew = !routines.some((r) => r.id === draft.id);
  const schedule = draft.schedule!;
  const sched = computeSchedule(draft);

  function patchStep(idx: number, patch: Partial<RoutineStep>) {
    const steps = draft!.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateDraft({ steps });
  }
  function addStep() {
    updateDraft({ steps: [...draft!.steps, { id: uid(), name: "", seconds: 60, type: "timer" }] });
  }
  function removeStep(idx: number) {
    const steps = draft!.steps.filter((_, i) => i !== idx);
    updateDraft({ steps: steps.length ? steps : [{ id: uid(), name: "", seconds: 60, type: "timer" }] });
  }
  function toggleDia(d: number) {
    const dias = schedule.days;
    const pos = dias.indexOf(d);
    if (pos >= 0) {
      if (dias.length > 1) updateDraft({ schedule: { ...schedule, days: dias.filter((x) => x !== d) } });
    } else {
      updateDraft({ schedule: { ...schedule, days: [...dias, d].sort((a, b) => a - b) } });
    }
  }
  function handleSave() {
    if (!draft!.name.trim()) return;
    saveDraft();
  }
  function handleDelete() {
    if (!window.confirm(`Excluir a rotina "${draft!.name || "sem nome"}"?`)) return;
    deleteRoutine(draft!.id);
    cancelEdit();
  }

  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  function reorderSteps(fromIndex: number, toIndex: number) {
    const steps = [...draft!.steps];
    const [moved] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, moved);
    updateDraft({ steps });
  }
  const { dragFrom, dragOver, dragHandleProps } = useDragReorder((from, to) => reorderSteps(from.index, to.index));

  return (
    <div className="screen screen-wide">
      <div className="topbar">
        <button className="link-btn muted" onClick={cancelEdit}>
          Cancelar
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 230 }}>
        <input
          className="name-input"
          type="text"
          placeholder="Nome da rotina"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
        />

        <div className="section-label">Etapas</div>
        <div className="steps-list">
          {draft.steps.map((s, i) => (
            <div
              className={
                "step-row" +
                (dragFrom?.index === i ? " dragging" : "") +
                (dragOver && dragFrom && dragOver.index === i && dragOver.index !== dragFrom.index
                  ? dragOver.index < dragFrom.index
                    ? " drop-above"
                    : " drop-below"
                  : "")
              }
              key={s.id}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <span
                className="drag-handle"
                {...dragHandleProps({ container: 0, index: i }, (_x, y) => ({
                  container: 0,
                  index: computeStepDragTarget(
                    stepRefs.current.map((el) => el!.getBoundingClientRect()),
                    i,
                    y,
                  ),
                }))}
              >
                <Icon name="bars3" size={15} />
              </span>
              <div className="step-num">{i + 1}</div>
              <div className="step-fields">
                <input
                  type="text"
                  placeholder="Nome da etapa"
                  value={s.name}
                  onChange={(e) => patchStep(i, { name: e.target.value })}
                />
                <div className="step-sub">
                  <input
                    className="dur-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={Math.floor((s.seconds || 0) / 60)}
                    onChange={(e) => {
                      const mins = Math.max(0, +e.target.value || 0);
                      const secs = (s.seconds || 0) % 60;
                      patchStep(i, { seconds: Math.max(5, mins * 60 + secs) });
                    }}
                  />{" "}
                  min
                  <input
                    className="dur-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    value={(s.seconds || 0) % 60}
                    onChange={(e) => {
                      const mins = Math.floor((s.seconds || 0) / 60);
                      const secs = Math.min(59, Math.max(0, +e.target.value || 0));
                      patchStep(i, { seconds: Math.max(5, mins * 60 + secs) });
                    }}
                  />{" "}
                  seg
                </div>
              </div>
              <div className="step-side">
                <button className="icon-btn borderless" title="Excluir etapa" onClick={() => removeStep(i)}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          ))}
          <button className="add-step-btn" onClick={addStep}>
            + adicionar etapa
          </button>
        </div>

        <div className="section-label">Agendamento</div>
        <div className="schedule-box">
          <label className="switch-row">
            <span>Ativar horário</span>
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(e) => updateDraft({ schedule: { ...schedule, enabled: e.target.checked } })}
            />
          </label>
          {schedule.enabled && (
            <div>
              <div className="sched-time-row">
                <div className="type-toggle">
                  {(["start", "end"] as const).map((a) => (
                    <span
                      key={a}
                      className={schedule.anchor === a ? "active" : ""}
                      onClick={() => updateDraft({ schedule: { ...schedule, anchor: a } })}
                    >
                      {a === "start" ? "início" : "término"}
                    </span>
                  ))}
                </div>
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => updateDraft({ schedule: { ...schedule, time: e.target.value } })}
                />
              </div>
              <div className="day-chips" style={{ marginTop: 10 }}>
                {DAY_LETTERS.map((l, d) => (
                  <span
                    key={d}
                    className={"day-chip" + (schedule.days.includes(d) ? " active" : "")}
                    onClick={() => toggleDia(d)}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div className="sched-computed">{sched ? `${sched.startStr} → ${sched.endStr}` : "Defina um horário."}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-actions">
        {!isNew && (
          <button className="btn-danger-outline" style={{ flex: "0 0 37%" }} onClick={handleDelete}>
            Excluir
          </button>
        )}
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>
          Salvar
        </button>
      </div>
    </div>
  );
}
