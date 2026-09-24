// Coluna de cartões (notas, rotinas, documentos) com respiro de 12px; no
// desktop vira grade de 2 colunas. Era .notes-list / .routine-list. Não rola
// sozinha: quem rola é a área da tela. Para o EstadoVazio ocupar a grade
// inteira, dê a ele className="desktop:col-span-full".
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function ListaCartoes({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-none flex-col gap-3 overflow-visible desktop:grid desktop:grid-cols-2 desktop:content-start desktop:items-start",
        className
      )}
      {...resto}
    />
  );
}
