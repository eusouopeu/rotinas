// Seta pequena e sem moldura para reordenar (gôndolas, itens da matriz).
// Desabilitada fica bem apagada. Era .order-btn.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function BotaoOrdem({ className, type = "button", ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn("border-0 bg-transparent px-2 py-1 text-md text-sub disabled:opacity-25", className)}
      {...resto}
    />
  );
}
