// Botão pequeno de ação dentro de um cartão ou de uma edição em linha ("ok",
// "excluir", "cancelar", "Salvar"). `primario` = --caneta cheio; `fantasma` =
// fundo neutro e texto cinza (pinte de vermelho com className="text-erro").
// Era .notice-actions button / .ghost.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "fantasma" };

export function BotaoCompacto({ variante = "primario", className, type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-[9px] border-0 px-4 py-2 font-sans text-base",
        variante === "primario" ? "bg-caneta font-semibold text-on-caneta" : "bg-card-2 font-normal text-sub",
        className
      )}
      {...resto}
    />
  );
}
