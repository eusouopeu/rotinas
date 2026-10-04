// Botão "⋯" com um menu suspenso de ações secundárias (03/10/2026): topo do
// player e barra do detalhe da rotina. Cada item é ícone + texto; tocar fora
// fecha. A sombra é a elevação de popover sobre o conteúdo (minimalismo.md
// permite sombra em popover/modal).
import { useState } from "react";
import { Icon } from "../components/Icon";
import type { IconName } from "../lib/icons";
import { cn } from "../lib/cn";
import { BotaoIcone } from "./BotaoIcone";

export type ItemMenuMais = {
  icone: IconName;
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
  /** opção ligada (ex.: modo atual da lista): check à direita */
  ativo?: boolean;
};

export function MenuMais({
  itens,
  className,
  rotulo = "Mais ações",
}: {
  itens: Array<ItemMenuMais | false | null | undefined>;
  className?: string;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const visiveis = itens.filter(Boolean) as ItemMenuMais[];
  return (
    <div className={cn("relative", className)}>
      <BotaoIcone
        rotulo={rotulo}
        semBorda
        className="size-11 text-ink"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <Icon name="ellipsis" size={24} />
      </BotaoIcone>
      {aberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-20 cursor-default border-0 bg-transparent"
            onClick={() => setAberto(false)}
          />
          <div
            role="menu"
            className="absolute top-12 right-0 z-30 w-60 animate-entra-rapido rounded-app bg-card p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
          >
            {visiveis.map((it) => (
              <button
                key={it.rotulo}
                type="button"
                role={it.ativo === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={it.ativo}
                className={cn(
                  "flex w-full items-center gap-3 rounded-app-sm border-0 bg-transparent px-3 py-3 text-left text-lg active:bg-chip-neutro desktop:hover:bg-chip-neutro",
                  it.perigo ? "text-erro" : "text-ink"
                )}
                onClick={() => {
                  setAberto(false);
                  it.onClick();
                }}
              >
                <Icon name={it.icone} size={20} />
                <span className="flex-1">{it.rotulo}</span>
                {it.ativo && (
                  <span className="text-caneta">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
