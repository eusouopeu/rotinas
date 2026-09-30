// Peças comuns dos cartões de meta (recorrente e com prazo): a moldura com
// faixa da área e alça de arrasto, o título e o contador +/−. Cada tipo de
// meta monta o miolo (fatos, contador) com estas peças.
import { useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { AlcaArrasto } from "../../ui/AlcaArrasto";
import { CARTAO_CAPSULA, FaixaCor } from "../../ui/PontoCor";
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
  /** fundo de estado: meta concluída (ok) ou estourada (erro); senão o neutro */
  estado?: "ok" | "erro";
  corPonto: string;
  titulo: string;
  /** selo ao lado do título (sequência) */
  selo?: ReactNode;
  /** contador encaixado na ponta direita (ContadorMeta) */
  contador?: ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
  onDuplicar?: () => void;
  children: ReactNode;
};

/** Cartão "cápsula" de meta (mockup de 30/09/2026): faixa da área à esquerda,
 *  alça, nome + selo, fatos embaixo e o contador +/− empilhado na ponta direita
 *  arredondada. Sem borda: o estado (concluída/estourada) vai na cor do
 *  contador ou, sem contador, no fundo. */
export function CartaoMeta({
  setRef,
  isDragging,
  dragHandleProps,
  estado,
  corPonto,
  titulo,
  selo,
  contador,
  onEditar,
  onExcluir,
  onDuplicar,
  children,
}: Props) {
  const cliqueEditar = useCliqueSemArrasto(onEditar);
  return (
    <div ref={setRef} className="mb-2.5">
      <SwipeItem
        className={cn(
          CARTAO_CAPSULA,
          "gap-2 pl-3",
          contador && "rounded-r-[30px] py-2.5 pr-0",
          // com contador, o estado já está na cor do número (e o fundo verde
          // engoliria o botão "+"); sem contador, pinta o cartão
          !contador && estado === "ok" && "bg-ok-soft",
          !contador && estado === "erro" && "bg-erro-soft",
          isDragging && "opacity-[0.45]"
        )}
        wrapClassName={cn(contador && "rounded-r-[30px]")}
        onLeft={onExcluir}
        leftLabel="Excluir"
        onRight={onDuplicar}
        rightLabel="Duplicar"
      >
        <FaixaCor cor={corPonto} />
        <AlcaArrasto className="shrink-0 self-center px-1.5 text-ink" {...dragHandleProps} />
        <div className="min-w-0 flex-1">
          <h3
            className="m-0 mb-1 flex cursor-pointer flex-wrap items-center gap-1 font-titulo text-[19px] font-semibold tracking-[-0.01em]"
            title="Editar meta"
            {...cliqueEditar}
          >
            {titulo}
            {selo}
          </h3>
          {children}
        </div>
        {contador}
      </SwipeItem>
    </div>
  );
}

/** Contador da meta: número "3 / 5" em destaque e os botões + (verde claro) e
 *  − (vermelho claro) empilhados, ocupando a altura da ponta direita do cartão.
 *  O "+" fica sempre em cima (é o gesto principal, inclusive na meta negativa,
 *  onde marca uma ocorrência). */
export function ContadorMeta({
  texto,
  cor,
  onMenos,
  onMais,
  aviso,
}: {
  texto: string;
  cor?: string;
  onMenos: () => void;
  onMais: () => void;
  /** Texto curto ao lado do contador (ex.: pontos do último toque). */
  aviso?: { texto: string; positivo: boolean } | null;
}) {
  const botao = "flex min-h-[38px] w-12 flex-1 cursor-pointer items-center justify-center border-0 text-2xl font-bold";
  return (
    <div className="-my-2.5 flex shrink-0 items-center gap-2.5 self-stretch">
      {aviso && (
        <span
          className={cn("font-sans text-sm font-semibold tabular-nums", aviso.positivo ? "text-ok" : "text-erro")}
          aria-live="polite"
        >
          {aviso.texto}
        </span>
      )}
      <span
        className="font-titulo text-[21px] font-bold whitespace-nowrap tabular-nums"
        style={cor ? { color: cor } : undefined}
      >
        {texto}
      </span>
      <div className="flex flex-col self-stretch">
        <button type="button" title="Mais um" aria-label="Mais um" className={cn(botao, "bg-ok-soft text-ok")} onClick={onMais}>
          +
        </button>
        <button
          type="button"
          title="Menos um"
          aria-label="Menos um"
          className={cn(botao, "bg-erro-soft text-erro")}
          onClick={onMenos}
        >
          &minus;
        </button>
      </div>
    </div>
  );
}
