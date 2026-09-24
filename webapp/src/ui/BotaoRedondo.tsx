// Botão redondo de controle (era .ctrl-btn): −/+ dos contadores de meta, e no
// player os controles de pausa/pular. `tamanho`: sm 36px (contadores), md 56px.
// O tamanho grande do player (76px, cor cheia) entra quando o Player migrar.
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const redondo = cva(
  "flex items-center justify-center rounded-full border-[1.5px] border-line bg-card text-ink desktop:hover:border-caneta-soft desktop:hover:bg-card-2",
  {
    variants: { tamanho: { md: "size-14 text-2xl", sm: "size-9 text-lg" } },
    defaultVariants: { tamanho: "md" },
  }
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label"> &
  VariantProps<typeof redondo> & { rotulo: string };

export function BotaoRedondo({ rotulo, tamanho, className, type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      title={rotulo}
      aria-label={rotulo}
      className={cn(redondo({ tamanho }), className)}
      {...resto}
    />
  );
}
