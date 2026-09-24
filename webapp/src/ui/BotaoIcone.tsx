// Botão quadrado só com ícone (era .icon-btn e .bell-btn). A área de toque é
// estendida 5px para fora por um ::after, sem mudar o tamanho visual.
// `ligado` = estado ativo de um botão-toggle (filtro "hoje"); `semBorda` = só o
// ícone, sem o quadrado (excluir, favoritar).
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const botaoIcone = cva(
  "relative flex shrink-0 items-center justify-center rounded-app-sm border-[1.5px] text-lg transition-[transform,background-color] duration-120 ease-[ease] after:absolute after:-inset-[5px] after:rounded-lg active:scale-[0.92] active:bg-card-2",
  {
    variants: {
      tamanho: { md: "size-9", sm: "size-[34px]" },
      aparencia: {
        padrao: "border-line bg-card text-sub",
        ligado: "border-transparent bg-caneta-soft text-caneta",
        semBorda: "border-0 bg-transparent text-sub",
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
