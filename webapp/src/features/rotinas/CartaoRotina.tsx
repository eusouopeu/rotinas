// Cartão de rotina da visão Lista: bolinha da área, nome, streak, e uma linha
// de fatos (etapas, horário/duração, dias, hábito) com ícone; play à direita.
// Compacto por padrão; `expandido` empilha os fatos. Já feita hoje: título
// riscado, bolinha esmaecida, horário real em verde e selo de streak cheio.
import { Icon } from "../../components/Icon";
import { StreakTag } from "../../components/StreakTag";
import { fmtTime } from "../../lib/format";
import { EXERCICIO_SET_SEG, routineDurationRaw } from "../../lib/routines";
import { computeSchedule, diasChipLabel, formatHM } from "../../lib/schedule";
import { corDaRotina, fillStyle, rotinaEhHabito } from "../../lib/scoring";
import { execucaoDoDia, execucaoMinutos, type HistoryEntry } from "../../lib/history";
import type { GamificacaoState, Routine } from "../../lib/types";
import { cn } from "../../lib/cn";
import { BotaoPlay } from "../../ui/BotaoPlay";
import { CARTAO_LISTA, CartaoInfo, CartaoTitulo } from "../../ui/CartaoLista";
import { Fato, Fatos } from "../../ui/Fatos";
import { PontoCor } from "../../ui/PontoCor";
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
  const dur = routineDurationRaw(r, EXERCICIO_SET_SEG);
  const sched = computeSchedule(r);
  const execHoje = execucaoDoDia(history, r.id, hojeISO);
  const execMin = execHoje ? execucaoMinutos(execHoje) : null;

  return (
    <SwipeItem onLeft={onExcluir} onRight={onDuplicar} className={cn(CARTAO_LISTA, !expandido && "px-3.5 py-3")}>
      <CartaoInfo className="cursor-pointer" onClick={onAbrir}>
        <CartaoTitulo
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            expandido ? "mb-2" : "mb-1 text-xl",
            execHoje && "text-sub line-through"
          )}
        >
          <PontoCor cor={fillStyle(corDaRotina(r, gam))} esmaecido={!!execHoje} />
          {r.icon ? r.icon + " " : ""}
          {r.name}
          <StreakTag routineId={r.id} routines={routines} history={history} feitaHoje={!!execHoje} />
        </CartaoTitulo>
        {/* etapas · horário (ou duração, só quando não há horário) · dias, tudo
            em ícone e numa linha só. A área da roda saiu: já está dita pela cor
            da bolinha antes do nome. */}
        <Fatos className={cn(expandido && "flex-col items-start gap-1.5")}>
          <Fato title={`${r.steps.length} etapa${r.steps.length !== 1 ? "s" : ""}`}>
            <Icon name="clipboard" size={13} /> {r.steps.length}
          </Fato>
          {execMin ? (
            <Fato className="text-ok" title="Executada hoje">
              <Icon name="check" size={13} /> {formatHM(execMin.ini)} &rarr; {formatHM(execMin.fim)}
            </Fato>
          ) : sched ? (
            <Fato className="text-caneta" title="Horário">
              <Icon name="clock" size={13} /> {sched.startStr} &rarr; {sched.endStr}
            </Fato>
          ) : dur > 0 ? (
            <Fato className="text-caneta" title="Duração">
              <Icon name="clock" size={13} /> {fmtTime(dur).replace("+", "")}
            </Fato>
          ) : null}
          {sched && (
            <Fato title="Dias">
              <Icon name="calendar" size={13} /> {diasChipLabel(r)}
            </Fato>
          )}
          {rotinaEhHabito(r, gam) && (
            <span
              className="ml-1.5 rounded-pill border-[1.5px] border-ok px-[7px] py-px align-middle font-sans text-xs text-ok"
              title={`Hábito consolidado: vale ${Math.round((gam.config.habito.fator || 0.6) * 100)}% do peso, para abrir espaço ao que ainda não pegou`}
            >
              hábito
            </span>
          )}
        </Fatos>
      </CartaoInfo>
      <div className="flex shrink-0 items-center gap-2">
        <BotaoPlay rotulo="Iniciar rotina" compacto={!expandido} disabled={r.steps.length === 0} onClick={onIniciar} />
      </div>
    </SwipeItem>
  );
}
