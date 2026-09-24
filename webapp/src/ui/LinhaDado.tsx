// Linha de tabela simples: rótulo à esquerda, valor em negrito à direita, com
// filete embaixo (o último não tem). Era .dev-row. `cor` pinta o valor;
// `largura` reserva a coluna do valor (ex.: datas).
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = { rotulo: ReactNode; valor: ReactNode; cor?: string; larguraMin?: number; className?: string };

export function LinhaDado({ rotulo, valor, cor, larguraMin = 110, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 border-b-[1.5px] border-line py-[7px] text-base last:border-b-0",
        className
      )}
    >
      <span className="min-w-0 flex-auto break-words">{rotulo}</span>
      <b
        className="flex-none text-right font-sans text-sm font-bold text-sub tabular-nums"
        style={{ minWidth: larguraMin, ...(cor ? ({ color: cor } as CSSProperties) : {}) }}
      >
        {valor}
      </b>
    </div>
  );
}
