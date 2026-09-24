// Cartão de uma coluna do Kanban (texto + alça de arrastar + botões ‹ ›) e o
// cartão em edição (campo, excluir, salvar, cancelar).
import { useState, type HTMLAttributes } from "react";
import { Icon } from "../../components/Icon";
import { BotaoMover } from "../../ui/BotaoMover";
import { cn } from "../../lib/cn";

const CARTAO =
  "mb-[7px] flex flex-col gap-1.5 rounded-app-sm border-[1.5px] border-line bg-card px-2.5 py-[9px] paisagem:px-2 paisagem:py-[7px] desktop:hover:border-caneta-soft";

type Props = {
  texto: string;
  arrastando: boolean;
  alcaProps: HTMLAttributes<HTMLSpanElement>;
  podeVoltar: boolean;
  podeAvancar: boolean;
  /** o próximo passo é a coluna "feita": o botão vira um ✓ verde */
  paraFeito: boolean;
  onEditar: () => void;
  onVoltar: () => void;
  onAvancar: () => void;
  cartaoRef: (el: HTMLDivElement | null) => void;
};

export function CartaoKanban(p: Props) {
  return (
    <div className={cn(CARTAO, p.arrastando && "opacity-45")} ref={p.cartaoRef}>
      <div className="flex items-start gap-1.5">
        <span
          className="shrink-0 cursor-grab touch-none px-1 py-0.5 text-lg text-sub"
          data-alca-kanban
          {...p.alcaProps}
        >
          <Icon name="bars3" size={15} />
        </span>
        <span className="min-w-0 flex-1 text-base break-words" onClick={p.onEditar}>
          {p.texto}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pl-[23px]">
        <div className="ml-auto flex shrink-0 gap-1">
          <BotaoMover rotulo="Mover para a coluna anterior" disabled={!p.podeVoltar} onClick={p.onVoltar}>
            &lsaquo;
          </BotaoMover>
          <BotaoMover
            rotulo={p.paraFeito ? "Marcar como feito" : "Mover para a próxima coluna"}
            className={p.paraFeito ? "text-[14px] text-ok" : undefined}
            disabled={!p.podeAvancar}
            onClick={p.onAvancar}
          >
            {p.paraFeito ? <Icon name="check" size={14} /> : "›"}
          </BotaoMover>
        </div>
      </div>
    </div>
  );
}

const ACAO = "rounded-[9px] border-0 px-4 py-2 font-sans text-[13.5px]";

/** O campo e o botão "cancelar" ficam com a aparência crua do navegador, como no legado. */
export function EdicaoCartao({
  texto,
  onSave,
  onDelete,
  onCancel,
}: {
  texto: string;
  onSave: (texto: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(texto);
  return (
    <div className={cn(CARTAO, "items-stretch")}>
      <input
        type="text"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave(val.trim() || texto)}
      />
      <div className="mt-2.5 flex justify-between gap-2">
        <button className={cn(ACAO, "bg-card-2 font-normal text-erro")} onClick={onDelete}>
          <Icon name="trash" size={15} />
        </button>
        <button
          className={cn(ACAO, "bg-caneta font-semibold text-on-caneta")}
          onClick={() => onSave(val.trim() || texto)}
        >
          Salvar
        </button>
      </div>
      <button className="mt-1.5" onClick={onCancel}>
        cancelar
      </button>
    </div>
  );
}
