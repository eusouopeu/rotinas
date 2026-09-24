// Título grande de um documento (Modelos, nota): só um filete embaixo, fonte
// de título 28px, foco pinta o filete de --caneta. Era input.note-title-input.
// No desktop a linha não passa de 70 caracteres. `defaultValue`/`onBlur` como
// campo comum (o título só é gravado ao sair do campo).
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function CampoTitulo({ className, type = "text", ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "mb-2.5 w-full border-0 border-b-2 border-line bg-transparent px-0 py-1.5 font-titulo text-[28px] leading-[1.25] text-ink focus:border-caneta focus:outline-none desktop:max-w-[70ch]",
        className
      )}
      {...resto}
    />
  );
}
