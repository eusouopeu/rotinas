// Texto pequeno e discreto: rodapé explicativo de um bloco, metadado de um
// card, "nenhum item". Era .stat-foot / .routine-meta / .dev-n. Não traz
// margem: para o rodapé de um bloco use className="mt-3".
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Legenda({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-sans text-sm text-sub", className)} {...resto} />;
}
