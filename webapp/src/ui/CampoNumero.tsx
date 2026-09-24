// Número "solto" (sem caixa): valor pequeno e discreto ao lado de um rótulo,
// como as configurações de pontuação. Era .dur-input. Fica cinza e ganha a cor
// de destaque ao focar. `LinhaNumero` já o combina com o rótulo.
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function CampoNumero({ className, ...resto }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="number"
      className={cn(
        "w-[52px] border-0 bg-transparent font-sans text-md text-sub focus:text-caneta focus:outline-none",
        className
      )}
      {...resto}
    />
  );
}

/** Linha "rótulo à esquerda, número à direita" (era .sched-time-row + span
 *  flex-1 + .dur-input). O espaço acima é 14px; zere com className="mt-0". */
export function LinhaNumero({
  rotulo,
  className,
  ...resto
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { rotulo: string }) {
  return (
    <div className={cn("mt-3.5 flex items-center gap-3", className)}>
      <span className="flex-1">{rotulo}</span>
      <CampoNumero {...resto} />
    </div>
  );
}
