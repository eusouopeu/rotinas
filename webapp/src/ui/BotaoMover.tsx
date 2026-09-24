// Botão quadradinho de subir/descer (era .kb-move-btn): reordenar etapas no
// painel do player. Desabilitado fica bem apagado e não reage. A área de toque
// vai 6px além da borda.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function BotaoMover({
  rotulo,
  className,
  type = "button",
  ...resto
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label"> & { rotulo: string }) {
  return (
    <button
      type={type}
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "relative flex size-[30px] items-center justify-center rounded-[9px] border-[1.5px] border-line bg-card text-[17px] leading-none text-sub transition-[transform,background-color] duration-120 ease-[ease] after:absolute after:-inset-1.5 after:rounded-[14px] enabled:active:scale-90 enabled:active:bg-card-2 disabled:opacity-[0.28] desktop:enabled:hover:border-caneta-soft desktop:enabled:hover:bg-card-2 desktop:enabled:hover:text-ink",
        className
      )}
      {...resto}
    />
  );
}
