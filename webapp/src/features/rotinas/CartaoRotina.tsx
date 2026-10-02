// Cartão de rotina da visão Lista (mockups de 30/09 e 02/10/2026): faixa da
// área à esquerda, horário + sequência em cima, nome, e numa linha só os dias,
// as etapas e o xp; play grande abraçado pela ponta arredondada. `expandido`
// vira um cartão de meia largura (grade de 2) com a faixa no topo, a sequência
// com as execuções ("3 – 2x") e o play no canto de baixo, que é arredondado
// em volta dele. Já feita hoje: nome riscado, faixa esmaecida, horário real em
// verde e selo de streak cheio.
import { Icon } from "../../components/Icon";
import { StreakTag } from "../../components/StreakTag";
import { fmtTime, fmtXp } from "../../lib/format";
import { localKey } from "../../lib/gamificacao";
import { estimadorSerie, routineDurationRaw } from "../../lib/routines";
import { computeSchedule, diasChipLabel, formatHM, frequenciaLabel, pausaAtualOuFutura } from "../../lib/schedule";
import { ddmm } from "./PausaRotina";
import { corDaRotina, fillStyle, pontosPorExecucao, rotinaEhHabito } from "../../lib/scoring";
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

  // linha de cima: o horário, pequeno e em negrito, e o selo de sequência;
  // feita hoje, o horário real em verde com check; sem horário, a duração.
  const horario = execMin ? (
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
  const topo = (
    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-sm font-semibold text-ink [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1">
      {horario}
      <StreakTag
        className="ml-0"
        routineId={r.id}
        routines={routines}
        history={history}
        feitaHoje={!!execHoje}
        soDias={!expandido}
      />
    </div>
  );

  const freq = frequenciaLabel(r);
  const etiquetas = (
    <>
      {sched ? (
        <Etiqueta title="Dias">
          <Icon name="calendar" size={13} /> {diasChipLabel(r)}
        </Etiqueta>
      ) : (
        freq && (
          <Etiqueta title="Frequência">
            <Icon name="calendar" size={13} /> {freq}
          </Etiqueta>
        )
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
  const xp = pontosPorExecucao(r, gam);
  const fatos = (
    <>
      <Fato title={`${r.steps.length} etapa${r.steps.length !== 1 ? "s" : ""}`}>
        <Icon name="clipboard" size={15} /> <b className="font-semibold">{r.steps.length}</b>
      </Fato>
      {xp > 0 && (
        <Fato destaque title="Pontos que uma execução completa rende nesta semana">
          <Icon name="ticket" size={15} /> {fmtXp(xp)} xp
        </Fato>
      )}
    </>
  );
  // feita hoje: só o NOME vai riscado e esmaecido
  const titulo = (
    <span className={cn(execHoje && "text-sub line-through")}>
      {r.icon ? r.icon + " " : ""}
      {r.name}
    </span>
  );

  // expandido (02/10/2026): meia largura, faixa da área no topo, informações
  // empilhadas e o play no canto de baixo, arredondado em volta dele
  if (expandido)
    return (
      <SwipeItem
        onLeft={onExcluir}
        onRight={onDuplicar}
        className="relative flex h-full flex-col overflow-hidden rounded-app rounded-br-[44px] bg-card-2 pt-[15px] pr-2 pb-2 pl-3 transition-transform duration-[140ms] active:scale-[0.985]"
        wrapClassName="rounded-br-[44px]"
      >
        <FaixaCor topo cor={fillStyle(corDaRotina(r, gam))} esmaecido={!!execHoje} />
        <div className="min-h-0 flex-1 cursor-pointer" onClick={onAbrir}>
          {topo}
          <CartaoTitulo className="mb-1.5 text-lg leading-tight font-bold">{titulo}</CartaoTitulo>
          <div className="flex flex-col items-start gap-1">{etiquetas}</div>
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <Fatos className="mb-1.5 flex-nowrap gap-x-2 text-md text-ink">{fatos}</Fatos>
          <BotaoPlay rotulo="Iniciar rotina" grande disabled={r.steps.length === 0} onClick={onIniciar} />
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
        {topo}
        <CartaoTitulo className="mb-1.5 text-[19px] font-bold">{titulo}</CartaoTitulo>
        {/* dias, etapas, xp e etiquetas numa linha só. A área é a faixa da esquerda. */}
        <Fatos className="gap-x-2.5 gap-y-1.5 text-md text-ink">
          {etiquetas}
          {fatos}
        </Fatos>
      </CartaoInfo>
      <BotaoPlay rotulo="Iniciar rotina" grande disabled={r.steps.length === 0} onClick={onIniciar} />
    </SwipeItem>
  );
}
