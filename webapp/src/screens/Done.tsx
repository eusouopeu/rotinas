// Porta minimalista de renderDone (index.html:12553+) — sem o resumo de
// pontos/streak/badges do original (depende de histórico/gamificação de
// rotina, ainda não portados). Só confirma que a rotina terminou.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";

export function Done() {
  const goTo = useAppStore((s) => s.goTo);

  return (
    <div className="screen" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
      <div className="check-circle" style={{ width: 96, height: 96 }}>
        <Icon name="check" size={40} />
      </div>
      <h2>Rotina concluída</h2>
      {/* .btn-primary é flex:1 por padrão (pensado pra viver dentro de uma
          linha, ex. .bottom-actions) — sem isso ele estica pra preencher a
          coluna inteira aqui. */}
      <button
        className="btn-primary"
        style={{ flex: "0 0 auto", padding: "14px 32px" }}
        onClick={() => goTo({ tab: "home", screen: "home" })}
      >
        Voltar
      </button>
    </div>
  );
}
