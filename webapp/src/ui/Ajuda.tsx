// Ajuda recolhida (minimalismo.md, "Texto e rótulos"): explicação de como algo
// funciona não fica impressa embaixo da função — vive atrás de um ⓘ e abre
// com um toque. `inline` põe o ⓘ ao lado de um título (o texto abre embaixo
// do bloco que o contém); sem ele, o ⓘ ocupa a própria linha, à esquerda.
import { useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";

export function Ajuda({ children, className, rotulo = "Como funciona" }: { children: ReactNode; className?: string; rotulo?: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className={cn("mt-1.5", className)} data-ajuda>
      <BotaoAjuda aberta={aberta} rotulo={rotulo} onClick={() => setAberta(!aberta)} />
      {aberta && <div className="mt-0.5 font-sans text-sm leading-[1.45] text-sub">{children}</div>}
    </div>
  );
}

export function BotaoAjuda({
  aberta,
  rotulo = "Como funciona",
  onClick,
}: {
  aberta: boolean;
  rotulo?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={aberta}
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className={cn(
        "-ml-1.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent align-middle [&_.icon-svg]:size-[18px]",
        aberta ? "text-caneta" : "text-sub"
      )}
    >
      <Icon name="infoCircle" />
    </button>
  );
}
