// Linha de checklist: caixinha à esquerda e o texto (riscado quando marcado).
// Usada nas listas de mercado/viagem e nos quadrantes da matriz em modo
// "check". `cor` pinta a caixinha (a cor do quadrante); sem ela usa --caneta.
import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function CaixaCheck({
  marcado,
  cor,
  className,
  ...resto
}: HTMLAttributes<HTMLSpanElement> & { marcado?: boolean; cor?: string }) {
  return (
    <span
      className={cn(
        "mt-px flex size-[19px] shrink-0 items-center justify-center rounded-[5px] border-2 border-caneta text-xs text-caneta",
        marcado && "border-transparent bg-caneta text-on-caneta",
        className
      )}
      style={cor ? { borderColor: cor, background: marcado ? cor : undefined } : undefined}
      {...resto}
    >
      {marcado ? <Icon name="check" size={14} /> : null}
    </span>
  );
}

/** Classes do texto de um item marcado. */
export const RISCADO = "text-sub line-through";

/** Contêiner da linha: texto de 15px, caixinha alinhada ao topo. */
export function ItemChecklist({ className, ...resto }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("my-1.5 flex items-start gap-2.5 text-lg leading-[1.4]", className)} {...resto} />;
}
