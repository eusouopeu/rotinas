// Rótulo de seção em caixa alta pequena ("ETAPAS", "AGENDAMENTO"). Era
// .section-label. A margem padrão separa da seção anterior; sobrescreva com
// className quando o rótulo abrir um bloco (ex.: "mt-3 mb-1.5").
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function RotuloSecao({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-[18px] mb-2.5 font-sans text-xs tracking-[0.06em] text-sub uppercase", className)}
      {...resto}
    />
  );
}
