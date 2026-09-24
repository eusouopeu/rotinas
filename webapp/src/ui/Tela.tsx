// Casca de uma tela: coluna que ocupa o espaço entre o topo e a barra de abas,
// com a entrada suave, e no desktop empurrada para a direita da sidebar
// flutuante e abaixo da barra de busca (--sidebar-w e --topbar-h vêm da CSS
// global, pois mudam com a largura e com a sidebar recolhida).
//   comAbas: reserva o espaço da barra de abas embaixo (no desktop, 28px);
//   comPill: reserva mais, pela pill de Notas/Outros de Modelos;
//   larga: no desktop deixa a tela passar dos 1060px (tabelas e agendas).
// Era .screen / .with-tabbar / .com-modelos-pill / .screen-wide.
// `tela()` devolve as props (className + marcador) para um <div> já existente;
// <Tela> é o mesmo como componente.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Opcoes = { comAbas?: boolean; comPill?: boolean; larga?: boolean };

export function tela({ comAbas, comPill, larga }: Opcoes = {}, extra?: string) {
  return {
    "data-tela": true,
    className: cn(
      "flex min-h-0 flex-1 animate-entra flex-col px-5 motion-reduce:animate-none paisagem:px-4",
      "desktop:mt-[var(--topbar-h)] desktop:ml-[calc(var(--sidebar-w)+28px)] desktop:max-w-[1060px] desktop:px-10",
      comAbas && "pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)] desktop:pb-7",
      comAbas && comPill && "pb-[calc(var(--tabbar-h)+var(--safe-bottom)+86px)] desktop:pb-7",
      larga && "desktop:max-w-[1520px]",
      extra
    ),
  } as const;
}

export function Tela({ comAbas, comPill, larga, className, ...resto }: HTMLAttributes<HTMLDivElement> & Opcoes) {
  return <div {...tela({ comAbas, comPill, larga }, className)} {...resto} />;
}

/** Área que rola dentro da tela (abas com cabeçalho que rola junto): props para um
 *  <div> existente. O overflow-x escondido tira a folga lateral: a área de toque
 *  ampliada dos botões-ícone é invisível mas contava como conteúdo (medido em
 *  22/09/2026). Era .tab-scroll. */
export function rolavel(extra?: string) {
  return {
    "data-rolagem": true,
    className: cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto", extra),
  } as const;
}
