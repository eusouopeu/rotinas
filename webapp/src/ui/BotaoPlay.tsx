// Botão redondo de "iniciar/retomar" (era .play-btn). `compacto` = 38px (cards
// de lista compactos); o padrão é 44px.
import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function BotaoPlay({
  rotulo,
  compacto,
  className,
  type = "button",
  ...resto
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label"> & { rotulo: string; compacto?: boolean }) {
  return (
    <button
      type={type}
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-0 bg-caneta text-xl text-on-caneta transition-transform duration-120 ease-[ease] active:scale-[0.92]",
        compacto ? "size-[38px]" : "size-11",
        className
      )}
      {...resto}
    >
      <Icon name="play" size={16} />
    </button>
  );
}
