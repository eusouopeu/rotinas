// Barra de topo das telas de detalhe: seta de voltar + título. Era .detail-bar
// + .detail-title. `children` entra à direita do título (ações).
import type { ReactNode } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";
import { BotaoIcone } from "./BotaoIcone";

export function BarraDetalhe({
  titulo,
  onVoltar,
  className,
  children,
}: {
  titulo?: ReactNode;
  onVoltar: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("-ml-2 mb-0.5 flex min-h-11 items-center gap-1.5", className)}>
      <BotaoIcone rotulo="Voltar" semBorda onClick={onVoltar}>
        <Icon name="chevronLeft" size={18} />
      </BotaoIcone>
      {titulo && <h1 className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[24px] text-ellipsis whitespace-nowrap">{titulo}</h1>}
      {children}
    </div>
  );
}
