// Cartão fixo no topo da lista (rotina em andamento, semana fechada): borda na
// cor de destaque, título em --caneta. Dois seguidos se encostam (-4px).
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { CartaoInfo, CartaoLista, CartaoTitulo } from "../../ui/CartaoLista";
import { Legenda } from "../../ui/Legenda";

type Props = {
  titulo: ReactNode;
  detalhe: ReactNode;
  /** botões à direita (descartar, retomar) */
  acoes?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function CartaoFixo({ titulo, detalhe, acoes, className, onClick }: Props) {
  return (
    <CartaoLista className={cn("mb-3.5 flex-none border-caneta-soft [&+&]:-mt-1", className)} onClick={onClick}>
      <CartaoInfo>
        <CartaoTitulo className="text-xl text-caneta">{titulo}</CartaoTitulo>
        <Legenda>{detalhe}</Legenda>
      </CartaoInfo>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </CartaoLista>
  );
}
