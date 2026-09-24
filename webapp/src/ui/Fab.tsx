// Botão flutuante de criar (era .fab). No celular é um círculo com "+"; no
// desktop (>=900px) vira uma pílula que mostra o `rotulo` ao lado do "+".
// Posição vem da barra de abas (--tabbar-h); telas com outra barra
// (pill de Modelos) sobrescrevem `bottom` via className.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & { rotulo: string };

export function Fab({ rotulo, className, children = "+", type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      title={rotulo}
      className={cn(
        "fixed right-6 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+20px)] z-20 flex size-[58px] items-center justify-center rounded-full border-0 bg-caneta text-[28px] font-normal text-on-caneta transition-transform duration-[140ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90",
        "paisagem:right-4 paisagem:bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+10px)] paisagem:size-12 paisagem:text-[23px]",
        "desktop:right-10 desktop:bottom-8 desktop:h-[46px] desktop:w-auto desktop:gap-2 desktop:rounded-[23px] desktop:px-5 desktop:text-3xl desktop:after:font-sans desktop:after:text-base desktop:after:font-medium desktop:after:tracking-[-0.01em] desktop:after:content-[attr(title)] desktop:hover:scale-[1.04] desktop:active:scale-[0.96]",
        className
      )}
      {...resto}
    >
      {children}
    </button>
  );
}
