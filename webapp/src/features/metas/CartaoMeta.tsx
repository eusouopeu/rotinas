// Peças comuns dos cartões de meta (recorrente e com prazo), mockup de
// 02/10/2026: cartão de meia largura (grade de 2) com a faixa da área no topo,
// título, fatos (xp, sequência), as bolinhas da semana e o contador +/− de
// ponta a ponta no rodapé. Cada tipo de meta monta o miolo com estas peças.
import { useRef, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { DAY_LETTERS } from "../../lib/schedule";
import type { DiaSemanaMeta, EstadoDiaMeta } from "../../lib/metas";
import { AlcaArrasto } from "../../ui/AlcaArrasto";
import { Etiqueta } from "../../ui/Etiqueta";
import { FaixaCor } from "../../ui/PontoCor";
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
  /** sem contador, a meta concluída pinta o fundo */
  estado?: "ok" | "erro";
  corPonto: string;
  titulo: string;
  /** linha acima do título (prazo + sequência, na meta com prazo) */
  topo?: ReactNode;
  /** rodapé de ponta a ponta (botões − / +) */
  rodape?: ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
  onDuplicar?: () => void;
  children: ReactNode;
};

export function CartaoMeta({
  setRef,
  isDragging,
  dragHandleProps,
  estado,
  corPonto,
  titulo,
  topo,
  rodape,
  onEditar,
  onExcluir,
  onDuplicar,
  children,
}: Props) {
  const cliqueEditar = useCliqueSemArrasto(onEditar);
  return (
    // a transparência do arrasto vai na moldura de fora: no cartão (track do
    // SwipeItem) ela deixava ver os botões Excluir/Duplicar escondidos atrás
    <div ref={setRef} className={cn("h-full", isDragging && "opacity-[0.45]")}>
      <SwipeItem
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-app bg-card-2 transition-transform duration-[140ms] active:scale-[0.985]",
          !rodape && estado === "ok" && "bg-ok-soft",
          !rodape && estado === "erro" && "bg-erro-soft"
        )}
        wrapClassName="h-full rounded-app"
        onLeft={onExcluir}
        leftLabel="Excluir"
        onRight={onDuplicar}
        rightLabel="Duplicar"
      >
        <FaixaCor topo cor={corPonto} />
        <div className="min-w-0 flex-1 px-3 pt-[15px] pb-2.5">
          {topo && <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">{topo}</div>}
          <div className="flex items-start">
            <h3
              className="m-0 mb-1 min-w-0 flex-1 cursor-pointer font-sans text-lg leading-tight font-bold"
              title="Editar meta"
              {...cliqueEditar}
            >
              {titulo}
            </h3>
            <AlcaArrasto className="-mt-1 -mr-2 shrink-0 px-1.5 text-sub" {...dragHandleProps} />
          </div>
          {children}
        </div>
        {rodape}
      </SwipeItem>
    </div>
  );
}

/** Selo de sequência "N – Mx" das metas (mesmo desenho do StreakTag das
 *  rotinas); aparece mesmo zerado. */
export function SeloSequencia({ n, execucoes, title }: { n: number; execucoes: number; title: string }) {
  return (
    <Etiqueta tom="streak" className="font-semibold" title={title}>
      <Icon name="fire" size={13} /> {n} – {execucoes}x
    </Etiqueta>
  );
}

const TOM_DIA: Record<EstadoDiaMeta, string> = {
  feitoPrevisto: "border-ink bg-ok-soft text-ok",
  feito: "border-transparent bg-ok-soft text-ok",
  perdido: "border-erro bg-erro-soft text-erro",
  previsto: "border-ink bg-chip-neutro text-ink",
  livre: "border-transparent bg-chip-neutro text-sub",
};
const NOME_ESTADO: Record<EstadoDiaMeta, string> = {
  feitoPrevisto: "feito",
  feito: "feito (fora dos dias previstos)",
  perdido: "previsto, não feito",
  previsto: "previsto",
  livre: "livre",
};
const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Bolinhas da semana (início da semana dos Ajustes): contorno = dia previsto;
 *  verde = feito; vermelho = previsto que passou em branco. */
export function SemanaMeta({ dias }: { dias: DiaSemanaMeta[] }) {
  return (
    <div className="mt-2 flex justify-between" role="list" aria-label="Esta semana">
      {dias.map((d) => (
        <span
          key={d.iso}
          role="listitem"
          title={`${DIAS_NOME[d.dow]}: ${NOME_ESTADO[d.estado]}`}
          className={cn(
            "flex size-[22px] items-center justify-center rounded-full border-[1.5px] font-sans text-2xs font-semibold",
            TOM_DIA[d.estado]
          )}
        >
          {DAY_LETTERS[d.dow]}
        </span>
      ))}
    </div>
  );
}

const BOTAO_CONTADOR =
  "flex cursor-pointer items-center justify-center border-0 font-sans text-3xl font-bold text-on-caneta transition-[filter,transform] duration-100 active:brightness-90";

/** Rodapé do cartão: − vermelho e + verde de ponta a ponta. Com `meio`, o
 *  número fica entre os dois (meta recorrente); sem ele, cada botão ocupa
 *  metade (meta com prazo, que mostra o número no corpo). O "+" é sempre o
 *  gesto principal, inclusive na meta negativa, onde marca uma ocorrência. */
export function RodapeContador({
  meio,
  onMenos,
  onMais,
}: {
  meio?: ReactNode;
  onMenos: () => void;
  onMais: () => void;
}) {
  return (
    <div className="flex h-14 flex-none items-stretch">
      <button
        type="button"
        title="Menos um"
        aria-label="Menos um"
        className={cn(BOTAO_CONTADOR, "bg-erro", meio ? "w-[30%]" : "flex-1")}
        onClick={onMenos}
      >
        &minus;
      </button>
      {meio && <div className="flex min-w-0 flex-1 flex-col items-center justify-center">{meio}</div>}
      <button
        type="button"
        title="Mais um"
        aria-label="Mais um"
        className={cn(BOTAO_CONTADOR, "bg-ok", meio ? "w-[30%]" : "flex-1")}
        onClick={onMais}
      >
        +
      </button>
    </div>
  );
}

/** Número do contador ("2 / 5") com a legenda embaixo ("na semana",
 *  "questões"). key = texto: cada mudança remonta e o pulinho (bump) toca. */
export function NumeroMeta({
  texto,
  legenda,
  ok,
  erro,
  grande,
}: {
  texto: string;
  legenda?: string;
  ok?: boolean;
  erro?: boolean;
  grande?: boolean;
}) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span
        key={texto}
        className={cn(
          "animate-bump font-sans font-bold whitespace-nowrap tabular-nums",
          grande ? "text-[26px]" : "text-[22px]",
          ok && "text-ok",
          erro && "text-erro"
        )}
      >
        {texto}
      </span>
      {legenda && <span className="mt-0.5 font-sans text-sm text-ink">{legenda}</span>}
    </div>
  );
}
