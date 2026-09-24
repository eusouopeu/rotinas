// Junta classes condicionais (clsx) e resolve conflito entre utilitários do
// Tailwind (tailwind-merge): cn("px-2", ativo && "px-4") => "px-4".
// Todo componente de ui/ recebe `className` e passa por aqui, então quem usa
// o componente sempre consegue sobrescrever um detalhe sem `!important`.
// Os nomes do @theme (styles/tailwind.css) precisam ser ensinados ao
// tailwind-merge: sem isso `text-md` seria lido como COR e não conflitaria
// com `text-xs` (o CSS gerado decidiria por ordem interna, não pela sua).
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"],
      radius: ["none", "app", "app-sm", "xs", "md", "lg", "xl", "pill", "full"],
      font: ["sans", "titulo"],
    },
  },
});

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
