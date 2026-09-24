// Botão de texto simples, sem moldura (ex.: "Depois" no topo de um fluxo).
// `tom="suave"` fica cinza; o padrão usa a cor de destaque. Era
// `.topbar .link-btn` (+ `.muted`).
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function BotaoLink({
  tom = "destaque",
  className,
  type = "button",
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { tom?: "destaque" | "suave" }) {
  return (
    <button
      type={type}
      className={cn(
        "border-0 bg-transparent px-0 py-2 font-sans text-lg",
        tom === "suave" ? "text-sub" : "text-caneta",
        className
      )}
      {...resto}
    />
  );
}
