// Detalhe da rotina — porta de renderRoutineDetail (index.html:3908-4013),
// redesenhado pelo mockup de 30/09/2026: etiquetas no topo (peso, etapas,
// agenda, área, sequência), etapas em cartões de fundo claro sem borda
// (deslizar para a esquerda exclui a etapa, com desfazer; para a direita abre
// o editor) e rodapé com excluir, editar e Começar. Reordenar etapa continua no
// editor. Sem a variante split do desktop: a lista é uma coluna flex própria.
import { useAppStore } from "../store/useAppStore";
import { temVersaoMinima } from "../lib/player";
import { Icon } from "../components/Icon";
import { StreakTag } from "../components/StreakTag";
import { PausaRotina } from "../features/rotinas/PausaRotina";
import { fmtTime } from "../lib/format";
import { estimadorSerie, routineDurationRaw } from "../lib/routines";
import { computeSchedule, diasChipLabel } from "../lib/schedule";
import { areaDaRotina } from "../lib/scoring";
import { TAG_LABEL } from "../features/metas/constantes";
import { descansoEntreSeries } from "../lib/exercicios";
import { BarraAcoes } from "../ui/BarraAcoes";
import { BarraDetalhe } from "../ui/BarraDetalhe";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Etiqueta } from "../ui/Etiqueta";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Legenda } from "../ui/Legenda";
import { RotuloSecao } from "../ui/RotuloSecao";
import { SwipeItem } from "../ui/SwipeItem";
import { tela } from "../ui/Tela";

export function RoutineDetail() {
  const routines = useAppStore((s) => s.routines);
  const gam = useAppStore((s) => s.gam);
  const history = useAppStore((s) => s.history);
  const exercicios = useAppStore((s) => s.exercicios);
  const goTo = useAppStore((s) => s.goTo);
  const openEditor = useAppStore((s) => s.openEditor);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const deleteRoutineWithUndo = useAppStore((s) => s.deleteRoutineWithUndo);
  const removerEtapa = useAppStore((s) => s.removerEtapaComDesfazer);
  const id = useAppStore((s) => s.view.id);

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
  const areaId = areaDaRotina(r, gam);
  const area = areaId ? gam.config.roda.areas.find((a) => a.id === areaId) : null;

  function excluirRotina() {
    deleteRoutineWithUndo(r!.id);
    goTo({ tab: "home", screen: "home" });
  }

  return (
    <div {...tela({})}>
      <BarraDetalhe onVoltar={() => goTo({ tab: "home", screen: "home" })} titulo={(r.icon ? r.icon + " " : "") + r.name} />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-[110px]">
        {/* etiquetas do topo (mockup de 30/09/2026): peso, etapas, agenda, área, sequência */}
        <div className="flex flex-wrap items-center gap-1.5" data-detalhe="etiquetas">
          <Etiqueta tom="caneta" title="Peso no boletim">
            <Icon name="ticket" size={13} /> {TAG_LABEL[r.tagValor || "medio"]}
          </Etiqueta>
          <Etiqueta tom="caneta" title={dur > 0 ? `Duração: ${fmtTime(dur).replace("+", "")}` : "Etapas"}>
            <Icon name="clipboard" size={13} /> {r.steps.length}
          </Etiqueta>
          {sched && (
            <Etiqueta tom="caneta" title="Agenda">
              <Icon name="calendar" size={13} /> {diasChipLabel(r)}, {sched.startStr} &rarr; {sched.endStr}
            </Etiqueta>
          )}
          {area && (
            <Etiqueta tom="area" cor={area.color} title="Área da roda da vida">
              {area.label}
            </Etiqueta>
          )}
          <StreakTag routineId={r.id} routines={routines} history={history} />
        </div>
        {/* sem horário não há o que pausar, mas arquivar vale para qualquer rotina */}
        <PausaRotina r={r} soArquivar={!sched} />
        <RotuloSecao className="mt-2">Etapas</RotuloSecao>

        {r.steps.length === 0 ? (
          <EstadoVazio className="min-h-[20vh]" texto="Esta rotina não tem etapas." />
        ) : (
          r.steps.map((s, i) => {
            let metaTxt: string;
            let iconName: "clock" | "trophy" | "check" = "check";
            if (s.type === "timer") {
              iconName = "clock";
              metaTxt = minSeg(s.seconds || 0);
            } else if (s.type === "exercicio") {
              iconName = "trophy";
              metaTxt = `${s.sets || 1}x · ${descansoEntreSeries(
                r.restSeconds ?? 120,
                exercicios.find((e) => e.id === s.exercicioId)
              )}s descanso`;
            } else metaTxt = "checklist";
            if (s.journaling) metaTxt += " · anotações";
            if (s.essencial) metaTxt += " · essencial";
            return (
              <SwipeItem
                key={s.id}
                className="flex items-center gap-3.5 rounded-app bg-card-2 px-4 py-3"
                onLeft={() => removerEtapa(r.id, s.id)}
                leftLabel={<Icon name="trash" size={20} />}
                leftAria="Excluir etapa"
                onRight={() => openEditor(r.id)}
                rightLabel={<Icon name="pencil" size={20} />}
                rightAria="Editar etapa"
              >
                <span className="w-5 flex-none text-center font-titulo text-xl font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-titulo text-lg font-bold">{s.name || "sem nome"}</div>
                  <Legenda className="mt-0.5 flex items-center gap-1 text-ink">
                    <Icon name={iconName} size={14} /> {metaTxt}
                  </Legenda>
                </div>
              </SwipeItem>
            );
          })
        )}
      </div>
      <BarraAcoes className="items-center">
        <BotaoIcone rotulo="Excluir rotina" onClick={excluirRotina}>
          <Icon name="trash" size={17} />
        </BotaoIcone>
        <BotaoIcone rotulo="Editar rotina" onClick={() => openEditor(r.id)}>
          <Icon name="pencil" size={17} />
        </BotaoIcone>
        {temVersaoMinima(r) && (
          <Botao
            variante="neutro"
            className="flex-none self-stretch"
            title="Versão mínima: só as etapas essenciais"
            onClick={() => startPlayer(r.id, { minima: true })}
          >
            Mínima
          </Botao>
        )}
        <Botao className="flex-1" disabled={r.steps.length === 0} onClick={() => startPlayer(r.id)}>
          <Icon name="play" size={16} /> Começar
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
  return h > 0 ? `${h} h ${p(m)} m` : `${p(m)} m ${p(seg % 60)} s`;
}
