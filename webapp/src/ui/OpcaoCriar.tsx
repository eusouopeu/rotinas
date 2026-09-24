// Linha de escolha do popup "Criar" (Rotinas: rotina/evento; Metas: recorrente/
// prazo): ícone à esquerda, título e descrição à direita. Era .novo-opcao.
// Não traz font-family (o botão herdava a fonte do sistema no legado).
import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../components/Icon";
import type { IconName } from "../lib/icons";
import { cn } from "../lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { icone: IconName; titulo: string; descricao: string };

export function OpcaoCriar({ icone, titulo, descricao, className, type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "grid w-full grid-cols-[20px_1fr] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-0.5 rounded-app-sm border-[1.5px] border-line bg-card px-3.5 py-3 text-left text-ink active:bg-card-2 [&>svg]:text-caneta [&>svg]:[grid-row:1/span_2]",
        className
      )}
      {...resto}
    >
      <Icon name={icone} size={16} />
      <b>{titulo}</b>
      <span className="col-start-2 font-sans text-sm text-sub">{descricao}</span>
    </button>
  );
}
