// Fileira de dias da semana clicáveis (D S T Q Q S S). Era .day-chips +
// .day-chip. `rotulos` são as 7 letras/abreviações, na ordem domingo..sábado;
// `ativos` os índices ligados. O espaço acima vem por className (mt-3.5).
// Sem borda desde 30/09/2026: o fundo cinza já separa do cartão/popup.
import { cn } from "../lib/cn";

type Props = {
  rotulos: readonly string[];
  ativos: number[];
  onToggle: (dia: number) => void;
  /** dica ao passar o mouse, por dia (opcional) */
  titulos?: readonly string[];
  className?: string;
};

export function ChipsDia({ rotulos, ativos, onToggle, titulos, className }: Props) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {rotulos.map((l, d) => (
        <span
          key={d}
          title={titulos?.[d]}
          onClick={() => onToggle(d)}
          className={cn(
            "flex-1 cursor-pointer rounded-[9px] py-2 text-center font-sans text-md",
            ativos.includes(d) ? "bg-caneta-500 font-semibold text-on-caneta" : "bg-chip-neutro text-ink"
          )}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
