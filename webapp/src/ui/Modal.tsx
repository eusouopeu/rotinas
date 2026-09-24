// Caixa de diálogo centralizada sobre um fundo escurecido (era
// .confirm-overlay + .confirm-box). Clicar no fundo chama `onFechar`.
// Uso: <Modal onFechar={..}><ModalTexto>..</ModalTexto><ModalAcoes>
//        <Botao variante="neutro" tamanho="modal">Cancelar</Botao> ...
// `posicao="topo"` encosta a caixa no topo (busca global).
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = {
  children: ReactNode;
  onFechar?: () => void;
  posicao?: "centro" | "topo";
  /** classes da caixa (largura máxima, altura, rolagem) */
  className?: string;
};

export function Modal({ children, onFechar, posicao = "centro", className }: Props) {
  return (
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 z-[1000] flex animate-entra-rapido justify-center bg-scrim",
        posicao === "topo" ? "items-start px-[18px] py-6" : "items-center p-[30px]"
      )}
      onClick={(e) => e.target === e.currentTarget && onFechar?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn("w-full max-w-80 rounded-xl border-[1.5px] border-line bg-card p-[22px]", className)}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTexto({ className, ...resto }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 mb-[18px] text-[15.5px] leading-normal", className)} {...resto} />;
}

export function ModalAcoes({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex gap-2.5", className)} {...resto} />;
}
