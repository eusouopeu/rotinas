// Campo de entrada com caixa (texto, número, hora, data). Borda de 1.5px.
// 16px no padrão evita o zoom automático do iOS ao focar.
//   variante "formulario" (padrão): fundo --card-2, 16px, com fonte do app;
//   variante "modelo": campo largo dos documentos de Modelos e dos cartões de
//   Ajustes (era .mk-e-name); variante "linha": campo compacto ao lado de um
//   botão ("Nova área" + Adicionar); variante "compacto": campos dos popups de meta — fundo --card, 14.5px, foco em --caneta. NÃO traz
//   font-family (herdava a fonte do sistema no legado; a troca é uma decisão de
//   harmonização à parte, ver design-system.md).
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/** Campo pequeno de formulário em popup (era `.meta-form input`): fundo --card,
 *  13px, raio 9, ocupa a largura da célula. Reusado pelos campos digitados. */
export const CAMPO_COMPACTO =
  "w-full min-w-0 rounded-[9px] border-[1.5px] border-line bg-card px-2.5 py-2 font-sans text-md text-ink focus:border-caneta focus:outline-none disabled:opacity-[0.45]";

const campo = cva("border-[1.5px] border-line text-ink", {
  variants: {
    variante: {
      formulario: "rounded-md bg-card-2 px-2.5 py-2 font-sans text-xl",
      // campo de uma linha de formulário rápido (era .market-form-row input)
      linha: "rounded-md bg-card px-2 py-[9px] text-base",
      compacto: CAMPO_COMPACTO,
      modelo:
        "mb-2 w-full rounded-[9px] bg-card px-2.5 py-[9px] text-[14.5px] focus:border-caneta focus:outline-none",
    },
  },
  defaultVariants: { variante: "formulario" },
});

type Variantes = VariantProps<typeof campo>;

export function Campo({
  variante,
  className,
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & Variantes) {
  return <input className={cn(campo({ variante }), className)} {...resto} />;
}

/** Área de texto com a mesma cara do Campo "modelo" (não redimensiona, linha 1.5). */
export function AreaTexto({
  className,
  ...resto
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(campo({ variante: "modelo" }), "resize-none overflow-hidden font-sans leading-normal", className)}
      {...resto}
    />
  );
}
