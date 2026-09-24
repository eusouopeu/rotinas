// Linha de "fatos" de um cartão (peso, frequência, prazo…): itens pequenos
// cinza com ícone, lado a lado e quebrando de linha. Era .routine-meta +
// .routine-meta-line e .rc-fact. `destaque` pinta o fato em --caneta e negrito
// (o peso no boletim).
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Fatos({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1 font-sans text-sm text-sub", className)} {...resto} />;
}

export function Fato({ destaque, className, ...resto }: HTMLAttributes<HTMLSpanElement> & { destaque?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", destaque && "font-semibold text-caneta", className)}
      {...resto}
    />
  );
}
