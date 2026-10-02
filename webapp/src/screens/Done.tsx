// Porta minimalista de renderDone (index.html:12553+) — sem o resumo de
// pontos/streak/badges do original (depende de histórico/gamificação de
// rotina, ainda não portados). Confirma que a rotina terminou e, desde
// 02/10/2026, oferece começar a próxima rotina de hoje (encadear).
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Botao } from "../ui/Botao";
import { CirculoCheck } from "../ui/CirculoCheck";
import { tela } from "../ui/Tela";
import { proximaRotinaDeHoje } from "../lib/routines";

export function Done() {
  const goTo = useAppStore((s) => s.goTo);
  const startPlayer = useAppStore((s) => s.startPlayer);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const ultima = history[history.length - 1];
  const proxima = proximaRotinaDeHoje(routines, history, ultima?.routineId ?? null);

  return (
    <div {...tela({}, "items-center justify-center gap-4 text-center")}>
      <CirculoCheck tamanho="size-24" className="animate-marca">
        <Icon name="check" size={40} />
      </CirculoCheck>
      <h2>Rotina concluída</h2>
      {proxima && (
        <Botao className="flex-none px-8 py-3.5" onClick={() => startPlayer(proxima.id)}>
          <Icon name="play" size={14} /> Começar {proxima.name}
        </Botao>
      )}
      <Botao
        variante={proxima ? "neutro" : undefined}
        className="flex-none px-8 py-3.5"
        onClick={() => goTo({ tab: "home", screen: "home" })}
      >
        Voltar
      </Botao>
    </div>
  );
}
