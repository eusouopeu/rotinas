// Bolinha de cor antes do nome (rotina, meta): a cor da área da roda. Era .r-dot.
import { cn } from "../lib/cn";

export function PontoCor({ cor, esmaecido, className }: { cor: string; esmaecido?: boolean; className?: string }) {
  return (
    <span
      className={cn("mr-[7px] inline-block size-[9px] rounded-full align-[1px]", esmaecido && "opacity-45", className)}
      style={{ background: cor }}
    />
  );
}
