// Campo do título de uma tela de edição: grande (Lato 26px), sem caixa, só o
// sublinhado que ganha a cor de destaque no foco. Era input.name-input.
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function CampoNome({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      className={cn(
        "mb-[18px] w-full border-0 border-b-2 border-line bg-transparent px-0 py-2 font-titulo text-[26px] text-ink focus:border-caneta focus:outline-none",
        className
      )}
      {...resto}
    />
  );
}
