// Superfície (era .stat-card e .schedule-box). Desde 01/10/2026 (minimalismo)
// se separa do fundo pela cor (--card-2), sem borda nem sombra. `raio="lg"` (14px) é o cartão de formulário.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & { raio?: "app" | "lg" };

export function Cartao({ raio = "app", className, ...resto }: Props) {
  return (
    <div
      className={cn(
        "bg-card-2 p-4",
        raio === "app" ? "rounded-app" : "rounded-lg",
        className
      )}
      {...resto}
    />
  );
}
