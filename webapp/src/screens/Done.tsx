// Porta minimalista de renderDone (index.html:12553+) — sem o resumo de
// pontos/streak/badges do original (depende de histórico/gamificação de
// rotina, ainda não portados). Só confirma que a rotina terminou.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Botao } from "../ui/Botao";
import { CirculoCheck } from "../ui/CirculoCheck";

export function Done() {
  const goTo = useAppStore((s) => s.goTo);

  return (
    <div className="screen items-center justify-center gap-4 text-center">
      <CirculoCheck tamanho="size-24">
        <Icon name="check" size={40} />
      </CirculoCheck>
      <h2>Rotina concluída</h2>
      <Botao className="flex-none px-8 py-3.5" onClick={() => goTo({ tab: "home", screen: "home" })}>
        Voltar
      </Botao>
    </div>
  );
}
