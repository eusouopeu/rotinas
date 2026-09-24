// Filtro por área da roda: <select> nativo em pílula com setinha desenhada.
// Nativo de propósito: no Android o menu é desenhado pelo sistema e nunca vaza
// da largura da tela, por mais longo que seja o nome da área; o próprio campo
// é contido por min-width:0 + ellipsis. Era .ag-nav-area.
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function SelecaoArea({ className, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-7 w-full max-w-full min-w-0 flex-auto appearance-none overflow-hidden rounded-pill border border-line bg-card bg-no-repeat py-[5px] pr-[26px] pl-3 font-sans text-[12.5px] leading-none text-ellipsis whitespace-nowrap text-sub focus:border-caneta focus:outline-none",
        "[background-image:linear-gradient(45deg,transparent_50%,var(--sub)_50%),linear-gradient(135deg,var(--sub)_50%,transparent_50%)] [background-position:calc(100%-14px)_12px,calc(100%-9px)_12px] [background-size:5px_5px,5px_5px]",
        className
      )}
      {...resto}
    />
  );
}
