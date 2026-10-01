// Cartão "Energia e cumprimento" da visão mensal de Dados (recomendação 11 de
// 30/09/2026): taxa de rotinas feitas nos dias de energia baixa, média e alta.
import { useAppStore } from "../../store/useAppStore";
import { energiaXCumprimento } from "../../lib/energia";
import type { MonthDayData } from "../../lib/stats";
import { LinhaBarra } from "../../ui/LinhaBarra";
import { CartaoSecao } from "./CartaoSecao";

export function CartaoEnergia({ dias }: { dias: MonthDayData[] }) {
  const diario = useAppStore((s) => s.diario);
  const faixas = energiaXCumprimento(
    diario,
    dias.map((d) => ({ key: d.key, feitas: d.executedRoutineIds.length, faltas: d.missedCount }))
  );
  if (!faixas.some((f) => f.dias > 0)) return null;
  return (
    <CartaoSecao
      titulo="Energia e cumprimento"
      desc="Rotinas feitas nos dias em que você marcou energia baixa, média ou alta."
    >
      <div data-dados="energia">
        {faixas.map((f) => (
          <LinhaBarra
            key={f.rotulo}
            rotulo={f.rotulo}
            pct={f.taxa ?? 0}
            cor="var(--caneta)"
            valor={f.dias ? `${f.taxa ?? "–"}% · ${f.dias}d` : "sem dias"}
            larguraValor={10}
          />
        ))}
      </div>
    </CartaoSecao>
  );
}
