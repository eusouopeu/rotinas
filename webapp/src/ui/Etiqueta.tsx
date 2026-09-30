// Etiqueta de metadado dos cartões (mockups de 30/09/2026): ícone + texto curto
// numa pílula de fundo claro, sem borda. O tom diz o que é:
// - neutro: agenda, frequência, tempo (cinza, um degrau abaixo do cartão)
// - forte: contagem regressiva sobre fundo claro (cinza cheio, texto claro)
// - caneta: peso no boletim, etapas (roxo claro)
// - streak: sequência (laranja claro)
// - area: cor da área a 18% (passe `cor`)
import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const etiqueta = cva(
  "inline-flex items-center gap-1 rounded-pill px-2 py-[3px] align-middle font-sans text-sm leading-none font-medium whitespace-nowrap [&_.icon-svg]:shrink-0",
  {
    variants: {
      tom: {
        neutro: "bg-chip-neutro text-ink",
        forte: "bg-sub text-card",
        caneta: "bg-caneta-soft text-caneta",
        streak: "bg-streak-soft text-streak",
        area: "bg-[color-mix(in_srgb,var(--chip)_18%,transparent)] text-ink",
      },
    },
    defaultVariants: { tom: "neutro" },
  }
);

type Props = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof etiqueta> & { cor?: string };

export function Etiqueta({ tom, cor, className, style, ...resto }: Props) {
  return (
    <span
      style={cor ? ({ "--chip": cor, ...style } as React.CSSProperties) : style}
      className={cn(etiqueta({ tom }), className)}
      {...resto}
    />
  );
}
