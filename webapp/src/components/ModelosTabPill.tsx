// Porta de modelosTabPillHtml (index.html:6515) — alterna entre Notas simples
// e as demais pastas de Modelos. Flutua no rodapé na MESMA linha do FAB
// (centralizada na altura dele); no desktop vai para a esquerda do FAB rotulado.
import { useAppStore } from "../store/useAppStore";
import { SegPill } from "../ui/Segmentado";

export function ModelosTabPill({ active }: { active: "notes" | "outros" }) {
  const goTo = useAppStore((s) => s.goTo);
  return (
    <SegPill
      className="fixed bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+29px)] left-1/2 z-[29] w-auto -translate-x-1/2 backdrop-blur-[16px] backdrop-saturate-[1.15] desktop:right-[104px] desktop:bottom-7 desktop:left-auto desktop:translate-x-0"
      options={[
        { key: "notes", label: "Notas" },
        { key: "outros", label: "Outros" },
      ]}
      active={active}
      onSelect={(k) => goTo({ tab: "templates", screen: k === "notes" ? "notes" : "templateFolders" })}
    />
  );
}
