// Linha de gráfico de barras horizontal: nome, trilho preenchido e valor. Era
// .bar-row/.bar-name/.bar-track/.bar-fill/.bar-val (Roda da vida, Dados).
// `pct` 0–100 é a largura da barra; `larguraValor` (em ch) alinha a coluna dos
// valores entre linhas; `cor` pinta a barra, `corRotulo` o nome, `corValor` o valor.
// `naGrade`: a linha vive dentro de um <GradeBarras> (três colunas alinhadas
// entre todas as linhas). `marcador`: traço sobre o trilho em `posMarcador`%
// ("esperado" = ritmo da semana, sólido; "meta" = tracejado verde, ex. 80%).
// `trilho="faixa"` usa o fundo do cartão (a barra está sobre uma faixa colorida).
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  rotulo: ReactNode;
  valor: ReactNode;
  pct: number;
  cor?: string;
  corRotulo?: string;
  corValor?: string;
  /** largura da coluna do valor em ch, ou "auto" (encolhe ao conteúdo) */
  larguraValor?: number | "auto";
  naGrade?: boolean;
  toque?: boolean;
  trilho?: "padrao" | "faixa";
  marcador?: "esperado" | "meta";
  posMarcador?: number;
};

export function LinhaBarra({
  rotulo,
  valor,
  pct,
  cor,
  corRotulo,
  corValor,
  larguraValor,
  naGrade,
  toque,
  trilho = "padrao",
  marcador,
  posMarcador = 0,
  className,
  ...resto
}: Props) {
  return (
    <div
      className={cn(
        naGrade ? "contents" : "my-2 flex items-center gap-2.5",
        toque && (naGrade ? "cursor-pointer" : "cursor-pointer active:opacity-60"),
        className
      )}
      {...resto}
    >
      <div
        className={cn("overflow-hidden text-[13.5px] text-ellipsis whitespace-nowrap", !naGrade && "w-[34%]")}
        style={corRotulo ? { color: corRotulo } : undefined}
      >
        {rotulo}
      </div>
      <div
        className={cn(
          "h-2 flex-1 rounded-[4px]",
          trilho === "faixa" ? "bg-card" : "bg-card-2",
          marcador === "meta" ? "relative overflow-visible" : "overflow-hidden",
          marcador === "esperado" && "relative"
        )}
      >
        <div
          className="h-full rounded-[4px] bg-caneta"
          style={{ width: `${pct}%`, ...(cor ? { background: cor } : {}) }}
        />
        {marcador === "esperado" && (
          <span
            className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded-[1px] bg-ink opacity-65"
            style={{ left: `${posMarcador}%` }}
          />
        )}
        {marcador === "meta" && (
          <span
            className="pointer-events-none absolute -top-1 -bottom-1 w-0 border-l-[1.5px] border-dashed border-ok"
            style={{ left: `${posMarcador}%` }}
          />
        )}
      </div>
      <div
        className={cn("text-right font-sans text-sm text-sub tabular-nums", naGrade ? "whitespace-nowrap" : "w-[52px]")}
        style={{
          ...(larguraValor === "auto"
            ? { width: "auto", whiteSpace: "nowrap", flex: "0 0 auto" }
            : larguraValor
              ? { width: `${larguraValor}ch`, whiteSpace: "nowrap", flex: "0 0 auto" }
              : {}),
          ...(corValor ? { color: corValor } : {}),
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/** Grade de linhas de barras (três colunas alinhadas: nome, trilho, valor). Era .bar-grid. */
export function GradeBarras({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid grid-cols-[fit-content(45%)_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-3", className)}
      {...resto}
    />
  );
}

/** Trilho de barra avulso (fora de uma linha): nota da semana, progresso. */
export function TrilhoBarra({ pct, cor, className }: { pct: number; cor?: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-[4px] bg-card-2", className)}>
      <div
        className="h-full rounded-[4px] bg-caneta"
        style={{ width: `${pct}%`, ...(cor ? { background: cor } : {}) }}
      />
    </div>
  );
}
