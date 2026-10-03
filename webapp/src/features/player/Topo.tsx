// Topo do player (mockup de 03/10/2026, recs. 1 e 2): três alvos — X para
// sair, o nome da rotina no centro e "⋯" com etapas, nota anexada e lançar
// rápido —, a trilha de etapas logo abaixo e, embaixo dela, "3 de 7" e a
// previsão de término (com o atraso sobre o fim agendado, se houver).
import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../lib/icons";
import { BotaoIcone } from "../../ui/BotaoIcone";

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

function ItemMenu({ icone, children, onClick }: { icone: IconName; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-3 rounded-app-sm border-0 bg-transparent px-3 py-3 text-left text-lg text-ink active:bg-chip-neutro desktop:hover:bg-chip-neutro"
      onClick={onClick}
    >
      <Icon name={icone} size={20} />
      {children}
    </button>
  );
}

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
  const [menu, setMenu] = useState(false);
  const escolher = (acao: () => void) => () => {
    setMenu(false);
    acao();
  };
  return (
    <div className="w-full">
      <div className="relative grid grid-cols-[44px_1fr_44px] items-center">
        <BotaoIcone rotulo="Sair da rotina" semBorda className="size-11 text-ink" onClick={onSair}>
          <Icon name="xmark" size={22} />
        </BotaoIcone>
        <div className="truncate text-center font-sans text-md font-semibold">{rotina}</div>
        <BotaoIcone
          rotulo="Mais ações"
          semBorda
          className="size-11 text-ink"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
        >
          <Icon name="ellipsis" size={24} />
        </BotaoIcone>
        {menu && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              className="fixed inset-0 z-20 cursor-default border-0 bg-transparent"
              onClick={() => setMenu(false)}
            />
            <div
              role="menu"
              className="absolute top-12 right-0 z-30 w-56 animate-entra-rapido rounded-app bg-card p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
            >
              <ItemMenu icone="listBullet" onClick={escolher(onEtapas)}>
                Etapas
              </ItemMenu>
              {temNota && (
                <ItemMenu icone="notes" onClick={escolher(onNota)}>
                  Nota anexada
                </ItemMenu>
              )}
              <ItemMenu icone="plus" onClick={escolher(onRapido)}>
                Lançar rápido
              </ItemMenu>
            </div>
          </>
        )}
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
