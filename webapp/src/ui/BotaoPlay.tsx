// Botão redondo de "iniciar/retomar" (era .play-btn), em degradê roxo (pedido
// do Pedro em 30/09/2026 — a única exceção ao primário sólido). `compacto` =
// 38px; o padrão é 44px; `grande` = 56px (encaixado na ponta do cartão de rotina).
import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function BotaoPlay({
  rotulo,
  compacto,
  grande,
  className,
  type = "button",
  ...resto
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "aria-label"> & {
  rotulo: string;
  compacto?: boolean;
  grande?: boolean;
}) {
  return (
    <button
      type={type}
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-0 bg-linear-160 from-caneta-grad to-caneta text-xl text-on-caneta transition-transform duration-120 ease-[ease] active:scale-[0.92] disabled:opacity-45",
        grande ? "size-14" : compacto ? "size-[38px]" : "size-11",
        className
      )}
      {...resto}
    >
      <Icon name="play" size={grande ? 20 : 16} />
    </button>
  );
}
