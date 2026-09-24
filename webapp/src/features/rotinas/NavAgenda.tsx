// Peças da linha de navegação da agenda: setas coladas no rótulo do período e
// as ações empurradas para a direita por um separador flexível. Era
// .ag-nav-row / .ag-nav-gap / .ag-dia-head / .ag-dia-nome.
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Linha flex de 2px de vão; `cabecalho` acrescenta a margem de título de dia. */
export function LinhaNav({ cabecalho, className, ...resto }: HTMLAttributes<HTMLDivElement> & { cabecalho?: boolean }) {
  return (
    <div className={cn("flex items-center gap-0.5", cabecalho ? "mt-4 mb-1.5" : "mb-1.5", className)} {...resto} />
  );
}

/** Separador que ocupa a sobra da linha. */
export function Sobra() {
  return <span className="min-w-1.5 flex-auto" />;
}

/** Ação à direita (botão com moldura): afasta 6px do vizinho. */
export const ACAO_NAV = "ml-1.5";

/** Nome do dia ("Quarta"): Lato, uma linha só, com o pontinho de "hoje" antes. */
export function NomeDia({ hoje, rotuloPonto, children }: { hoje?: boolean; rotuloPonto: string; children: ReactNode }) {
  return (
    <span className="mr-1.5 min-w-0 flex-[0_1_auto] overflow-hidden font-titulo text-[15px] font-semibold text-ellipsis whitespace-nowrap">
      {hoje && <PontoHoje rotulo={rotuloPonto} />}
      {children}
    </span>
  );
}

export function PontoHoje({ rotulo }: { rotulo: string }) {
  return (
    <span
      className="mr-1.5 inline-block size-[7px] rounded-full bg-caneta align-middle"
      aria-label={rotulo}
      title={rotulo}
    />
  );
}

/** Data pequena cinza ao lado do nome. */
export function DataNav({ children }: { children: ReactNode }) {
  return <span className="font-sans text-sm whitespace-nowrap text-sub">{children}</span>;
}
