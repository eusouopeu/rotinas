// Etiqueta clicável (era .area-chip): filtro de área, dias, etc. `cor` é a cor
// da área quando ativo (passe "var(--ok)" etc.); sem `cor` usa --caneta.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = HTMLAttributes<HTMLSpanElement> & { ativo?: boolean; cor?: string };

export function Chip({ ativo, cor = "var(--caneta)", className, style, ...resto }: Props) {
  return (
    <span
      style={{ "--chip": cor, ...style } as React.CSSProperties}
      className={cn(
        "cursor-pointer rounded-pill border-[1.5px] px-[9px] py-[5px] font-sans text-xs",
        ativo ? "border-(--chip) bg-transparent text-(color:--chip)" : "border-line bg-card-2 text-sub",
        className
      )}
      {...resto}
    />
  );
}
