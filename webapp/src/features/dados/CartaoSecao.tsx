// Cartão de Dados com título e explicação dentro (padrão do Kuestion). Com
// `aberto`/`onAlternar` o título vira o botão que abre e fecha o conteúdo
// (seções secundárias começam fechadas); sem eles fica sempre aberto.
import type { ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { Cartao } from "../../ui/Cartao";
import { NO_PAINEL } from "./colunas";
import { cn } from "../../lib/cn";

const TITULO = "text-left font-sans text-sm font-bold tracking-[0.06em] text-caneta uppercase";

type Props = {
  titulo: ReactNode;
  desc?: ReactNode;
  aberto?: boolean;
  onAlternar?: () => void;
  children: ReactNode;
};

export function CartaoSecao({ titulo, desc, aberto, onAlternar, children }: Props) {
  const retratil = onAlternar !== undefined;
  const visivel = !retratil || aberto;
  return (
    <Cartao className={cn("mb-2.5", NO_PAINEL)}>
      {retratil ? (
        <button
          className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 text-caneta"
          aria-expanded={aberto}
          onClick={onAlternar}
        >
          <span className={TITULO}>{titulo}</span>
          <Icon name={aberto ? "chevronUp" : "chevronDown"} size={13} />
        </button>
      ) : (
        <div className={TITULO}>{titulo}</div>
      )}
      {visivel && (
        <>
          {desc && <div className="mt-1 font-sans text-md leading-[1.4] text-sub">{desc}</div>}
          <div className="mt-3">{children}</div>
        </>
      )}
    </Cartao>
  );
}
