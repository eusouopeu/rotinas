// Campo "+ item (Enter)" no pé de uma lista: sem caixa, só um filete tracejado
// em cima. `tamanho`: "cartao" (colunas do Kanban, 13.5px) ou "lista" (prós e
// contras, matriz, 13px). Era .kb-add e .mx-add input.
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { tamanho?: "cartao" | "lista" };

export function CampoNovoItem({ tamanho = "lista", className, type = "text", ...resto }: Props) {
  return (
    <input
      type={type}
      className={cn(
        "w-full border-0 border-t-[1.5px] border-dashed border-line bg-transparent px-0.5 pb-0.5 text-ink focus:outline-none",
        tamanho === "cartao" ? "pt-2 text-[13.5px]" : "pt-[7px] text-md",
        className
      )}
      {...resto}
    />
  );
}
