// Porta minimalista de renderDone (index.html:12553+) — sem o resumo de
// pontos/streak/badges do original (depende de histórico/gamificação de
// rotina, ainda não portados). Confirma que a rotina terminou e, desde
// 02/10/2026, oferece começar a próxima rotina de hoje (encadear).
import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Botao } from "../ui/Botao";
import { CirculoCheck } from "../ui/CirculoCheck";
import { tela } from "../ui/Tela";
import { estimadorSerie, proximaRotinaDeHoje, routineDurationRaw } from "../lib/routines";
import { computeSchedule } from "../lib/schedule";
import { fmtClock } from "../lib/format";

// Layout de 03/10/2026 (mockup do player, rec. 11): título com o nome da rotina
// e o horário real no centro; ações no rodapé, ao alcance do polegar, com a
// próxima rotina de hoje como cartão (horário · etapas · duração estimada).
export function Done() {
  const goTo = useAppStore((s) => s.goTo);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const ultima = history[history.length - 1];
  const proxima = proximaRotinaDeHoje(routines, history, ultima?.routineId ?? null);
  const infoProxima = useMemo(() => {
    if (!proxima) return "";
    const serie = estimadorSerie(history);
    const etapas = proxima.steps.filter((s) => !s.isRest).length;
    const min = Math.max(1, Math.round(routineDurationRaw(proxima, serie) / 60));
    return [computeSchedule(proxima, serie)?.startStr, `${etapas} ${etapas === 1 ? "etapa" : "etapas"}`, `~${min} min`]
      .filter(Boolean)
      .join(" · ");
  }, [proxima, history]);
  const feitas = ultima ? ultima.steps.filter((s) => !s.isRest && !s.skipped).length : 0;

  return (
    <div {...tela({}, "pb-[calc(var(--safe-bottom)+20px)]")}>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
        <CirculoCheck tamanho="size-[72px]" className="animate-marca border-ok bg-ok text-on-caneta">
          <Icon name="check" size={34} />
        </CirculoCheck>
        <h2 className="mt-2 font-titulo text-[26px] leading-tight font-black text-balance">
          {ultima ? `${ultima.routineName} concluída` : "Rotina concluída"}
        </h2>
        {ultima && (
          <div className="font-sans text-md text-sub tabular-nums">
            {feitas} {feitas === 1 ? "etapa" : "etapas"} · {fmtClock(new Date(ultima.startedTs))} →{" "}
            {fmtClock(new Date(ultima.ts))}
          </div>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-2">
        {proxima && (
          <>
            <div className="pl-1 font-sans text-xs tracking-[0.08em] text-sub uppercase">próxima de hoje</div>
            <button
              type="button"
              className="flex items-center gap-3 rounded-app border-0 bg-card-2 px-3.5 py-3 text-left text-ink"
              onClick={() => startPlayer(proxima.id)}
            >
              <span className="flex size-11 flex-none items-center justify-center rounded-full bg-caneta text-on-caneta">
                <Icon name="play" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold">Começar {proxima.name}</span>
                <span className="block font-sans text-sm text-sub">{infoProxima}</span>
              </span>
            </button>
          </>
        )}
        <Botao
          variante={proxima ? "neutro" : undefined}
          className="flex-none py-3.5"
          onClick={() => goTo({ tab: "home", screen: "home" })}
        >
          Voltar para Rotinas
        </Botao>
      </div>
    </div>
  );
}
