// Peças do editor de rotina: o botão de "escolher exercício", os três campos
// de série/reps/peso e a linha de sugestão da biblioteca.
import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../lib/icons";
import { cn } from "../../lib/cn";

/** Chip clicável com o exercício da etapa (ou "escolher exercício"); tracejado
 *  enquanto vazio, sólido depois de escolhido. */
export function BotaoEscolha({
  escolhido,
  children,
  className,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { escolhido: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-app-sm border-[1.5px] border-dashed border-line bg-transparent px-2.5 py-1.5 font-sans text-md text-caneta [&>span]:truncate [&>svg:last-child]:shrink-0 [&>svg:last-child]:text-sub",
        escolhido && "border-solid text-ink [&>svg:first-child]:text-caneta",
        className
      )}
      {...resto}
    >
      <Icon name="trophy" size={14} />
      <span>{children}</span>
      <Icon name="chevronRight" size={13} />
    </button>
  );
}

/** Campo de uma etapa de exercício: ícone e unidade em cima, número grande
 *  embaixo. `desligado` esmaece (peso sem exercício escolhido). */
export function CampoExercicio({
  icone,
  unidade,
  titulo,
  desligado,
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & { icone: IconName; unidade: string; titulo: string; desligado?: boolean }) {
  return (
    <label
      title={titulo}
      className={cn(
        "grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-1 gap-y-0.5 rounded-app-sm border-[1.5px] border-line bg-card-2 px-2 py-1.5 text-sub focus-within:border-caneta focus-within:text-caneta [&_svg]:shrink-0",
        desligado && "opacity-50"
      )}
    >
      <Icon name={icone} size={14} />
      <input
        className="col-span-full row-start-2 w-full min-w-0 border-0 bg-transparent p-0 font-sans text-xl font-semibold text-ink focus:outline-none"
        {...resto}
      />
      <span className="font-sans text-xs">{unidade}</span>
    </label>
  );
}
