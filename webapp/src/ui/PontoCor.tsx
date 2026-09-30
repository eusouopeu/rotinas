// Bolinha de cor antes do nome (rotina, meta): a cor da área da roda. Era .r-dot.
import { cn } from "../lib/cn";

export function PontoCor({ cor, esmaecido, className }: { cor: string; esmaecido?: boolean; className?: string }) {
  return (
    <span
      className={cn("mr-[7px] inline-block size-[9px] rounded-full align-[1px]", esmaecido && "opacity-45", className)}
      style={{ background: cor }}
    />
  );
}

/** Faixa vertical da cor da área na borda esquerda do cartão (mockups de
 *  30/09/2026: substitui a bolinha nos cartões de rotina e de meta). O cartão
 *  precisa de `relative overflow-hidden`. */
export function FaixaCor({ cor, esmaecido }: { cor: string; esmaecido?: boolean }) {
  return (
    <span
      aria-hidden
      data-faixa
      className={cn("absolute inset-y-0 left-0 w-[5px]", esmaecido && "opacity-45")}
      style={{ background: cor }}
    />
  );
}

/** Classes do cartão "cápsula" (rotina, meta): fundo claro sem borda, faixa da
 *  área à esquerda e a ponta direita arredondada abraçando o botão de ação. */
export const CARTAO_CAPSULA =
  "relative flex items-center gap-3 overflow-hidden rounded-app bg-card-2 py-3 pr-2 pl-[18px] transition-[transform] duration-[140ms] ease-[ease] active:scale-[0.985]";
