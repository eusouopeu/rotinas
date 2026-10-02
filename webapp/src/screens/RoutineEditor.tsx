// Porta parcial de renderEditor (index.html:4315-4740). Cobre nome, etapas
// tipo "tempo" e "exercicio" (biblioteca de exercícios — picker/editor em
// features/editor/, porta de abrirEscolhaExercicioEtapa/abrirEditorExercicio,
// index.html:4109-4162) e "checklist" (sem campos extra — mesmo fallback
// genérico do Player), descanso entre etapas (index.html:4551-4565), reordenar
// etapa por arrastar (useDragReorder, ver webapp/src/lib/dnd.ts), agendamento
// (dias + horário), peso no boletim, área da roda da vida e, por etapa,
// anotações (journaling) e "essencial" (versão mínima). Fica para depois:
// hábito, nota anexada, modo "a cada N dias".
//
// Layout dos mockups de 02/10/2026: mesmo topo do detalhe (voltar, nome
// editável no lugar do título, exportar); um cartão de ajustes com área,
// peso, pausa e agendamento (Nenhum / Frequência "N vezes por dia/semana/
// mês" / Horário); etapas em cartões — tipo, m/s, botões de anotação e de
// essencial, alça de arrasto, deslizar para a esquerda exclui; rodapé com
// lixeira e Salvar.
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { ExercicioPickerModal } from "../features/editor/ExercicioPicker";
import { BotaoEscolha, CampoExercicio } from "../features/editor/pecas";
import { computeSchedule, DAY_LETTERS } from "../lib/schedule";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import { exportarRotina } from "../features/rotinas/exportarRotina";
import type { Routine, RoutineStep, Tag } from "../lib/types";
import { cn } from "../lib/cn";
import { AlcaArrasto } from "../ui/AlcaArrasto";
import { BarraAcoes } from "../ui/BarraAcoes";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { CampoDuracao } from "../ui/CampoDuracao";
import { ChipsDia } from "../ui/ChipsDia";
import { RotuloSecao } from "../ui/RotuloSecao";
import { PilulaArea } from "../ui/PilulaArea";
import { Toggle } from "../ui/Segmentado";
import { SwipeItem } from "../ui/SwipeItem";
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
  { key: "start", label: "Início" },
  { key: "end", label: "Término" },
] as const;

const AGENDAMENTOS = [
  { key: "nenhum", label: "Nenhum" },
  { key: "frequencia", label: "Frequência" },
  { key: "horario", label: "Horário" },
] as const;

const POR = [
  { key: "dia", label: "dia" },
  { key: "semana", label: "semana" },
  { key: "mes", label: "mês" },
] as const;

type Frequencia = NonNullable<Routine["frequencia"]>;

/** Frequência em vigor no rascunho: a própria, ou a meta semanal antiga
 *  (weeklyGoalTimes) de rotina sem horário. */
function frequenciaDe(r: Routine): Frequencia | null {
  if (r.frequencia) return r.frequencia;
  if (!r.schedule?.enabled && (r.weeklyGoalTimes || 0) > 0) return { vezes: r.weeklyGoalTimes!, por: "semana" };
  return null;
}

/** Linha do cartão de ajustes: rótulo em caixa alta à esquerda, controle à direita. */
function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="font-sans text-base text-ink uppercase">{rotulo}</span>
      <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** Campo branco dos ajustes (pausa, horário, frequência). */
const CAMPO_BRANCO =
  "rounded-app-sm border-0 bg-card px-3 py-2 text-center font-sans text-lg text-ink outline-none focus:ring-2 focus:ring-caneta-300";

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

  const freq = frequenciaDe(draft);
  const modoAgenda = schedule.enabled ? "horario" : freq ? "frequencia" : "nenhum";
  /** Frequência nova (ou null): "por semana" espelha em weeklyGoalTimes, que
   *  já alimenta a meta semanal das Estatísticas. */
  function setFrequencia(f: Frequencia | null) {
    updateDraft({ frequencia: f, weeklyGoalTimes: f?.por === "semana" ? f.vezes : undefined });
  }
  function setModoAgenda(m: (typeof AGENDAMENTOS)[number]["key"]) {
    if (m === "horario") {
      setFrequencia(null);
      updateDraft({ schedule: { ...schedule, enabled: true } });
    } else {
      updateDraft({ schedule: { ...schedule, enabled: false } });
      setFrequencia(m === "frequencia" ? freq || { vezes: 3, por: "semana" } : null);
    }
  }
  const areas = gam.config.roda.areas;
  const areaSel = areas.find((a) => a.id === draft.eixo);

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
      {/* mesmo topo do detalhe: voltar (descarta o rascunho), nome editável, exportar */}
      <div className="mb-3 -ml-2 flex min-h-11 items-center gap-1.5">
        <BotaoIcone rotulo="Voltar sem salvar" semBorda onClick={cancelEdit}>
          <Icon name="chevronLeft" size={18} />
        </BotaoIcone>
        <input
          type="text"
          className="min-w-0 flex-1 border-0 border-b-2 border-transparent bg-transparent p-0 font-titulo text-[24px] font-bold text-ink focus:border-caneta focus:outline-none"
          placeholder="Nome da rotina"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
        />
        <BotaoIcone rotulo="Exportar rotina" semBorda className="text-caneta" onClick={() => exportarRotina(draft)}>
          <Icon name="arrowUpTray" size={20} />
        </BotaoIcone>
      </div>

      <div className="flex-1 overflow-y-auto pb-[230px]" data-rolagem>
        {/* Cartão de ajustes. Peso no boletim = multiplicador da pontuação; área
            da roda = com quem a rotina divide os pontos da semana (aparece mesmo
            com a roda desligada, igual ao legado: continua classificando). */}
        <div className="flex flex-col gap-3 rounded-app bg-card-2 p-4">
          {areas.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-sans text-base text-ink uppercase">Área:</span>
              {/* select nativo invisível sobre o campo: no Android o menu é do
                  sistema; o campo mostra só a área escolhida, em pílula cheia */}
              <label className="relative flex min-h-10 min-w-0 flex-1 items-center rounded-app-sm bg-card px-2">
                {areaSel ? (
                  <PilulaArea cor={areaSel.color}>{areaSel.label}</PilulaArea>
                ) : (
                  <span className="px-1 font-sans text-base text-sub">sem área</span>
                )}
                <select
                  aria-label="Área da roda da vida"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={draft.eixo || ""}
                  onChange={(e) => updateDraft({ eixo: e.target.value || null })}
                >
                  <option value="">sem área</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <Linha rotulo="Peso no boletim">
            <Toggle
              grande
              options={[...PESOS]}
              active={draft.tagValor || "medio"}
              onSelect={(v: Tag) => updateDraft({ tagValor: v })}
            />
          </Linha>
          {/* mesmo valor vale para o descanso entre séries de exercício (index.html:4551-4565) */}
          <Linha rotulo="Pausa entre etapas">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              aria-label="Pausa entre etapas, em segundos"
              className={cn(CAMPO_BRANCO, "w-[72px]")}
              value={draft.restSeconds || 0}
              onChange={(e) => updateDraft({ restSeconds: Math.max(0, +e.target.value || 0) })}
            />
            <span className="font-sans text-lg text-ink">s</span>
          </Linha>
          <Linha rotulo="Agendamento">
            <Toggle grande options={[...AGENDAMENTOS]} active={modoAgenda} onSelect={setModoAgenda} />
          </Linha>
          {modoAgenda === "horario" && (
            <>
              <div className="flex items-center gap-2">
                <Toggle
                  grande
                  className="shrink-0"
                  options={[...ANCORAS]}
                  active={schedule.anchor}
                  onSelect={(anchor) => updateDraft({ schedule: { ...schedule, anchor } })}
                />
                <input
                  type="time"
                  aria-label={schedule.anchor === "start" ? "Horário de início" : "Horário de término"}
                  className={cn(CAMPO_BRANCO, "w-0 min-w-0 flex-1 px-1")}
                  value={schedule.time}
                  onChange={(e) => updateDraft({ schedule: { ...schedule, time: e.target.value } })}
                />
                <span className="font-sans text-lg text-ink">&rarr;</span>
                <span className="shrink-0 font-sans text-lg text-ink" title="Calculado pela duração">
                  {sched ? (schedule.anchor === "start" ? sched.endStr : sched.startStr) : "--:--"}
                </span>
              </div>
              <ChipsDia rotulos={DAY_LETTERS} ativos={schedule.days} onToggle={toggleDia} />
            </>
          )}
          {modoAgenda === "frequencia" && freq && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                aria-label="Quantas vezes"
                className={cn(CAMPO_BRANCO, "w-14 shrink-0")}
                value={freq.vezes}
                onChange={(e) => setFrequencia({ ...freq, vezes: Math.max(1, +e.target.value || 1) })}
              />
              <span className="font-sans text-lg whitespace-nowrap text-ink">vezes por</span>
              <Toggle
                className="ml-auto"
                grande
                options={[...POR]}
                active={freq.por}
                onSelect={(por) => setFrequencia({ ...freq, por })}
              />
            </div>
          )}
        </div>

        {/* etapas por último (pedido do Pedro, 30/09/2026): ajustes vêm antes */}
        <RotuloSecao className="mt-6">Etapas</RotuloSecao>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {draft.steps.map((s, i) => (
            <div
              className={cn(
                "rounded-app",
                dragFrom?.index === i && "opacity-45",
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
              <SwipeItem
                onLeft={() => removeStep(i)}
                leftLabel={<Icon name="trash" size={20} />}
                leftAria="Excluir etapa"
                wrapClassName="rounded-app"
                className="flex items-center gap-3 rounded-app bg-card-2 py-3.5 pr-2 pl-4"
              >
                <div className="w-5 shrink-0 text-center font-titulo text-xl font-bold">{i + 1}</div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {s.type !== "exercicio" && (
                    <input
                      type="text"
                      className="w-full border-0 bg-transparent p-0 font-sans text-xl font-semibold text-ink focus:outline-none"
                      placeholder="Nome da etapa"
                      value={s.name}
                      onChange={(e) => patchStep(i, { name: e.target.value })}
                    />
                  )}
                  <Toggle
                    grande
                    className="self-start"
                    options={[...STEP_TYPES]}
                    active={s.type as (typeof STEP_TYPES)[number]["key"]}
                    onSelect={(t) => setStepType(i, t)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {s.type === "timer" && (
                      <>
                        <CampoDuracao
                          unidade="m"
                          min={0}
                          className="border-0"
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
                          className="border-0"
                          value={(s.seconds || 0) % 60}
                          onChange={(e) => {
                            const mins = Math.floor((s.seconds || 0) / 60);
                            const secs = Math.min(59, Math.max(0, +e.target.value || 0));
                            patchStep(i, { seconds: Math.max(5, mins * 60 + secs) });
                          }}
                        />
                      </>
                    )}
                    {/* anotações (texto livre no player, legado index.html:4462) e
                      essencial (entra na versão mínima da rotina): botões-ícone
                      que ficam lilases quando ligados */}
                    <BotaoIcone
                      tamanho="sm"
                      role="switch"
                      aria-checked={!!s.journaling}
                      rotulo="Anotações: campo de texto livre nesta etapa (vira nota em Modelos › Anotações de Rotinas)"
                      className={cn(s.journaling ? "bg-caneta-300 text-caneta" : "bg-chip-neutro text-ink")}
                      onClick={() => patchStep(i, { journaling: !s.journaling })}
                    >
                      <Icon name="pencilSquare" size={18} />
                    </BotaoIcone>
                    <BotaoIcone
                      tamanho="sm"
                      role="switch"
                      aria-checked={!!s.essencial}
                      rotulo="Essencial: entra na versão mínima da rotina (dias de pouca energia)"
                      className={cn(s.essencial ? "bg-caneta-300 text-caneta" : "bg-chip-neutro text-ink")}
                      onClick={() => patchStep(i, { essencial: !s.essencial })}
                    >
                      <Icon name="exclamationCircle" size={18} />
                    </BotaoIcone>
                  </div>
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
                <AlcaArrasto
                  className="drag-handle self-center text-ink"
                  {...dragHandleProps({ container: 0, index: i }, (_x, y) => ({
                    container: 0,
                    index: computeStepDragTarget(
                      stepRefs.current.slice(0, draft.steps.length).map((el) => el!.getBoundingClientRect()),
                      i,
                      y
                    ),
                  }))}
                />
              </SwipeItem>
            </div>
          ))}
          <button
            className="mt-1 rounded-lg border border-dashed border-line bg-transparent p-4 text-center text-base text-sub"
            onClick={addStep}
          >
            + adicionar etapa
          </button>
        </div>
      </div>

      <BarraAcoes className="items-stretch">
        {!isNew && (
          <BotaoIcone rotulo="Excluir rotina" className="h-auto w-[30%] bg-erro-soft text-erro" onClick={handleDelete}>
            <Icon name="trash" size={20} />
          </BotaoIcone>
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
