// Menu de escolha com a moldura do app (era .routine-select). Desde
// 03/10/2026 abre a folha do app (ui/Escolha) em vez do popup nativo do
// Android. Ocupa a largura toda; use dentro de um contêiner flex.
import { cn } from "../lib/cn";
import { Escolha, type EscolhaProps } from "./Escolha";

export function Selecao({ className, ...resto }: EscolhaProps) {
  return (
    <Escolha
      className={cn(
        "w-full rounded-md border border-line bg-card px-2.5 py-2 font-sans text-base text-ink [&_.icon-svg]:shrink-0 [&_.icon-svg]:text-sub",
        className
      )}
      {...resto}
    />
  );
}
