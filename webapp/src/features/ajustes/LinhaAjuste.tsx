// Linha de uma configuração: nome à esquerda (uma linha só, corta com "…") e o
// controle ou o valor à direita. Era .bar-row + .bar-name + .bar-val dentro de
// Ajustes. `valor` (texto pequeno cinza, opcionalmente colorido) ou `children`
// (um Toggle, um Botao) ocupam o lado direito.
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = {
  rotulo: ReactNode;
  valor?: ReactNode;
  corValor?: string;
  children?: ReactNode;
  className?: string;
};

export function LinhaAjuste({ rotulo, valor, corValor, children, className }: Props) {
  return (
    <div className={cn("my-2 flex items-center gap-2.5", className)}>
      <div className="min-w-0 flex-1 overflow-hidden text-[13.5px] text-ellipsis whitespace-nowrap">{rotulo}</div>
      {valor !== undefined && (
        <div className="text-right font-sans text-sm text-sub tabular-nums" style={corValor ? { color: corValor } : undefined}>
          {valor}
        </div>
      )}
      {children}
    </div>
  );
}
