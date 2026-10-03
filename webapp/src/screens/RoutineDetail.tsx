// Detalhe da rotina — porta de renderRoutineDetail (index.html:3908-4013),
// redesenhado pelos mockups de 30/09 e 02/10/2026: área em pílula cheia no
// topo, etiquetas lilases (etapas + peso, agenda/frequência), etapas em
// cartões de fundo claro sem borda — duração, ícones de anotação e de
// essencial, alça para reordenar ali mesmo; feita hoje, nome riscado com ✓ e
// o tempo real em verde. Deslizar para a esquerda exclui a etapa (com
// desfazer); para a direita abre o editor. Rodapé: excluir, editar, Começar.
// O lápis alterna para o editor, que volta para cá ao salvar/cancelar.
import { useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { temVersaoMinima } from "../lib/player";
import { Icon } from "../components/Icon";
import { StreakTag } from "../components/StreakTag";
import { PausaRotina } from "../features/rotinas/PausaRotina";
import { exportarRotina } from "../features/rotinas/exportarRotina";
import { fmtTime } from "../lib/format";
import { localKey } from "../lib/gamificacao";
import { execucaoDoDia } from "../lib/history";
import { estimadorSerie, proximaVariante, routineDurationRaw } from "../lib/routines";
import { computeSchedule, diasChipLabel, frequenciaLabel } from "../lib/schedule";
import { areaDaRotina } from "../lib/scoring";
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import { TAG_LABEL } from "../features/metas/constantes";
import { descansoEntreSeries } from "../lib/exercicios";
import { cn } from "../lib/cn";
import { AlcaArrasto } from "../ui/AlcaArrasto";
import { BarraAcoes } from "../ui/BarraAcoes";
import { BarraDetalhe } from "../ui/BarraDetalhe";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { EstadoVazio } from "../ui/EstadoVazio";
import { PilulaArea } from "../ui/PilulaArea";
import { RotuloSecao } from "../ui/RotuloSecao";
import { SwipeItem } from "../ui/SwipeItem";
import { tela } from "../ui/Tela";

/** Etiqueta lilás do topo do detalhe (mockup de 02/10/2026): maior que a dos
 *  cartões, cantos de botão. */
const ETIQUETA_TOPO =
  "inline-flex items-center gap-1.5 rounded-app-sm bg-caneta-200 px-2.5 py-1.5 font-sans text-base text-caneta [&_.icon-svg]:shrink-0";

export function RoutineDetail() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const exercicios = useAppStore((s) => s.exercicios);
  const goTo = useAppStore((s) => s.goTo);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const playerSnapshot = useAppStore((s) => s.playerSnapshot);
  const deleteRoutineWithUndo = useAppStore((s) => s.deleteRoutineWithUndo);
  const removerEtapa = useAppStore((s) => s.removerEtapaComDesfazer);
  const reordenarEtapas = useAppStore((s) => s.reordenarEtapas);
  const id = useAppStore((s) => s.view.id);
  const etapaRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { dragFrom, dragOver, dragHandleProps } = useDragReorder((de, para) => {
    if (id) reordenarEtapas(id, de.index, para.index);
  });

  const r = routines.find((x) => x.id === id);

  if (!r) {
    return (
      <div {...tela({})}>
        <BarraDetalhe onVoltar={() => goTo({ tab: "home", screen: "home" })} />
        <EstadoVazio titulo="Rotina não encontrada" />
      </div>
    );
  }

  const serie = estimadorSerie(history);
  const dur = routineDurationRaw(r, serie);
  const sched = computeSchedule(r, serie);
  const freq = frequenciaLabel(r);
  const areaId = areaDaRotina(r, gam);
  const area = areaId ? gam.config.roda.areas.find((a) => a.id === areaId) : null;
  const execHoje = execucaoDoDia(history, r.id, localKey());

  /** Tempo real gasto hoje na etapa (null = não concluída hoje). Exercício
   *  grava uma entrada por série (`<id>-c1`…), somadas aqui. */
  /* Execução desta rotina deixada pela metade: as etapas já concluídas nela
     também saem riscadas (antes só a execução finalizada contava). */
  const emAndamento = playerSnapshot && playerSnapshot.routineId === r.id ? playerSnapshot : null;
  function feitaHoje(stepId: string): number | null {
    const feitas = [
      ...(execHoje?.steps || []),
      ...(emAndamento?.stepActuals.filter((a): a is NonNullable<typeof a> => !!a) || []),
    ];
    const partes = feitas.filter((a) => !a.isRest && !a.skipped && (a.id === stepId || a.id.startsWith(stepId + "-c")));
    if (!partes.length) return null;
    return partes.reduce((t, a) => t + (a.elapsedSec ?? a.actual ?? 0), 0);
  }

  function excluirRotina() {
    deleteRoutineWithUndo(r!.id);
    goTo({ tab: "home", screen: "home" });
  }

  return (
    <div {...tela({})}>
      <BarraDetalhe
        onVoltar={() => goTo({ tab: "home", screen: "home" })}
        titulo={(r.icon ? r.icon + " " : "") + r.name}
      >
        <BotaoIcone rotulo="Exportar rotina" semBorda className="ml-auto text-caneta" onClick={() => exportarRotina(r)}>
          <Icon name="arrowUpTray" size={20} />
        </BotaoIcone>
      </BarraDetalhe>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-[110px]">
        {/* área em pílula cheia na cor dela + sequência */}
        <div className="flex flex-wrap items-center gap-2">
          {area && (
            <PilulaArea cor={area.color} title="Área da roda da vida">
              {area.label}
            </PilulaArea>
          )}
          <StreakTag className="ml-0" routineId={r.id} routines={routines} history={history} />
        </div>
        {/* etiquetas do topo (mockup de 02/10/2026): etapas + peso numa, agenda na outra */}
        <div className="flex flex-wrap items-center gap-2" data-detalhe="etiquetas">
          <span
            className={ETIQUETA_TOPO}
            title={(dur > 0 ? `Duração: ${fmtTime(dur).replace("+", "")} · ` : "") + "peso no boletim"}
          >
            <Icon name="clipboard" size={18} /> {r.steps.length}
            <span className="ml-2 inline-flex">
              <Icon name="ticket" size={18} />
            </span>{" "}
            {TAG_LABEL[r.tagValor || "medio"]}
          </span>
          {sched ? (
            <span className={ETIQUETA_TOPO} title="Agenda">
              <Icon name="calendar" size={18} /> {diasChipLabel(r)}, {sched.startStr} &rarr; {sched.endStr}
            </span>
          ) : (
            freq && (
              <span className={ETIQUETA_TOPO} title="Frequência">
                <Icon name="calendar" size={18} /> {freq}
              </span>
            )
          )}
          {proximaVariante(r, history) && (
            <span
              className={ETIQUETA_TOPO}
              title={`Alterna A/B: a versão B tem ${r.stepsB!.length} etapa${r.stepsB!.length !== 1 ? "s" : ""}`}
            >
              <Icon name="arrowPath" size={18} /> próxima: versão {proximaVariante(r, history)}
            </span>
          )}
        </div>
        {/* sem horário não há o que pausar, mas arquivar vale para qualquer rotina */}
        <PausaRotina r={r} soArquivar={!sched} />
        <RotuloSecao className="mt-2">Etapas</RotuloSecao>

        {r.steps.length === 0 ? (
          <EstadoVazio className="min-h-[20vh]" texto="Esta rotina não tem etapas." />
        ) : (
          r.steps.map((s, i) => {
            const real = feitaHoje(s.id);
            let metaTxt: string;
            if (s.type === "timer") metaTxt = minSeg(s.seconds || 0);
            else if (s.type === "exercicio")
              metaTxt = `${s.sets || 1}x · ${descansoEntreSeries(
                r.restSeconds ?? 120,
                exercicios.find((e) => e.id === s.exercicioId)
              )}s descanso`;
            else metaTxt = "check";
            return (
              <div
                key={s.id}
                ref={(el) => {
                  etapaRefs.current[i] = el;
                }}
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
              >
                <SwipeItem
                  className="flex items-center gap-3.5 rounded-app bg-card-2 py-3 pr-2 pl-4"
                  wrapClassName="rounded-app"
                  onLeft={() => removerEtapa(r.id, s.id)}
                  leftLabel={<Icon name="trash" size={20} />}
                  leftAria="Excluir etapa"
                  onRight={() => openEditor(r.id)}
                  rightLabel={<Icon name="pencil" size={20} />}
                  rightAria="Editar etapa"
                >
                  <span className="w-5 flex-none text-center font-titulo text-xl font-bold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-sans text-lg font-semibold">
                      <span className={cn("truncate", real != null && "text-sub line-through")}>
                        {s.name || "sem nome"}
                      </span>
                      {real != null && (
                        <span className="inline-flex shrink-0 text-ok">
                          <Icon name="check" size={18} />
                        </span>
                      )}
                    </div>
                    {real != null ? (
                      <div className="mt-0.5 font-sans text-md font-semibold text-ok" title="Tempo real hoje">
                        {minSeg(real)}
                      </div>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-2 font-sans text-md text-sub">
                        {metaTxt}
                        {s.journaling && (
                          <span title="Etapa com anotações" className="inline-flex">
                            <Icon name="pencilSquare" size={17} />
                          </span>
                        )}
                        {s.essencial && (
                          <span title="Essencial: entra na versão mínima" className="inline-flex">
                            <Icon name="exclamationCircle" size={17} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <AlcaArrasto
                    className="drag-handle text-ink"
                    {...dragHandleProps({ container: 0, index: i }, (_x, y) => ({
                      container: 0,
                      index: computeStepDragTarget(
                        etapaRefs.current.slice(0, r.steps.length).map((el) => el!.getBoundingClientRect()),
                        i,
                        y
                      ),
                    }))}
                  />
                </SwipeItem>
              </div>
            );
          })
        )}
      </div>
      <BarraAcoes className="items-stretch">
        <BotaoIcone rotulo="Excluir rotina" className="h-auto w-[72px] bg-erro-soft text-erro" onClick={excluirRotina}>
          <Icon name="trash" size={20} />
        </BotaoIcone>
        <BotaoIcone
          rotulo="Editar rotina"
          className="h-auto w-[72px] bg-chip-neutro text-ink"
          onClick={() => openEditor(r.id)}
        >
          <Icon name="pencil" size={20} />
        </BotaoIcone>
        {temVersaoMinima(r) && (
          <Botao
            variante="neutro"
            className="flex-none"
            title="Versão mínima: só as etapas essenciais"
            onClick={() => startPlayer(r.id, { minima: true })}
          >
            Mínima
          </Botao>
        )}
        <Botao className="flex-1" disabled={r.steps.length === 0} onClick={() => startPlayer(r.id)}>
          <Icon name="play" size={16} /> {emAndamento && !emAndamento.minima ? "Continuar" : "Começar"}
        </Botao>
      </BarraAcoes>
    </div>
  );
}

/** "02 m 00 s" (mockup de 30/09/2026); com hora, "1 h 05 m". */
function minSeg(seg: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${p(m)} m` : `${p(m)} m ${p(Math.round(seg % 60))} s`;
}
