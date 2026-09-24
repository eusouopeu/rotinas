// Tela/lista sem conteúdo: título, texto de apoio e (opcional) a ação
// principal como `children`. Era .empty-state. Ocupa o espaço livre e centraliza.
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = { titulo: string; texto?: ReactNode; children?: ReactNode; className?: string };

export function EstadoVazio({ titulo, texto, children, className }: Props) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-2.5 text-center text-sub [&>button]:shrink-0", className)}>
      <h2 className="m-0 font-titulo text-4xl font-semibold tracking-[-0.01em] text-ink">{titulo}</h2>
      {texto && <p className="my-3.5 max-w-[260px] text-base leading-normal desktop:max-w-[340px]">{texto}</p>}
      {children}
    </div>
  );
}
