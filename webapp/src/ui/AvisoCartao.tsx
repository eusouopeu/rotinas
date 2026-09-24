// Cartão de aviso tracejado (agenda pausada, lembretes). Era .notice-card.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function AvisoCartao({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-2.5 rounded-lg border-[1.5px] border-dashed border-caneta-soft bg-card px-4 py-3.5 text-[13.5px] leading-[1.45]",
        className
      )}
      {...resto}
    />
  );
}
