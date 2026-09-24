// Fileira de dias da semana clicáveis (D S T Q Q S S). Era .day-chips +
// .day-chip. `rotulos` são as 7 letras/abreviações, na ordem domingo..sábado;
// `ativos` os índices ligados. O espaço acima vem por className (mt-3.5).
import { cn } from "../lib/cn";

type Props = {
  rotulos: readonly string[];
  ativos: number[];
  onToggle: (dia: number) => void;
  className?: string;
};

export function ChipsDia({ rotulos, ativos, onToggle, className }: Props) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {rotulos.map((l, d) => (
        <span
          key={d}
          onClick={() => onToggle(d)}
          className={cn(
            "flex-1 cursor-pointer rounded-[9px] border-[1.5px] py-2 text-center font-sans text-md",
            ativos.includes(d) ? "border-transparent bg-caneta text-on-caneta" : "border-line bg-card-2 text-sub"
          )}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
