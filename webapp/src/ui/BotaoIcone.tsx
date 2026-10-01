// Botão quadrado só com ícone (era .icon-btn e .bell-btn). A área de toque é
// estendida 5px para fora por um ::after, sem mudar o tamanho visual.
// `ligado` = estado ativo de um botão-toggle (filtro "hoje"); `semBorda` = só o
// ícone, sem o quadrado (excluir, favoritar).
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const botaoIcone = cva(
  "relative flex shrink-0 items-center justify-center rounded-app-sm border-0 text-lg transition-[transform,background-color] duration-120 ease-[ease] after:absolute after:-inset-[5px] after:rounded-lg active:scale-[0.92] active:bg-chip-neutro desktop:hover:bg-chip-neutro desktop:hover:text-ink",
  {
    variants: {
      // ícone mínimo de 20px (md) / 18px (sm) qualquer que seja o `size` passado:
      // ícones de 13–15px em botão de 36px davam cara de tela entulhada e eram
      // difíceis de acertar (pedido do Pedro, 01/10/2026)
      tamanho: { md: "size-10 [&_.icon-svg]:size-5", sm: "size-9 [&_.icon-svg]:size-[18px]" },
      aparencia: {
        padrao: "bg-card-2 text-sub",
        ligado: "bg-caneta-soft text-caneta",
        semBorda: "bg-transparent text-sub",
      },
    },
    defaultVariants: { tamanho: "md", aparencia: "padrao" },
  }
);

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  /** Nome do botão: vira title e aria-label (botão sem texto precisa dele). */
  rotulo: string;
  tamanho?: "md" | "sm";
  ligado?: boolean;
  semBorda?: boolean;
};

export function BotaoIcone({ rotulo, tamanho, ligado, semBorda, className, type = "button", ...resto }: Props) {
  const aparencia = semBorda ? "semBorda" : ligado ? "ligado" : "padrao";
  return (
    <button
      type={type}
      title={rotulo}
      aria-label={rotulo}
      className={cn(botaoIcone({ tamanho, aparencia }), className)}
      {...resto}
    />
  );
}
