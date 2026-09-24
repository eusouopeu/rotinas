// Porta parcial de renderEditor (index.html:4315-4740). Cobre nome, etapas
// tipo "tempo" e "exercicio" (biblioteca de exercícios — picker/editor em
// features/editor/, porta de abrirEscolhaExercicioEtapa/abrirEditorExercicio,
// index.html:4109-4162) e "checklist" (sem campos extra — mesmo fallback
// genérico do Player), descanso entre etapas (index.html:4551-4565), reordenar
// etapa por arrastar (useDragReorder, ver webapp/src/lib/dnd.ts), agendamento
// (dias + horário), peso no boletim e área da roda da vida. Fica para depois:
// hábito, nota anexada, meta semanal, modo "a cada N dias".
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { ExercicioPickerModal } from "../features/editor/ExercicioPicker";
import { BotaoEscolha, CampoExercicio } from "../features/editor/pecas";
import { computeSchedule, DAY_LETTERS } from "../lib/schedule";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import { rotinaShareData } from "../lib/backup";
import { downloadFile, slugify } from "../lib/exportFile";
import type { RoutineStep, Tag } from "../lib/types";
import { cn } from "../lib/cn";
import { AlcaArrasto } from "../ui/AlcaArrasto";
import { BarraAcoes } from "../ui/BarraAcoes";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { BotaoLink } from "../ui/BotaoLink";
import { Campo } from "../ui/Campo";
import { CampoDuracao } from "../ui/CampoDuracao";
import { CampoNome } from "../ui/CampoNome";
import { Cartao } from "../ui/Cartao";
import { ChipsDia } from "../ui/ChipsDia";
import { Chip } from "../ui/Chip";
import { RotuloSecao } from "../ui/RotuloSecao";
import { Toggle } from "../ui/Segmentado";
import { Switch } from "../ui/Switch";
import { tela } from "../ui/Tela";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STEP_TYPES = [
  { key: "timer", label: "tempo" },
  { key: "checklist", label: "check" },
  { key: "exercicio", label: "exercício" },
] as const;

const PESOS = [
  { key: "baixo", label: "Baixo" },
  { key: "medio", label: "Médio" },
  { key: "alto", label: "Alto" },
] as const;

const ANCORAS = [
  { key: "start", label: "início" },
  { key: "end", label: "término" },
] as const;

export function RoutineEditor() {
  const draft = useAppStore((s) => s.editorDraft);
  const routines = useAppStore((s) => s.routines);
  const exercicios = useAppStore((s) => s.exercicios);
  const gam = useAppStore((s) => s.gam);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const upsertExercicio = useAppStore((s) => s.upsertExercicio);
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
    <div {...tela({ larga: true })}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <BotaoLink tom="suave" onClick={cancelEdit}>
          Cancelar
        </BotaoLink>
        <BotaoLink
          className="inline-flex items-center gap-[5px]"
          title="Exportar"
          aria-label="Exportar"
          onClick={handleExport}
        >
          <Icon name="arrowUpTray" size={14} /> Exportar
        </BotaoLink>
      </div>

      <div className="flex-1 overflow-y-auto pb-[230px]" data-rolagem>
        <CampoNome
          placeholder="Nome da rotina"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
        />

        {/* Porta de renderEditor > tagRow/areaRow (index.html:4341-4374): peso
            no boletim (multiplicador da pontuação) e área da roda da vida (com
            quem a rotina divide os pontos da semana). Mesmas pílulas do
            lançamento rápido da Home, para não desenhar um seletor novo. */}
        <div className="mt-0.5 mb-2.5 flex flex-wrap items-center gap-2.5">
          <span className="text-md text-sub">peso no boletim:</span>
          <Toggle
            quebra
            options={[...PESOS]}
            active={draft.tagValor || "medio"}
            onSelect={(v: Tag) => updateDraft({ tagValor: v })}
          />
        </div>

        {/* a área aparece mesmo com a roda desligada (igual ao legado): ela
            continua classificando a rotina, só não divide fatia da semana */}
        {gam.config.roda.areas.length > 0 && (
          <div className="mb-3">
            <span className="text-md text-sub">área:</span>
            <div className="mt-1.5 flex flex-1 flex-wrap gap-1.5">
              <Chip ativo={!draft.eixo} cor="var(--sub)" onClick={() => updateDraft({ eixo: null })}>
                sem área
              </Chip>
              {gam.config.roda.areas.map((a) => (
                <Chip key={a.id} ativo={draft.eixo === a.id} cor={a.color} onClick={() => updateDraft({ eixo: a.id })}>
                  {a.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <RotuloSecao>Etapas</RotuloSecao>
        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {draft.steps.map((s, i) => (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border-[1.5px] border-line bg-card p-3.5",
                dragFrom?.index === i && "border-caneta opacity-45",
                dragOver &&
                  dragFrom &&
                  dragOver.index === i &&
                  dragOver.index !== dragFrom.index &&
                  (dragOver.index < dragFrom.index
                    ? "shadow-[0_-3px_0_0_var(--caneta)]"
                    : "shadow-[0_3px_0_0_var(--caneta)]")
              )}
              data-etapa
              key={s.id}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <AlcaArrasto
                {...dragHandleProps({ container: 0, index: i }, (_x, y) => ({
                  container: 0,
                  index: computeStepDragTarget(
                    stepRefs.current.map((el) => el!.getBoundingClientRect()),
                    i,
                    y
                  ),
                }))}
              />
              <div className="w-[22px] shrink-0 pt-0.5 font-sans text-sm text-sub">{i + 1}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {s.type !== "exercicio" && (
                  <input
                    type="text"
                    className="w-full border-0 bg-transparent p-0 font-sans text-xl text-ink focus:outline-none"
                    placeholder="Nome da etapa"
                    value={s.name}
                    onChange={(e) => patchStep(i, { name: e.target.value })}
                  />
                )}
                <div className="flex flex-wrap items-center gap-2.5">
                  <Toggle
                    options={[...STEP_TYPES]}
                    active={s.type as (typeof STEP_TYPES)[number]["key"]}
                    onSelect={(t) => setStepType(i, t)}
                  />
                </div>
                {s.type === "timer" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <CampoDuracao
                      unidade="m"
                      min={0}
                      value={Math.floor((s.seconds || 0) / 60)}
                      onChange={(e) => {
                        const mins = Math.max(0, +e.target.value || 0);
                        const secs = (s.seconds || 0) % 60;
                        patchStep(i, { seconds: Math.max(5, mins * 60 + secs) });
                      }}
                    />
                    <CampoDuracao
                      unidade="s"
                      min={0}
                      max={59}
                      value={(s.seconds || 0) % 60}
                      onChange={(e) => {
                        const mins = Math.floor((s.seconds || 0) / 60);
                        const secs = Math.min(59, Math.max(0, +e.target.value || 0));
                        patchStep(i, { seconds: Math.max(5, mins * 60 + secs) });
                      }}
                    />
                  </div>
                )}
                {s.type === "exercicio" && (
                  <>
                    {/* exercício escolhido como chip clicável (troca ao tocar) */}
                    <BotaoEscolha escolhido={!!s.exercicioId} onClick={() => setPickerFor(i)}>
                      {s.exercicioId
                        ? exercicios.find((e) => e.id === s.exercicioId)?.nome || "exercício removido"
                        : "escolher exercício"}
                    </BotaoEscolha>
                    {/* séries · reps · peso numa grade de 3 campos com ícone e unidade */}
                    <div className="mt-2 grid w-full grid-cols-3 gap-1.5">
                      <CampoExercicio
                        icone="arrowPath"
                        unidade="séries"
                        titulo="Séries"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        aria-label="Séries"
                        value={s.sets || 3}
                        onChange={(e) => patchStep(i, { sets: Math.max(1, +e.target.value || 1) })}
                      />
                      <CampoExercicio
                        icone="hashtag"
                        unidade="reps"
                        titulo="Repetições (ex.: 10 ou 8-12)"
                        type="text"
                        inputMode="numeric"
                        aria-label="Repetições"
                        value={s.reps || "10"}
                        onChange={(e) => patchStep(i, { reps: e.target.value })}
                      />
                      {/* o peso mora na biblioteca (Exercicio.pesoAtual), não na
                          etapa: editar aqui é um atalho para o mesmo campo que o
                          player atualiza ao concluir a série. Sem exercício
                          escolhido não há onde guardar — campo desabilitado. */}
                      <CampoExercicio
                        icone="scale"
                        unidade="kg"
                        titulo={s.exercicioId ? "Peso atual" : "Escolha um exercício para definir o peso"}
                        desligado={!s.exercicioId}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        aria-label="Peso atual do exercício"
                        disabled={!s.exercicioId}
                        value={s.exercicioId ? (exercicios.find((e) => e.id === s.exercicioId)?.pesoAtual ?? 0) : ""}
                        placeholder="–"
                        onChange={(e) => {
                          const ex = exercicios.find((x) => x.id === s.exercicioId);
                          if (!ex) return;
                          upsertExercicio({ ...ex, pesoAtual: Math.max(0, +e.target.value || 0) });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center self-center">
                <BotaoIcone rotulo="Excluir etapa" semBorda onClick={() => removeStep(i)}>
                  <Icon name="trash" size={15} />
                </BotaoIcone>
              </div>
            </div>
          ))}
          <button
            className="mt-1 rounded-lg border-[1.5px] border-dashed border-line bg-transparent p-4 text-center text-base text-sub"
            onClick={addStep}
          >
            + adicionar etapa
          </button>
        </div>

        {/* Porta de index.html:4551-4565 — mesmo valor vale para o descanso
            entre séries dentro de uma etapa de exercício. */}
        <RotuloSecao>Descanso entre etapas</RotuloSecao>
        <Cartao raio="lg">
          <div className="flex items-center gap-3">
            <CampoDuracao
              unidade="s"
              min={0}
              value={draft.restSeconds || 0}
              onChange={(e) => updateDraft({ restSeconds: Math.max(0, +e.target.value || 0) })}
            />
          </div>
        </Cartao>

        <RotuloSecao>Agendamento</RotuloSecao>
        <Cartao raio="lg">
          <Switch
            checked={schedule.enabled}
            onChange={(enabled) => updateDraft({ schedule: { ...schedule, enabled } })}
          >
            Ativar horário
          </Switch>
          {schedule.enabled && (
            <div>
              <div className="mt-3.5 flex items-center gap-3">
                <Toggle
                  options={[...ANCORAS]}
                  active={schedule.anchor}
                  onSelect={(anchor) => updateDraft({ schedule: { ...schedule, anchor } })}
                />
                <Campo
                  type="time"
                  value={schedule.time}
                  onChange={(e) => updateDraft({ schedule: { ...schedule, time: e.target.value } })}
                />
              </div>
              <ChipsDia className="mt-2.5" rotulos={DAY_LETTERS} ativos={schedule.days} onToggle={toggleDia} />
              <div className="mt-3 font-sans text-md text-sub">
                {sched ? `${sched.startStr} → ${sched.endStr}` : "Defina um horário."}
              </div>
            </div>
          )}
        </Cartao>
      </div>

      <BarraAcoes>
        {!isNew && (
          <Botao variante="perigo" className="flex-[0_0_37%]" onClick={handleDelete}>
            Excluir
          </Botao>
        )}
        <Botao className="flex-1" onClick={handleSave}>
          Salvar
        </Botao>
      </BarraAcoes>

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
