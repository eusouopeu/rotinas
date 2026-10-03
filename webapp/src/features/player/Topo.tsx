// Topo do player (mockup de 03/10/2026, recs. 1 e 2): três alvos — X para
// sair, o nome da rotina no centro e "⋯" com etapas, nota anexada e lançar
// rápido —, a trilha de etapas logo abaixo e, embaixo dela, "3 de 7" e a
// previsão de término (com o atraso sobre o fim agendado, se houver).
import type { ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { MenuMais } from "../../ui/MenuMais";

type Props = {
  rotina: string;
  posicao: number;
  total: number;
  temNota: boolean;
  /** "HH:MM" da previsão de término (etapas restantes + estimativa por série). */
  fimPrevisto?: string;
  /** Minutos que a previsão passa do fim agendado da rotina hoje (> 0). */
  atrasoMin?: number;
  /** A trilha de etapas (TrilhaEtapas). */
  trilha: ReactNode;
  onSair: () => void;
  onEtapas: () => void;
  onNota: () => void;
  onRapido: () => void;
};

export function TopoPlayer({
  rotina,
  posicao,
  total,
  temNota,
  fimPrevisto,
  atrasoMin,
  trilha,
  onSair,
  onEtapas,
  onNota,
  onRapido,
}: Props) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <BotaoIcone rotulo="Sair da rotina" semBorda className="size-11 text-ink" onClick={onSair}>
          <Icon name="xmark" size={22} />
        </BotaoIcone>
        <div className="truncate text-center font-sans text-md font-semibold">{rotina}</div>
        <MenuMais
          itens={[
            { icone: "listBullet", rotulo: "Etapas", onClick: onEtapas },
            temNota && { icone: "notes", rotulo: "Nota anexada", onClick: onNota },
            { icone: "plus", rotulo: "Lançar rápido", onClick: onRapido },
          ]}
        />
      </div>
      {trilha}
      <div className="flex justify-between px-1 font-sans text-sm text-sub tabular-nums">
        <span>
          {posicao} de {total}
        </span>
        {fimPrevisto && (
          <span title="Previsão de término">
            termina ~{fimPrevisto}
            {!!atrasoMin && atrasoMin > 0 && (
              <span className="ml-1 text-erro" title="Além do fim agendado">
                +{atrasoMin} min
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
