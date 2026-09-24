// Título grande da aba (era .home-header): título à esquerda, ações à direita
// (botões-ícone) alinhados pela base. `children` são as ações.
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = { titulo: string; children?: ReactNode; className?: string };

export function CabecalhoTela({ titulo, children, className }: Props) {
  return (
    <div className={cn("mb-[22px] flex items-end justify-between gap-2.5", className)}>
      <h1 className="m-0 font-titulo text-5xl font-semibold tracking-[-0.01em]">{titulo}</h1>
      {children}
    </div>
  );
}
