// Botão redondo de controle (era .ctrl-btn): −/+ dos contadores de meta, e no
// player os controles de etapa. `tamanho`: sm 36px (contadores), md 56px,
// grande 76px (o botão principal do player, sem borda). `cor`: neutro (padrão),
// destaque (--caneta cheio) ou ok (--ok cheio, "concluir"). `pulso` faz o botão
// pulsar (etapa estourada, convida a concluir). No desktop o hover devolve o
// fundo neutro em qualquer cor, como no legado.
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const redondo = cva(
  "flex items-center justify-center rounded-full border-[1.5px] text-ink desktop:hover:border-caneta-soft desktop:hover:bg-card-2 desktop:hover:text-ink",
  {
    variants: {
      tamanho: {
        md: "size-14 text-2xl paisagem:size-[46px] paisagem:text-[16px]",
        sm: "size-9 text-lg",
        grande: "size-[76px] border-0 text-[24px] paisagem:size-[58px] paisagem:text-[20px]",
      },
      cor: {
        neutro: "border-line bg-card",
        destaque: "bg-caneta text-on-caneta",
        ok: "border-ok bg-ok text-on-caneta",
      },
      pulso: { true: "animate-pulso", false: "" },
    },
    // no legado o verde do "concluir" grande vencia o hover (regra mais específica)
    compoundVariants: [{ tamanho: "grande", cor: "ok", class: "desktop:hover:bg-ok" }],
    defaultVariants: { tamanho: "md", cor: "neutro", pulso: false },
  }
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label"> &
  VariantProps<typeof redondo> & {
    rotulo: string;
    /** texto do tooltip quando difere do nome do botão */
    dica?: string;
  };

export function BotaoRedondo({ rotulo, dica, tamanho, cor, pulso, className, type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      title={dica ?? rotulo}
      aria-label={rotulo}
      className={cn(redondo({ tamanho, cor, pulso }), className)}
      {...resto}
    />
  );
}
