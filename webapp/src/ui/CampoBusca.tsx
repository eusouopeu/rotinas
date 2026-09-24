// Campo de busca/filtro em pílula (era .set-busca). Ocupa a largura toda; o
// espaçamento vem de className (ex.: "mt-4 mb-3.5").
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function CampoBusca({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      className={cn(
        "w-full rounded-pill border-[1.5px] border-line bg-card px-3.5 py-3 font-sans text-base text-ink focus:border-caneta focus:outline-none",
        className
      )}
      {...resto}
    />
  );
}
