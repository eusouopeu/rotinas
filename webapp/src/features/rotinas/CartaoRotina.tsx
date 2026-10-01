// Cartão de rotina da visão Lista (mockup de 30/09/2026): faixa da área à
// esquerda, horário pequeno em cima, nome + sequência, etapas e etiquetas
// (dias, pausa, hábito) embaixo; play grande em degradê abraçado pela ponta
// arredondada. `expandido` vira um quadrado de meia largura (grade de 2). Já feita hoje: título riscado,
// faixa esmaecida, horário real em verde e selo de streak cheio.
import { Icon } from "../../components/Icon";
import { StreakTag } from "../../components/StreakTag";
import { fmtTime } from "../../lib/format";
import { localKey } from "../../lib/gamificacao";
import { estimadorSerie, routineDurationRaw } from "../../lib/routines";
import { computeSchedule, diasChipLabel, formatHM, pausaAtualOuFutura } from "../../lib/schedule";
import { ddmm } from "./PausaRotina";
import { corDaRotina, fillStyle, rotinaEhHabito } from "../../lib/scoring";
import { execucaoDoDia, execucaoMinutos, type HistoryEntry } from "../../lib/history";
import type { GamificacaoState, Routine } from "../../lib/types";
import { cn } from "../../lib/cn";
import { BotaoPlay } from "../../ui/BotaoPlay";
import { CartaoInfo, CartaoTitulo } from "../../ui/CartaoLista";
import { Etiqueta } from "../../ui/Etiqueta";
import { Fato, Fatos } from "../../ui/Fatos";
import { CARTAO_CAPSULA, FaixaCor } from "../../ui/PontoCor";
import { SwipeItem } from "../../ui/SwipeItem";

type Props = {
  r: Routine;
  routines: Routine[];
  gam: GamificacaoState;
  history: HistoryEntry[];
  hojeISO: string;
  expandido: boolean;
  onExcluir: () => void;
  onDuplicar: () => void;
  onAbrir: () => void;
  onIniciar: () => void;
};

export function CartaoRotina({
  r,
  routines,
  gam,
  history,
  hojeISO,
  expandido,
  onExcluir,
  onDuplicar,
  onAbrir,
  onIniciar,
}: Props) {
  const serie = estimadorSerie(history);
  const dur = routineDurationRaw(r, serie);
  const sched = computeSchedule(r, serie);
  const pausa = pausaAtualOuFutura(r);
  const execHoje = execucaoDoDia(history, r.id, hojeISO);
  const execMin = execHoje ? execucaoMinutos(execHoje) : null;

  const pausaTxt = r.arquivada
    ? "arquivada"
    : pausa
      ? pausa.de > localKey()
        ? `pausa a partir de ${ddmm(pausa.de)}`
        : `pausada até ${ddmm(pausa.ate)}`
      : null;

  // linha de cima (mockup de 30/09/2026): o horário, pequeno e em negrito,
  // acima do nome; feita hoje, o horário real em verde com check; sem horário,
  // a duração.
  const topo = execMin ? (
    <span className="text-ok" title="Executada hoje">
      <Icon name="check" size={13} /> {formatHM(execMin.ini)} &rarr; {formatHM(execMin.fim)}
    </span>
  ) : sched ? (
    <span title="Horário">
      {sched.startStr} &rarr; {sched.endStr}
    </span>
  ) : dur > 0 ? (
    <span title="Duração">
      <Icon name="clock" size={13} /> {fmtTime(dur).replace("+", "")}
    </span>
  ) : null;

  const etiquetas = (
    <>
      {sched && (
        <Etiqueta title="Dias">
          <Icon name="calendar" size={13} /> {diasChipLabel(r)}
        </Etiqueta>
      )}
      {pausaTxt && (
        <Etiqueta title={r.arquivada ? "Rotina arquivada" : "Só esta rotina está pausada"}>
          <Icon name="pause" size={13} /> {pausaTxt}
        </Etiqueta>
      )}
      {rotinaEhHabito(r, gam) && (
        <Etiqueta
          tom="area"
          cor="var(--ok)"
          className="text-ok"
          title={`Hábito consolidado: vale ${Math.round((gam.config.habito.fator || 0.6) * 100)}% do peso, para abrir espaço ao que ainda não pegou`}
        >
          hábito
        </Etiqueta>
      )}
    </>
  );
  const etapas = (
    <Fato title={`${r.steps.length} etapa${r.steps.length !== 1 ? "s" : ""}`}>
      <Icon name="clipboard" size={15} /> {r.steps.length}
    </Fato>
  );
  // feita hoje: só o NOME vai riscado e esmaecido — o selo de sequência fica
  // inteiro (o título é flex, e o riscado do pai atravessaria o selo)
  const titulo = (
    <>
      <span className={cn(execHoje && "text-sub line-through")}>
        {r.icon ? r.icon + " " : ""}
        {r.name}
      </span>
      <StreakTag routineId={r.id} routines={routines} history={history} feitaHoje={!!execHoje} />
    </>
  );

  // expandido (30/09/2026): quadrado de meia largura, informações empilhadas
  // e o play no canto de baixo, ao lado das etapas
  if (expandido)
    return (
      <SwipeItem
        onLeft={onExcluir}
        onRight={onDuplicar}
        className="relative flex aspect-square flex-col overflow-hidden rounded-app bg-card-2 py-3 pr-3 pl-[18px] transition-transform duration-[140ms] active:scale-[0.985]"
      >
        <FaixaCor cor={fillStyle(corDaRotina(r, gam))} esmaecido={!!execHoje} />
        <div className="min-h-0 flex-1 cursor-pointer" onClick={onAbrir}>
          {topo && (
            <div className="mb-1 flex items-center gap-1 font-sans text-sm font-semibold text-ink [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
              {topo}
            </div>
          )}
          <CartaoTitulo
            className={cn(
              "mb-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-lg leading-tight font-bold [&>span]:ml-0"
            )}
          >
            {titulo}
          </CartaoTitulo>
          <div className="flex flex-col items-start gap-1">{etiquetas}</div>
        </div>
        <div className="mt-2 flex items-center justify-between font-sans text-md text-ink">
          {etapas}
          <BotaoPlay rotulo="Iniciar rotina" disabled={r.steps.length === 0} onClick={onIniciar} />
        </div>
      </SwipeItem>
    );

  return (
    <SwipeItem
      onLeft={onExcluir}
      onRight={onDuplicar}
      className={cn(CARTAO_CAPSULA, "rounded-r-[44px]")}
      wrapClassName="rounded-r-[44px]"
    >
      <FaixaCor cor={fillStyle(corDaRotina(r, gam))} esmaecido={!!execHoje} />
      <CartaoInfo className="cursor-pointer" onClick={onAbrir}>
        {topo && (
          <div className="mb-1 flex items-center gap-1 font-sans text-sm font-semibold text-ink [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
            {topo}
          </div>
        )}
        <CartaoTitulo
          className={cn(
            "mb-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[19px] font-bold"
          )}
        >
          {titulo}
        </CartaoTitulo>
        {/* etapas + etiquetas (dias, pausa, hábito). A área é a faixa da esquerda. */}
        <Fatos className="gap-x-2.5 gap-y-1.5 text-md text-ink">
          {etapas}
          {etiquetas}
        </Fatos>
      </CartaoInfo>
      <BotaoPlay rotulo="Iniciar rotina" grande disabled={r.steps.length === 0} onClick={onIniciar} />
    </SwipeItem>
  );
}
