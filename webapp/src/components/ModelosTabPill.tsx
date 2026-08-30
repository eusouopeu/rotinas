// Porta de modelosTabPillHtml (index.html:6515, app.css .modelos-tab-pill) —
// alterna entre Notas simples e as demais pastas de Modelos.
import { useAppStore } from "../store/useAppStore";

export function ModelosTabPill({ active }: { active: "notes" | "outros" }) {
  const goTo = useAppStore((s) => s.goTo);
  return (
    <div className="type-toggle view-toggle modelos-tab-pill">
      <span className={active === "notes" ? "active" : ""} onClick={() => goTo({ tab: "templates", screen: "notes" })}>
        Notas
      </span>
      <span
        className={active === "outros" ? "active" : ""}
        onClick={() => goTo({ tab: "templates", screen: "templateFolders" })}
      >
        Outros
      </span>
    </div>
  );
}
