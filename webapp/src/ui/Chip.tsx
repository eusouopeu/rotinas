// Etiqueta clicável. variante "area" (era .area-chip): filtro de área; `cor` é a
// cor da área quando ativo (passe "var(--ok)" etc.; sem `cor` usa --caneta).
// variante "tag" (era .tag-chip): hashtag de nota, ativa em --caneta cheio.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = HTMLAttributes<HTMLSpanElement> & { ativo?: boolean; cor?: string; variante?: "area" | "tag" };

export function Chip({ ativo, cor = "var(--caneta)", variante = "area", className, style, ...resto }: Props) {
  return (
    <span
      style={{ "--chip": cor, ...style } as React.CSSProperties}
      className={cn(
        "cursor-pointer border-[1.5px] font-sans",
        variante === "tag"
          ? cn(
              "rounded-xl px-[11px] py-[5px] text-md",
              ativo ? "border-transparent bg-caneta text-on-caneta" : "border-line bg-card text-sub"
            )
          : cn(
              "rounded-pill px-[9px] py-[5px] text-xs",
              ativo ? "border-(--chip) bg-transparent text-(color:--chip)" : "border-line bg-card-2 text-sub"
            ),
        className
      )}
      {...resto}
    />
  );
}
