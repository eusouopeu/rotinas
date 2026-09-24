// Campo de entrada com caixa (texto, número, hora, data). É o campo padrão de
// formulário: fundo --card-2, borda de 1.5px, fonte 16px (16 evita o zoom
// automático do iOS ao focar).
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Campo({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-md border-[1.5px] border-line bg-card-2 px-2.5 py-2 font-sans text-xl text-ink",
        className
      )}
      {...resto}
    />
  );
}
