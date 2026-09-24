// Peças comuns dos cartões de meta (recorrente e com prazo): a moldura com
// alça de arrasto, título com bolinha da área e o contador −/+. Cada tipo de
// meta monta o miolo (fatos, contador) com estas peças.
import { useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { AlcaArrasto } from "../../ui/AlcaArrasto";
import { BotaoRedondo } from "../../ui/BotaoRedondo";
import { Cartao } from "../../ui/Cartao";
import { SwipeItem } from "../../ui/SwipeItem";

/**
 * Clique no título do card sem disparar quando o dedo estava arrastando o card
 * pro lado (o SwipeItem não cancela o click nativo; aqui só ignoramos o clique
 * que veio de um gesto horizontal).
 */
export function useCliqueSemArrasto(fn: () => void) {
  const origem = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      origem.current = { x: e.clientX, y: e.clientY };
    },
    onClick: (e: React.MouseEvent) => {
      const o = origem.current;
      if (o && (Math.abs(e.clientX - o.x) > 8 || Math.abs(e.clientY - o.y) > 8)) return;
      fn();
    },
  };
}

type Props = {
  setRef: (el: HTMLDivElement | null) => void;
  isDragging: boolean;
  dragHandleProps: Record<string, unknown>;
  /** cor da borda quando a meta está concluída/excedida (senão a padrão) */
  corBorda?: string;
  corPonto: string;
  titulo: string;
  onEditar: () => void;
  onExcluir: () => void;
  onDuplicar?: () => void;
  children: ReactNode;
};

export function CartaoMeta({
  setRef,
  isDragging,
  dragHandleProps,
  corBorda,
  corPonto,
  titulo,
  onEditar,
  onExcluir,
  onDuplicar,
  children,
}: Props) {
  const cliqueEditar = useCliqueSemArrasto(onEditar);
  return (
    <div ref={setRef} className="mb-2.5">
      <SwipeItem
        className={cn(isDragging && "opacity-[0.45]")}
        onLeft={onExcluir}
        leftLabel="Excluir"
        onRight={onDuplicar}
        rightLabel="Duplicar"
      >
        <Cartao className="mb-0 flex items-center gap-2.5" style={{ borderColor: corBorda }}>
          <AlcaArrasto {...dragHandleProps} />
          <div className="min-w-0 flex-1">
            <h3
              className="m-0 mb-1 flex cursor-pointer items-center gap-1.5 font-titulo text-xl font-semibold tracking-[-0.01em]"
              title="Editar meta"
              {...cliqueEditar}
            >
              <span className="mr-[7px] inline-block size-[9px] rounded-full align-[1px]" style={{ background: corPonto }} />
              {titulo}
            </h3>
            {children}
          </div>
        </Cartao>
      </SwipeItem>
    </div>
  );
}

/** Contador "− 3 / 5 +" da meta. `invertido` troca a ordem dos botões (meta
 *  negativa: o "+" vem primeiro, pois marcar é o gesto principal). */
export function ContadorMeta({
  texto,
  cor,
  onMenos,
  onMais,
  invertido,
}: {
  texto: string;
  cor?: string;
  onMenos: () => void;
  onMais: () => void;
  invertido?: boolean;
}) {
  const menos = (
    <BotaoRedondo rotulo="Menos um" tamanho="sm" onClick={onMenos}>
      &minus;
    </BotaoRedondo>
  );
  const mais = (
    <BotaoRedondo rotulo="Mais um" tamanho="sm" onClick={onMais}>
      +
    </BotaoRedondo>
  );
  return (
    <div className="mt-1.5 flex items-center gap-3">
      {invertido ? mais : menos}
      <span className="font-titulo text-xl font-bold" style={cor ? { color: cor } : undefined}>
        {texto}
      </span>
      {invertido ? menos : mais}
    </div>
  );
}
