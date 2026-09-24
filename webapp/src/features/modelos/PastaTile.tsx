// Ladrilho de pasta/tipo de Modelos (era .tmpl-new + .tmpl-ic): ícone em cima,
// nome embaixo, contorno tracejado. Usado na tela de pastas e no popup "Criar
// novo". `GradePastas` é a grade (3 colunas; 4 no desktop e no celular deitado).
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../lib/icons";
import { cn } from "../../lib/cn";

export function PastaTile({
  icone,
  rotulo,
  className,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { icone: IconName; rotulo: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex aspect-square min-h-0 flex-col items-center justify-center gap-[7px] rounded-[12px] border-[1.5px] border-dashed border-caneta-soft bg-card px-1.5 py-[9px] text-center font-sans text-sm text-ink [&_.icon-svg]:align-baseline desktop:aspect-auto desktop:min-h-24 desktop:text-md desktop:hover:border-caneta desktop:hover:bg-card-2",
        className
      )}
      {...resto}
    >
      <span className="flex h-[19px] items-center justify-center text-[19px] desktop:h-[22px] desktop:text-[22px]">
        <Icon name={icone} size={22} />
      </span>
      <span>{rotulo}</span>
    </button>
  );
}

export function GradePastas({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-[18px] grid grid-cols-3 gap-2 paisagem:grid-cols-4 desktop:grid-cols-4 desktop:gap-2.5",
        className
      )}
      {...resto}
    />
  );
}

/** Separador com o nome da seção no meio ("GERAL", "LISTAS"): filete, texto, filete. */
export function SeparadorSecao({ children }: { children: string }) {
  return (
    <div className="mt-0.5 mb-3.5 flex items-center gap-2.5 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
      <span className="font-sans text-[10.5px] tracking-[0.08em] text-sub uppercase">{children}</span>
    </div>
  );
}
