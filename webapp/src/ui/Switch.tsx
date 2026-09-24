// Linha com interruptor (era <label class="switch-row"> + checkbox nativo).
// O <input> continua sendo um checkbox de verdade (teclado, leitor de tela),
// só desenhado como trilho + bolinha. `children` é o texto da linha.
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  children: ReactNode;
  onChange: (ligado: boolean) => void;
  /** classes da linha (<label>); o interruptor em si não se personaliza */
  className?: string;
};

export function Switch({ children, className, onChange, ...resto }: Props) {
  return (
    <label className={cn("flex items-center justify-between text-lg", className)}>
      <span>{children}</span>
      <input
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
        className="relative m-0 h-[26px] w-11 shrink-0 cursor-pointer appearance-none rounded-pill border-[1.5px] border-line bg-card-2 transition-[background-color,border-color] duration-150 before:absolute before:top-0.5 before:left-0.5 before:size-[19px] before:rounded-full before:bg-sub before:transition-[transform,background-color] before:duration-150 checked:border-caneta checked:bg-caneta checked:before:translate-x-[18px] checked:before:bg-on-caneta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
        {...resto}
      />
    </label>
  );
}
