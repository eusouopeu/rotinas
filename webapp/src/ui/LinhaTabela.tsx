// Linha de tabela simples (Dados: execuções do dia, sequências, etapas,
// pontualidade, recentes): células lado a lado com filete embaixo (a última
// não tem). Era .dev-row e seus filhos.
//   <LinhaTabela><CelRotulo>Manhã</CelRotulo><CelNegrito status="atraso">+2</CelNegrito>
//     <CelNota>10x</CelNota></LinhaTabela>
// `coluna` empilha as células (execuções recentes); `toque` faz a linha ser
// clicável (cursor de mão e escurecer ao apertar); `cabecalho` é a linha de
// títulos da tabela (caixa alta pequena, filete mais escuro).
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function LinhaTabela({
  coluna,
  toque,
  cabecalho,
  className,
  ...resto
}: HTMLAttributes<HTMLDivElement> & { coluna?: boolean; toque?: boolean; cabecalho?: boolean }) {
  return (
    <div
      className={cn(
        "flex justify-between border-b-[1.5px] border-line py-[7px] text-base last:border-b-0",
        coluna ? "flex-col items-start gap-0.5" : "items-center gap-2.5",
        toque && "cursor-pointer active:opacity-60",
        cabecalho &&
          "border-b-sub [&>*]:font-sans [&>*]:text-[10.5px] [&>*]:font-normal [&>*]:tracking-[0.05em] [&>*]:text-sub [&>*]:uppercase",
        className
      )}
      {...resto}
    />
  );
}

/** Texto principal da linha: ocupa o que sobra e quebra palavra longa. */
export function CelRotulo({ className, ...resto }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("min-w-0 flex-auto break-words", className)} {...resto} />;
}

/** Valor pequeno cinza à direita (hora, contagem). `larga` reserva 110px. */
export function CelNota({ larga, className, ...resto }: HTMLAttributes<HTMLSpanElement> & { larga?: boolean }) {
  return (
    <span
      className={cn(
        "min-w-[76px] flex-none text-right font-sans text-sm text-sub tabular-nums",
        larga && "min-w-[110px]",
        className
      )}
      {...resto}
    />
  );
}

const STATUS = { atraso: "text-erro", adiantado: "text-ok", pontual: "text-caneta" } as const;
export type StatusCelula = keyof typeof STATUS;

/** Valor em negrito à direita; `status` pinta (atraso vermelho, adiantado verde, pontual da cor de destaque). */
export function CelNegrito({ status, className, ...resto }: HTMLAttributes<HTMLElement> & { status?: StatusCelula }) {
  return (
    <b
      className={cn("min-w-[58px] flex-none text-right font-bold tabular-nums", status && STATUS[status], className)}
      {...resto}
    />
  );
}

/** Traduz a classe de estado que o cálculo devolve ("late"/"early"/"ontime") para a célula. */
export function statusDaClasse(c: string | undefined): StatusCelula | undefined {
  return c === "late" ? "atraso" : c === "early" ? "adiantado" : c === "ontime" ? "pontual" : undefined;
}
