// Grade do placar: uma coluna por jogador, uma linha por turno, a linha de
// totais logo abaixo do cabeçalho. A coluna do número do turno gruda à
// esquerda (com muitos jogadores a grade rola). Com 4–5 jogadores a letra
// encolhe (compacto), com 6+ encolhe mais (mini) para tudo caber sem rolar.
import { Fragment } from "react";
import { BotaoApagar } from "../../ui/BotaoApagar";
import { cn } from "../../lib/cn";
import type { ScoreboardDoc } from "../../lib/types";

type Densidade = "normal" | "compacto" | "mini";

const NOME: Record<Densidade, string> = { normal: "text-base", compacto: "text-sm", mini: "text-[10.5px]" };
const TOTAL: Record<Densidade, string> = { normal: "text-[20px]", compacto: "text-xl", mini: "text-[13.5px]" };
const PONTO: Record<Densidade, string> = { normal: "text-xl", compacto: "text-base", mini: "text-[12.5px]" };

const CEL = "flex min-w-0 items-center justify-center border-b-[1.5px] border-line py-1.5 px-0.5";
const INDICE = "sticky left-0 z-[1] bg-paper font-sans text-xs text-sub";

type Props = {
  doc: ScoreboardDoc;
  totais: Record<string, number>;
  lideres: string[];
  onRenomear: (id: string, nome: string) => void;
  onRemoverJogador: (id: string, indice: number) => void;
  onPonto: (turnoId: string, jogadorId: string, bruto: string) => void;
  onRemoverTurno: (id: string) => void;
};

export function GradePlacar({ doc, totais, lideres, onRenomear, onRemoverJogador, onPonto, onRemoverTurno }: Props) {
  const n = doc.players.length;
  const dens: Densidade = n >= 6 ? "mini" : n >= 4 ? "compacto" : "normal";
  const cel = cn(CEL, dens === "mini" && "px-px py-[5px]");
  const total = cn(cel, "border-b-2 bg-card font-sans font-semibold", TOTAL[dens]);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid w-full items-stretch"
        style={{ gridTemplateColumns: `26px repeat(${n}, minmax(0, 1fr)) 26px` }}
      >
        <div className={cn(cel, "flex-col gap-px", INDICE)}>#</div>
        {doc.players.map((p, pi) => (
          <div className={cn(cel, "flex-col gap-px")} key={p.id}>
            <input
              type="text"
              className={cn(
                "w-full min-w-0 border-0 bg-transparent px-0 py-0.5 text-center font-titulo text-ellipsis text-ink focus:text-caneta focus:outline-none",
                NOME[dens]
              )}
              defaultValue={p.name}
              placeholder={`J${pi + 1}`}
              onBlur={(e) => e.target.value !== p.name && onRenomear(p.id, e.target.value)}
            />
            {n > 1 && (
              <BotaoApagar
                className="p-0 text-[10px] leading-none"
                title="Remover jogador"
                aria-label="Remover jogador"
                onClick={() => onRemoverJogador(p.id, pi)}
              />
            )}
          </div>
        ))}
        <div className={cn(cel, "flex-col gap-px")} />
        <div className={cn(total, "sticky left-0 z-[1] text-sub")}>&Sigma;</div>
        {doc.players.map((p) => (
          <div className={cn(total, lideres.includes(p.id) && "text-caneta")} key={p.id}>
            {totais[p.id]}
          </div>
        ))}
        <div className={total} />
        {doc.rounds.map((r, ri) => (
          <Fragment key={r.id}>
            <div className={cn(cel, INDICE)}>{ri + 1}</div>
            {doc.players.map((p) => (
              <div className={cel} key={r.id + "-" + p.id}>
                <input
                  type="number"
                  inputMode="numeric"
                  className={cn(
                    "w-full min-w-0 appearance-none border-0 bg-transparent px-0 py-1 text-center font-sans text-ink focus:rounded-[6px] focus:bg-card focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
                    PONTO[dens]
                  )}
                  defaultValue={r.scores[p.id] ?? ""}
                  placeholder="–"
                  onBlur={(e) => onPonto(r.id, p.id, e.target.value)}
                />
              </div>
            ))}
            <div className={cel}>
              <BotaoApagar title="Remover turno" aria-label="Remover turno" onClick={() => onRemoverTurno(r.id)} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
