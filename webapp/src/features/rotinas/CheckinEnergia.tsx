// Check-in de energia (recomendação 11 de 30/09/2026): enquanto o dia não tem
// nota de energia, uma linha discreta na aba Rotinas pede um toque de 1 a 5.
// Depois some; o "desfazer" do rodapé apaga a resposta. A aba Dados cruza a
// energia com o cumprimento das rotinas (lib/energia.ts).
import { useAppStore } from "../../store/useAppStore";
import { chaveEnergia, energiaDoDia } from "../../lib/energia";
import { execucaoDoDia } from "../../lib/history";
import { temVersaoMinima } from "../../lib/player";
import { rotinaCabeEmHoje } from "../../lib/routines";
import { Icon } from "../../components/Icon";
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

/** Energia 1–2 hoje (01/10/2026): sugere a versão mínima das rotinas de hoje
 *  ainda não feitas que têm etapas essenciais — a sequência continua viva
 *  com menos esforço. */
export function SugestaoMinima() {
  const diario = useAppStore((s) => s.diario);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const hoje = localKey();
  const energia = energiaDoDia(diario, hoje);
  if (energia == null || energia > 2) return null;
  const alvo = routines.filter(
    (r) => !r.arquivada && temVersaoMinima(r) && rotinaCabeEmHoje(r) && !execucaoDoDia(history, r.id, hoje)
  );
  if (!alvo.length) return null;
  return (
    <div className="mb-3.5 rounded-app bg-card-2 px-4 py-3" data-energia="minima">
      <div className="font-sans text-md text-ink">Energia baixa hoje: faça a versão mínima</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {alvo.map((r) => (
          <button
            key={r.id}
            type="button"
            className="inline-flex items-center gap-1 rounded-pill border-0 bg-caneta-soft px-3 py-1.5 font-sans text-md text-caneta active:scale-[0.96]"
            onClick={() => startPlayer(r.id, { minima: true })}
          >
            <Icon name="play" size={12} /> {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}
