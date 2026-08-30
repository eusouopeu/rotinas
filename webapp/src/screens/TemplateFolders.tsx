// Porta parcial de renderTemplates (index.html:6500-6543) — tiles de pastas
// fixas por tipo. Sem seção "Anotações de Rotinas" (pastas de journaling por
// rotina, ainda não existem no React) e sem importar backup pelo botão do
// cabeçalho.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { ModelosTabPill } from "../components/ModelosTabPill";
import { TMPL_TYPES } from "../lib/templates";

export function TemplateFolders() {
  const goTo = useAppStore((s) => s.goTo);

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header">
          <h1>Modelos</h1>
        </div>
        <ModelosTabPill active="outros" />
        <div className="tmpl-folders">
          <div className="tmpl-new-grid">
            {TMPL_TYPES.map((f) => (
              <button
                key={f.type}
                className="tmpl-new"
                onClick={() =>
                  f.type === "expense"
                    ? goTo({ tab: "templates", screen: "expenseFolder" })
                    : goTo({ tab: "templates", screen: "tmplFolder", folderKind: "type", folderKey: f.type })
                }
              >
                <span className="tmpl-ic">
                  <Icon name={f.icon} size={22} />
                </span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
