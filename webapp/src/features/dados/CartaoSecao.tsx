// Cartão de Dados com título e explicação dentro (padrão do Kuestion). Com
// `aberto`/`onAlternar` o título vira o botão que abre e fecha o conteúdo
// (seções secundárias começam fechadas); sem eles fica sempre aberto. A
// explicação (`desc`) fica num ⓘ colado ao título, em popover (Ajuda).
import type { ReactNode } from "react";
import { Ajuda } from "../../ui/Ajuda";
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
  const ajuda = desc && <Ajuda rotulo="O que é este cartão">{desc}</Ajuda>;
  return (
    <Cartao className={cn("mb-2.5", NO_PAINEL)}>
      {retratil ? (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={aberto}
          className="flex min-h-8 cursor-pointer items-center gap-1 text-caneta"
          onClick={onAlternar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAlternar!();
            }
          }}
        >
          <span className={TITULO}>{titulo}</span>
          {ajuda}
          <span className="ml-auto flex">
            <Icon name={aberto ? "chevronUp" : "chevronDown"} size={18} />
          </span>
        </div>
      ) : (
        <div className="flex min-h-8 items-center gap-1">
          <div className={TITULO}>{titulo}</div>
          {ajuda}
        </div>
      )}
      {visivel && <div className="mt-3 animate-entra-rapido">{children}</div>}
    </Cartao>
  );
}
