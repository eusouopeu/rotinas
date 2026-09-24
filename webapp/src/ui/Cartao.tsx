// Superfície com borda (era .stat-card e .schedule-box). Elevação no app é só
// borda de 1.5px, nunca sombra. `raio="lg"` (14px) é o cartão de formulário.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & { raio?: "app" | "lg" };

export function Cartao({ raio = "app", className, ...resto }: Props) {
  return (
    <div
      className={cn(
        "border-[1.5px] border-line bg-card p-4 desktop:hover:border-caneta-soft",
        raio === "app" ? "rounded-app" : "rounded-lg",
        className
      )}
      {...resto}
    />
  );
}
