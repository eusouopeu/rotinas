// Barra de ações fixa no rodapé das telas de edição/detalhe (Salvar, Excluir,
// Começar), com fundo que esmaece para o da página. Era .bottom-actions. Os
// botões dividem a linha: dê `flex-1` ao principal.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function BarraAcoes({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[15] flex gap-2.5 bg-[linear-gradient(to_top,var(--paper)_65%,transparent)] px-5 pt-4 pb-[calc(16px+var(--safe-bottom))]",
        className
      )}
      {...resto}
    />
  );
}
