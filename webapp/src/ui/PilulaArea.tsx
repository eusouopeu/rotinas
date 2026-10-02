// Pílula cheia na cor da área da roda (mockup de 02/10/2026): topo do detalhe
// da rotina e campo de área do editor. A cor vem do dado (área escolhida).
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function PilulaArea({ cor, className, ...resto }: HTMLAttributes<HTMLSpanElement> & { cor: string }) {
  return (
    <span
      className={cn("truncate rounded-pill px-3.5 py-1 font-sans text-base font-semibold text-on-caneta", className)}
      style={{ background: cor }}
      {...resto}
    />
  );
}
