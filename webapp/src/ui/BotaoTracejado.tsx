// Botão largo com contorno tracejado ("limpar itens marcados", "adicionar
// etapa"): ação secundária no pé de uma lista. Era .add-step-btn. Usa a fonte
// do sistema, como no legado.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function BotaoTracejado({ className, type = "button", ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "mt-1 rounded-lg border-[1.5px] border-dashed border-line bg-transparent p-4 text-center text-base text-sub",
        className
      )}
      {...resto}
    />
  );
}
