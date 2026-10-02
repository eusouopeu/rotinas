// Título grande da aba (era .home-header): título à esquerda, ações à direita
// (botões-ícone) alinhados pela base. No desktop vira uma barra grudada no topo
// da área que rola, com filete embaixo; no celular deitado fica mais baixo.
//   titulo: texto ou conteúdo do h1; tituloClassName troca o tamanho (ex.:
//   "text-4xl paisagem:text-4xl" nas pastas); margem: a folga de baixo em
//   unidades do Tailwind (padrão 22px no celular, 6px no desktop).
// Grudado no topo também no celular em todas as abas (02/10/2026, antes só
// em Dados), com o botão de tema claro/escuro sempre à direita das ações.
import { forwardRef, type ReactNode } from "react";
import { BotaoTema } from "../components/BotaoTema";
import { cn } from "../lib/cn";

type Props = {
  titulo: ReactNode;
  tituloClassName?: string;
  margem?: "0.5" | "1.5" | "2.5";
  children?: ReactNode;
  className?: string;
};

const MARGEM = { "0.5": "mb-0.5 desktop:mb-0.5", "1.5": "mb-1.5 desktop:mb-1.5", "2.5": "mb-2.5 desktop:mb-2.5" };

export const CabecalhoTela = forwardRef<HTMLDivElement, Props>(function CabecalhoTela(
  { titulo, tituloClassName, margem, children, className },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-end justify-between gap-2.5 paisagem:items-center",
        margem ? MARGEM[margem] : "mb-[22px] paisagem:mb-3 desktop:mb-1.5",
        "desktop:sticky desktop:top-0 desktop:z-10 desktop:border-b-[1.5px] desktop:border-line desktop:bg-paper desktop:pt-[22px] desktop:pb-4",
        "sticky top-0 z-[6] border-b-[1.5px] border-line bg-paper pt-0.5 pb-3.5",
        className
      )}
    >
      <h1
        className={cn(
          "m-0 font-titulo text-5xl font-semibold tracking-[-0.01em] paisagem:text-[23px]",
          tituloClassName
        )}
      >
        {titulo}
      </h1>
      <div className="flex items-center gap-2.5">
        {children}
        <BotaoTema />
      </div>
    </div>
  );
});
