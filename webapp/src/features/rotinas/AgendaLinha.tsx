// Linha de um item do dia na lista da semana: horário (início sobre término),
// nome com marcador (bolinha da rotina ou quadradinho), e o botão de editar
// (cartão) ou excluir (compromisso). Item feito fica riscado; o do calendário
// externo (ical) é só leitura.
import { Icon } from "../../components/Icon";
import { formatHM } from "../../lib/schedule";
import { fillStyle } from "../../lib/scoring";
import type { AgendaItemDia } from "../../lib/agenda";
import { cn } from "../../lib/cn";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { PontoCor } from "../../ui/PontoCor";

type Props = { it: AgendaItemDia; onClick: () => void; onDelete?: () => void; onEdit?: () => void };

export function AgendaLinha({ it, onClick, onDelete, onEdit }: Props) {
  const ical = it.tipo === "ical";
  const apagado = it.feito ? "text-sub line-through" : ical ? "text-sub" : "";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 border-b-[1.5px] border-line py-[7px] text-base last:border-b-0",
        ical ? "cursor-default" : "cursor-pointer"
      )}
      onClick={onClick}
      title={ical ? "Calendário externo (só leitura)" : undefined}
    >
      {/* início SEMPRE acima do término, sem travessão: as duas linhas alinham
          em coluna entre os itens do dia, e o item sem fim ocupa só uma. */}
      <span
        className={cn(
          "flex w-[54px] min-w-0 flex-[0_0_54px] flex-col font-sans text-[12.5px] leading-[1.22] text-sub",
          apagado
        )}
      >
        {it.ini == null ? (
          <span>{it.diaTodo ? "dia todo" : "sem hora"}</span>
        ) : (
          <>
            <span>{formatHM(it.ini)}</span>
            {it.tipo !== "compromisso" && <span>{formatHM(it.fim!)}</span>}
          </>
        )}
      </span>
      <span className={cn("flex min-w-0 flex-auto items-center break-words", apagado)}>
        {it.tipo === "rotina" ? (
          <PontoCor cor={fillStyle(it.cor)} />
        ) : (
          <span
            className={cn(
              "mr-[7px] inline-block size-2 flex-none rounded-[2px]",
              ical ? "border-[1.5px] border-sub bg-transparent" : "bg-sub"
            )}
          />
        )}
        {it.texto}
      </span>
      {onEdit ? (
        <BotaoIcone
          rotulo="Editar tarefa"
          semBorda
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Icon name="notes" size={13} />
        </BotaoIcone>
      ) : onDelete ? (
        <BotaoIcone
          rotulo="Excluir"
          semBorda
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={13} />
        </BotaoIcone>
      ) : (
        <span className="block w-[34px] flex-none" />
      )}
    </div>
  );
}
