// Número com unidade dentro da caixa: "1 m", "30 s". Clicar em qualquer ponto
// da caixa foca o número (é um <label>). Aceita os props de <input>; o padrão
// é numérico inteiro. Para minutos + segundos, use dois lado a lado.
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  /** unidade abreviada mostrada depois do número ("m", "s", "kg") */
  unidade: string;
  className?: string;
};

export function CampoDuracao({ unidade, className, ...resto }: Props) {
  return (
    <label
      className={cn(
        "inline-flex cursor-text items-baseline gap-1 rounded-app-sm border-[1.5px] border-line bg-card-2 px-2.5 py-1.5 focus-within:border-caneta",
        className
      )}
    >
      <input
        type="number"
        inputMode="numeric"
        className="w-[3ch] [appearance:textfield] border-0 bg-transparent p-0 text-right font-sans text-lg text-ink outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...resto}
      />
      <span className="text-md text-sub">{unidade}</span>
    </label>
  );
}
