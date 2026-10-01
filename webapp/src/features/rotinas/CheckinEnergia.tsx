// Check-in de energia (recomendação 11 de 30/09/2026): enquanto o dia não tem
// nota de energia, uma linha discreta na aba Rotinas pede um toque de 1 a 5.
// Depois some; o "desfazer" do rodapé apaga a resposta. A aba Dados cruza a
// energia com o cumprimento das rotinas (lib/energia.ts).
import { useAppStore } from "../../store/useAppStore";
import { chaveEnergia, energiaDoDia } from "../../lib/energia";
import { localKey } from "../../lib/gamificacao";
import { cn } from "../../lib/cn";

export function CheckinEnergia() {
  const diario = useAppStore((s) => s.diario);
  const setDiarioTexto = useAppStore((s) => s.setDiarioTexto);
  const showUndoBanner = useAppStore((s) => s.showUndoBanner);
  const hoje = localKey();
  if (energiaDoDia(diario, hoje) != null) return null;

  function marcar(n: number) {
    setDiarioTexto(chaveEnergia(hoje), String(n));
    showUndoBanner(`Energia de hoje: ${n}`, () => setDiarioTexto(chaveEnergia(hoje), ""));
  }

  return (
    <div className="mb-3.5 flex items-center gap-1.5 rounded-app bg-card-2 py-2 pr-2 pl-4" data-energia="checkin">
      <span className="min-w-0 flex-1 font-sans text-md whitespace-nowrap text-ink">Energia hoje</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Energia ${n} de 5`}
          onClick={() => marcar(n)}
          className={cn(
            "size-8 flex-none cursor-pointer rounded-full border-0 bg-chip-neutro font-sans text-md font-semibold text-ink active:scale-[0.92]",
            "desktop:hover:bg-caneta-soft desktop:hover:text-caneta"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
