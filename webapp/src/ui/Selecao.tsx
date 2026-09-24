// Menu de escolha nativo (<select>) com a moldura do app; o menu aberto é
// desenhado pelo sistema, então nunca sai da tela no celular. Era
// .routine-select. Ocupa a largura toda; use dentro de um contêiner flex.
import type { SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Selecao({ className, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border-[1.5px] border-line bg-card-2 px-2.5 py-2 font-sans text-base text-ink",
        className
      )}
      {...resto}
    />
  );
}
