// Peças pequenas do Boletim: linha "nome … valor" sem barra, linha de badges e
// as barras de nota por semana.
import type { ReactNode } from "react";
import { BADGE_CHAR, BADGE_COR, type BadgeContagem } from "../../lib/boletim";
import { cn } from "../../lib/cn";

/** Nome (34% da linha) e valor logo depois, sem trilho. `estender`: o valor
 *  ocupa o resto e alinha à direita (tendência por área). */
export function LinhaSimples({
  rotulo,
  corRotulo,
  estender,
  children,
}: {
  rotulo: ReactNode;
  corRotulo?: string;
  estender?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="my-2 flex items-center gap-2.5">
      <div
        className="w-[34%] overflow-hidden text-[13.5px] text-ellipsis whitespace-nowrap"
        style={corRotulo ? { color: corRotulo } : undefined}
      >
        {rotulo}
      </div>
      <div className={cn("text-right font-sans text-sm text-sub tabular-nums", estender && "flex-1")}>{children}</div>
    </div>
  );
}

// Porta de linhaBadgesHtml (index.html:13334-13339) — sempre os 4 tipos,
// mesmo com contagem zero (mostra "◇ 0" etc.), igual ao legado.
export function LinhaBadges({ cont }: { cont: BadgeContagem }) {
  const tipos: Array<keyof BadgeContagem> = ["diamante", "ouro", "prata", "bronze"];
  return (
    <>
      {tipos.map((tipo) => (
        <span key={tipo} className="mr-3.5" style={{ color: BADGE_COR[tipo] }}>
          {BADGE_CHAR[tipo]} {cont[tipo]}
        </span>
      ))}
    </>
  );
}

/** Uma barra por semana (nota 0–100); a semana em curso fica esmaecida e a
 *  dispensada cinza. Só a primeira, a última e a em curso ganham data embaixo. */
export function BarrasSemanas({
  semanas,
}: {
  semanas: Array<{ chave: string; titulo: string; rotulo: string; altura: number; cor: string; opacidade: string }>;
}) {
  return (
    <div className="flex h-[84px] items-end gap-0.5">
      {semanas.map((s) => (
        <div key={s.chave} className="flex h-full flex-1 flex-col items-center" title={s.titulo}>
          <span className="h-3 font-sans text-[9.5px] leading-3 text-sub">{s.rotulo}</span>
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-[12px] rounded-[2px_2px_0_0] bg-caneta"
              style={{ height: s.altura, background: s.cor, opacity: s.opacidade }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
