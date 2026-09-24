// Junta classes condicionais (clsx) e resolve conflito entre utilitários do
// Tailwind (tailwind-merge): cn("px-2", ativo && "px-4") => "px-4".
// Todo componente de ui/ recebe `className` e passa por aqui, então quem usa
// o componente sempre consegue sobrescrever um detalhe sem `!important`.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
