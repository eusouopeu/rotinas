// Navegação de período (◀ título ▶) das visões semanal/mensal/anual. No
// desktop ocupa a faixa toda acima das colunas do painel.
import { Icon } from "../../components/Icon";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { NAV_PAINEL } from "./colunas";

export function NavPeriodo({
  onAnterior,
  onProximo,
  rotuloAnterior,
  rotuloProximo,
  children,
}: {
  onAnterior: () => void;
  onProximo: () => void;
  rotuloAnterior: string;
  rotuloProximo: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", NAV_PAINEL)}>
      <BotaoIcone rotulo={rotuloAnterior} tamanho="sm" onClick={onAnterior}>
        <Icon name="chevronLeft" />
      </BotaoIcone>
      <span className="font-titulo text-3xl font-semibold">{children}</span>
      <BotaoIcone rotulo={rotuloProximo} tamanho="sm" onClick={onProximo}>
        <Icon name="chevronRight" />
      </BotaoIcone>
    </div>
  );
}
