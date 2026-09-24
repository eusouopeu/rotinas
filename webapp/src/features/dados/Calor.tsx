// Escala de calor (tempo executado no dia): células e legenda do calendário
// mensal e do mapa do ano. `intensity` vem do cálculo ("lv0".."lv4", e no mapa
// "lv0 hm-futuro" / "hm-void").
import { cn } from "../../lib/cn";

const NIVEL: Record<string, string> = {
  lv0: "bg-card-2",
  lv1: "bg-heat-1",
  lv2: "bg-heat-2",
  lv3: "bg-heat-3",
  lv4: "bg-heat-4",
};

/** Cor de fundo (e transparência) de uma célula segundo a intensidade do cálculo. */
export function fundoCalor(intensity: string): string {
  const partes = intensity.split(" ");
  return cn(
    partes.includes("hm-void") ? "bg-transparent" : NIVEL[partes.find((p) => NIVEL[p]) ?? "lv0"],
    partes.includes("hm-futuro") && "opacity-45"
  );
}

export function LegendaCalor({ fim }: { fim: string }) {
  return (
    <div className="mt-2 flex items-center gap-[5px] font-sans text-2xs text-sub">
      <span>menos</span>
      {["lv0", "lv1", "lv2", "lv3", "lv4"].map((n) => (
        <span key={n} className={cn("size-[13px] shrink-0 rounded-[3px]", NIVEL[n])} />
      ))}
      <span>{fim}</span>
    </div>
  );
}
