// Porta parcial de renderEditor (index.html:4315-4740). Cobre nome, etapas
// tipo "tempo" e "exercicio" (biblioteca de exercícios — picker/editor
// próprios, ver ExercicioPickerModal/ExercicioEditorModal abaixo, porta de
// abrirEscolhaExercicioEtapa/abrirEditorExercicio, index.html:4109-4162) e
// "checklist" (sem campos extra — mesmo fallback genérico do Player),
// descanso entre etapas (index.html:4551-4565), reordenar etapa por
// arrastar (useDragReorder, ver webapp/src/lib/dnd.ts) e agendamento (dias +
// horário). Fica para depois: peso no boletim, área da roda da vida, hábito,
// nota anexada, meta semanal, modo "a cada N dias".
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { computeSchedule, DAY_LETTERS } from "../lib/schedule";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import { rotinaShareData } from "../lib/backup";
import { downloadFile, slugify } from "../lib/exportFile";
import { GRUPOS_MUSCULARES } from "../lib/constants";
import type { Exercicio, RoutineStep } from "../lib/types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STEP_TYPES = [
  { t: "timer", label: "tempo" },
  { t: "checklist", label: "check" },
  { t: "exercicio", label: "exercício" },
] as const;

/** Porta de abrirEditorExercicio (index.html:4216-4260) — cria ou edita um
 * item da biblioteca; "Excluir" só aparece editando um já existente. */
function ExercicioEditorModal({
  ex,
  onClose,
  onSaved,
}: {
  ex: Exercicio | null;
  onClose: () => void;
  onSaved: (saved: Exercicio | null) => void;
}) {
  const upsertExercicio = useAppStore((s) => s.upsertExercicio);
  const deleteExercicio = useAppStore((s) => s.deleteExercicio);
  const [nome, setNome] = useState(ex?.nome || "");
  const [grupos, setGrupos] = useState<string[]>(ex?.grupos || []);
  const [peso, setPeso] = useState(ex?.pesoAtual || 0);

  function toggleGrupo(g: string) {
    setGrupos((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }
  function salvar() {
    const n = nome.trim();
    if (!n) return;
    const saved = upsertExercicio({ id: ex?.id, nome: n, grupos, pesoAtual: Math.max(0, peso || 0) });
    onSaved(saved);
  }
  function excluir() {
    if (!ex) return;
    deleteExercicio(ex.id);
    onSaved(null);
  }

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box" style={{ textAlign: "left" }}>
        <p style={{ marginBottom: 10 }}>{ex ? "Editar" : "Novo"} exercício</p>
        <div className="section-label" style={{ margin: "6px 0 6px" }}>
          Nome
        </div>
        <input type="text" className="mk-e-name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Supino reto" />
        <div className="section-label" style={{ margin: "12px 0 6px" }}>
          Grupos musculares (opcional)
        </div>
        <div className="meta-areas">
          {GRUPOS_MUSCULARES.map((g) => (
            <span key={g} className={"area-chip" + (grupos.includes(g) ? " sel" : "")} onClick={() => toggleGrupo(g)}>
              {g}
            </span>
          ))}
        </div>
        <div className="section-label" style={{ margin: "12px 0 6px" }}>
          Carga atual (kg)
        </div>
        <input
          className="dur-input"
          style={{ width: 90 }}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={peso}
          onChange={(e) => setPeso(+e.target.value || 0)}
        />
        <div className="confirm-actions" style={{ marginTop: 18 }}>
          {ex && (
            <button className="btn-danger-outline" onClick={excluir}>
              Excluir
            </button>
          )}
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Porta de abrirEscolhaExercicioEtapa (index.html:4109-4162) — lista a
 * biblioteca pra escolher o exercício de uma etapa; "editar" reabre o
 * picker depois de salvar, "+ Novo exercício" já seleciona o criado. */
function ExercicioPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (ex: Exercicio) => void }) {
  const exercicios = useAppStore((s) => s.exercicios);
  const [editorFor, setEditorFor] = useState<{ ex: Exercicio | null } | null>(null);
  const lista = [...exercicios].sort((a, b) => a.nome.localeCompare(b.nome));

  if (editorFor) {
    return (
      <ExercicioEditorModal
        ex={editorFor.ex}
        onClose={() => setEditorFor(null)}
        onSaved={(saved) => {
          setEditorFor(null);
          if (saved) onPick(saved);
        }}
      />
    );
  }

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-box" style={{ textAlign: "left", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ margin: 0 }}>Escolher exercício</p>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="xmark" size={14} />
          </button>
        </div>
        {lista.length ? (
          <div className="qa-idea-list">
            {lista.map((ex) => (
              <div key={ex.id} className="qa-idea-row" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <button
                  style={{ flex: 1, textAlign: "left", background: "none", border: "none", color: "inherit", font: "inherit", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onClick={() => {
                    onClose();
                    onPick(ex);
                  }}
                >
                  <span className="qa-idea-nome">{ex.nome}</span>
                  {ex.grupos.length > 0 && <span style={{ color: "var(--sub)", fontSize: 12 }}> · {ex.grupos.join(", ")}</span>}
                </button>
                <button className="icon-btn" title="Editar" aria-label="Editar" style={{ width: 28, height: 28, flex: "0 0 auto" }} onClick={() => setEditorFor({ ex })}>
                  <Icon name="notes" size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="dev-n" style={{ marginBottom: 10 }}>
            Nenhum exercício cadastrado ainda.
          </div>
        )}
        <button className="tmpl-new qa-idea-nova" onClick={() => setEditorFor({ ex: null })}>
          <span className="tmpl-ic">
            <Icon name="trophy" size={16} />
          </span>
          <span>+ Novo exercício</span>
        </button>
      </div>
    </div>
  );
}

export function RoutineEditor() {
  const draft = useAppStore((s) => s.editorDraft);
  const routines = useAppStore((s) => s.routines);
  const exercicios = useAppStore((s) => s.exercicios);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const cancelEdit = useAppStore((s) => s.cancelEdit);
  const saveDraft = useAppStore((s) => s.saveDraft);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

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
  /** Porta do trecho de troca de tipo (index.html:4491-4498) — "exercicio"
   * ganha sets/reps padrão (3x10) e, sem descanso configurado ainda, puxa o
   * universal da rotina pra 120s (index.html:4194-4197). */
  function setStepType(idx: number, type: RoutineStep["type"]) {
    const s = draft!.steps[idx];
    const patch: Partial<RoutineStep> = { type };
    if (type === "exercicio") {
      if (s.sets == null) patch.sets = 3;
      if (s.reps == null) patch.reps = "10";
      if (!draft!.restSeconds) updateDraft({ restSeconds: 120 });
    }
    patchStep(idx, patch);
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

  async function handleExport() {
    const data = rotinaShareData(draft!);
    const filename = "rotina-" + slugify(draft!.name || "rotina") + ".json";
    await downloadFile(filename, JSON.stringify(data, null, 2), "application/json", "Rotinas");
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
        <button
          className="link-btn"
          title="Exportar"
          aria-label="Exportar"
          onClick={handleExport}
          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Icon name="arrowUpTray" size={14} /> Exportar
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
                {s.type !== "exercicio" && (
                  <input
                    type="text"
                    placeholder="Nome da etapa"
                    value={s.name}
                    onChange={(e) => patchStep(i, { name: e.target.value })}
                  />
                )}
                <div className="step-sub">
                  <div className="type-toggle">
                    {STEP_TYPES.map(({ t, label }) => (
                      <span key={t} className={s.type === t ? "active" : ""} onClick={() => setStepType(i, t)}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                {s.type === "timer" && (
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
                )}
                {s.type === "exercicio" && (
                  <>
                    <div className="step-sub">
                      {s.exercicioId ? (
                        <>
                          <span className="dev-n">{exercicios.find((e) => e.id === s.exercicioId)?.nome || "exercício removido"}</span>
                          <button className="link-btn" style={{ padding: 0 }} onClick={() => setPickerFor(i)}>
                            trocar
                          </button>
                        </>
                      ) : (
                        <button className="link-btn" style={{ padding: 0 }} onClick={() => setPickerFor(i)}>
                          + escolher exercício
                        </button>
                      )}
                    </div>
                    <div className="step-sub">
                      <input
                        className="dur-input"
                        style={{ width: 56 }}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={s.sets || 3}
                        onChange={(e) => patchStep(i, { sets: Math.max(1, +e.target.value || 1) })}
                      />{" "}
                      séries de{" "}
                      <input
                        type="text"
                        style={{ width: 64 }}
                        value={s.reps || "10"}
                        onChange={(e) => patchStep(i, { reps: e.target.value })}
                      />{" "}
                      reps
                    </div>
                  </>
                )}
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

        {/* Porta de index.html:4551-4565 — mesmo valor vale para o descanso
            entre séries dentro de uma etapa de exercício. */}
        <div className="section-label">Descanso entre etapas</div>
        <div className="schedule-box">
          <div className="sched-time-row" style={{ marginTop: 0 }}>
            <input
              className="dur-input"
              style={{ width: 60 }}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.restSeconds || 0}
              onChange={(e) => updateDraft({ restSeconds: Math.max(0, +e.target.value || 0) })}
            />{" "}
            segundos <span style={{ color: "var(--sub)", fontSize: 12.5 }}>(0 = sem descanso)</span>
          </div>
          <div className="dev-n" style={{ marginTop: 5 }}>
            Vale também para o descanso entre séries em etapas de exercício.
          </div>
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

      {pickerFor != null && (
        <ExercicioPickerModal
          onClose={() => setPickerFor(null)}
          onPick={(ex) => {
            const idx = pickerFor;
            setPickerFor(null);
            const s = draft!.steps[idx];
            patchStep(idx, { exercicioId: ex.id, name: s.name.trim() ? s.name : ex.nome });
          }}
        />
      )}
    </div>
  );
}
