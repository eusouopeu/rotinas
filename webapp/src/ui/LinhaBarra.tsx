// Linha de gráfico de barras horizontal: nome, trilho preenchido e valor. Era
// .bar-row/.bar-name/.bar-track/.bar-fill/.bar-val (Roda da vida, Dados).
// `pct` 0–100 é a largura da barra; `larguraValor` (em ch) alinha a coluna dos
// valores entre linhas; `cor` pinta nome e barra.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  rotulo: string;
  valor: string;
  pct: number;
  cor?: string;
  larguraValor?: number;
};

export function LinhaBarra({ rotulo, valor, pct, cor, larguraValor, className, ...resto }: Props) {
  return (
    <div className={cn("my-2 flex items-center gap-2.5", className)} {...resto}>
      <div className="w-[34%] overflow-hidden text-[13.5px] text-ellipsis whitespace-nowrap" style={cor ? { color: cor } : undefined}>
        {rotulo}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-card-2">
        <div className="h-full rounded-[4px] bg-caneta" style={{ width: `${pct}%`, ...(cor ? { background: cor } : {}) }} />
      </div>
      <div
        className="w-[52px] text-right font-sans text-sm text-sub tabular-nums"
        style={larguraValor ? { width: `${larguraValor}ch`, whiteSpace: "nowrap", flex: "0 0 auto" } : undefined}
      >
        {valor}
      </div>
    </div>
  );
}
