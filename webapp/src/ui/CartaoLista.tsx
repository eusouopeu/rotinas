// Cartão clicável de uma lista (nota, rotina, documento de modelo). Era
// .note-card / .routine-card (+ .note-info, .note-info h3). Dentro de um
// SwipeItem, passe `CARTAO_LISTA` no className do SwipeItem (o cartão visível é
// o "track" dele); fora, use <CartaoLista>.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export const CARTAO_LISTA =
  "flex items-center justify-between gap-3 rounded-app border-[1.5px] border-line bg-card p-[18px] transition-[transform,background-color] duration-[140ms] ease-[ease] active:scale-[0.985] active:bg-card-2 desktop:hover:border-caneta-soft";

export function CartaoLista({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CARTAO_LISTA, className)} {...resto} />;
}

/** Miolo do cartão (título + detalhes): ocupa o espaço e deixa o texto encolher. */
export function CartaoInfo({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 flex-1", className)} {...resto} />;
}

export function CartaoTitulo({ className, ...resto }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("m-0 mb-1.5 font-titulo text-[19px] font-semibold tracking-[-0.01em]", className)} {...resto} />
  );
}
