// Barras flutuantes do editor de nota (formato Apple Notes): faixa fixa no
// topo e no rodapé, com pílulas de vidro (a mesma linguagem da tabbar). Os
// botões só têm ícone, sem texto, e usam a fonte do sistema como no legado.
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Faixa fixa: `topo` ou `rodape`. Deixa o toque passar; só as pílulas o recebem. */
export function BarraNota({
  posicao,
  className,
  ...resto
}: HTMLAttributes<HTMLDivElement> & { posicao: "topo" | "rodape" }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-20 flex items-center gap-2.5 px-3.5",
        posicao === "topo"
          ? "top-[calc(var(--safe-top)+12px)]"
          : "bottom-[calc(var(--safe-bottom)+14px)] gap-2 max-[420px]:px-2.5",
        className
      )}
      {...resto}
    />
  );
}

type PilulaProps = HTMLAttributes<HTMLDivElement> & {
  /** "solta": só o ícone, sem moldura nem vidro (voltar é navegação, não ação) */
  forma?: "vidro" | "solta";
  /** pílula do rodapé: alvo de toque maior; `rolavel` deixa o grupo rolar por dentro */
  rodape?: boolean;
  rolavel?: boolean;
};

export function PilulaNota({ forma = "vidro", rodape, rolavel, className, ...resto }: PilulaProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 rounded-pill border-[1.5px] border-line bg-card-blur p-[5px] backdrop-blur-[16px] backdrop-saturate-[1.15]",
        forma === "solta" && "border-0 bg-transparent p-0 backdrop-blur-none backdrop-saturate-100",
        rodape && "p-1.5 max-[420px]:p-[5px]",
        rodape &&
          (rolavel
            ? "min-w-0 flex-[0_1_auto] [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
            : "flex-none"),
        className
      )}
      {...resto}
    />
  );
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & { tom?: "normal" | "ligado" | "perigo"; rodape?: boolean };

export function BotaoNota({ tom = "normal", rodape, className, type = "button", ...resto }: BotaoProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex size-10 items-center justify-center rounded-pill border-0 bg-transparent text-ink transition-[background-color] duration-[140ms] ease-[ease] active:bg-card-2",
        tom === "ligado" && "bg-caneta-soft text-caneta",
        tom === "perigo" && "text-erro",
        rodape && "flex-none max-[420px]:size-9",
        className
      )}
      {...resto}
    />
  );
}

/** Título (editável) e data na barra do topo: encolhe em vez de empurrar as pílulas. */
export function CabecaNota({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto flex min-w-0 flex-auto flex-col justify-center gap-px px-0.5">{children}</div>
  );
}
