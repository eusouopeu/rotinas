// Filtro por área da roda em pílula com setinha (era .ag-nav-area). Desde
// 03/10/2026 abre a folha do app (ui/Escolha), não o menu nativo; o nome
// longo da área continua contido por min-width:0 + reticências no gatilho.
import { cn } from "../../lib/cn";
import { Escolha, type EscolhaProps } from "../../ui/Escolha";

export function SelecaoArea({ className, ...resto }: EscolhaProps) {
  return (
    <Escolha
      className={cn(
        "h-7 w-full max-w-full min-w-0 flex-auto rounded-pill border border-line bg-card py-[5px] pr-2.5 pl-3 font-sans text-md leading-none text-sub [&_.icon-svg]:shrink-0",
        className
      )}
      {...resto}
    />
  );
}
