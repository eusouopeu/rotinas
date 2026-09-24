// Campo de busca/filtro que ocupa a largura toda; o espaçamento vem de
// className. forma "pilula" (era .set-busca, Ajustes) ou "caixa" (era
// .note-search, listas de Notas/Modelos; use type="search").
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { forma?: "pilula" | "caixa" };

export function CampoBusca({ forma = "pilula", className, ...resto }: Props) {
  return (
    <input
      type="text"
      className={cn(
        "w-full border-[1.5px] border-line bg-card font-sans text-ink focus:border-caneta focus:outline-none",
        forma === "pilula" ? "rounded-pill px-3.5 py-3 text-base" : "rounded-[12px] px-3.5 py-[11px] text-lg",
        className
      )}
      {...resto}
    />
  );
}
