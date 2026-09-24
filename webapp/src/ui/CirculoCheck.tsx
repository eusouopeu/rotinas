// Círculo com contorno (--caneta) e um ícone no meio: a etapa "simples" do
// player e a tela de rotina concluída. Era .check-circle. `tamanho` troca os
// 110px padrão (ex.: "size-24"); com ele o círculo não encolhe no celular
// deitado, como o legado (que fixava o tamanho por estilo em linha).
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & { tamanho?: string };

export function CirculoCheck({ tamanho, className, ...resto }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-[3px] border-caneta text-[44px] text-caneta",
        tamanho ?? "size-[110px] paisagem:size-[72px] paisagem:border-2 paisagem:text-[30px]",
        className
      )}
      {...resto}
    />
  );
}
