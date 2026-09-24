import { useAppStore } from "../../store/useAppStore";
import { DIAS_ABREV } from "../../lib/constants";
import { ChipsDia } from "../../ui/ChipsDia";
import { SecaoAjuste } from "./SecaoAjuste";

export function SecaoInicioSemana() {
  const weekStart = useAppStore((s) => s.weekStart);
  const setWeekStart = useAppStore((s) => s.setWeekStart);
  return (
    <SecaoAjuste titulo="Início da semana">
      <div className="pt-2.5">
        <ChipsDia className="mt-3.5" rotulos={DIAS_ABREV} ativos={[weekStart]} onToggle={setWeekStart} />
      </div>
    </SecaoAjuste>
  );
}
