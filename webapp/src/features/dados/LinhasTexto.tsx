// Lista de frases (dicas, insights) com ícone à esquerda e filete entre elas.
// O texto vem do cálculo já com marcação simples (<b>…</b>).
import { Icon } from "../../components/Icon";
import type { IconName } from "../../lib/icons";
import { cn } from "../../lib/cn";

export function LinhasTexto({ textos, icone }: { textos: string[]; icone: IconName }) {
  return (
    <>
      {textos.map((txt, i) => (
        <div key={i} className={cn("flex items-start gap-2", i > 0 && "mt-2.5 border-t-[1.5px] border-line pt-2.5")}>
          <span className="mt-px flex-none text-caneta">
            <Icon name={icone} size={14} />
          </span>
          <span className="font-sans text-[13.5px] text-ink" dangerouslySetInnerHTML={{ __html: txt }} />
        </div>
      ))}
    </>
  );
}
