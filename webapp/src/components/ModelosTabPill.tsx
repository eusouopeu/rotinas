// Porta de modelosTabPillHtml (index.html:6515, app.css .modelos-tab-pill) —
// alterna entre Notas simples e as demais pastas de Modelos.
import { useAppStore } from "../store/useAppStore";
import { SegPill } from "./SegPill";

export function ModelosTabPill({ active }: { active: "notes" | "outros" }) {
  const goTo = useAppStore((s) => s.goTo);
  return (
    <SegPill
      className="modelos-tab-pill"
      options={[
        { key: "notes", label: "Notas" },
        { key: "outros", label: "Outros" },
      ]}
      active={active}
      onSelect={(k) => goTo({ tab: "templates", screen: k === "notes" ? "notes" : "templateFolders" })}
    />
  );
}
