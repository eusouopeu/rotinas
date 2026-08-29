// Porta de renderTabbar (index.html:3413-3440). O botão central "+" (popup
// global de criação) e o dot de conflito de sync ficam para quando as telas
// que eles abrem/refletem existirem no React — por ora ele é decorativo.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import type { ScreenName } from "../lib/types";

const TABS: Array<{ tab: string; screen: ScreenName; label: string; icon: "home" | "countdown" | "templates" | "settings" }> = [
  { tab: "home", screen: "home", label: "Rotinas", icon: "home" },
  { tab: "settings", screen: "settings", label: "Ajustes", icon: "settings" },
];

export function Tabbar() {
  const view = useAppStore((s) => s.view);
  const goTo = useAppStore((s) => s.goTo);

  return (
    <div className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.tab}
          className={view.tab === t.tab ? "active" : ""}
          onClick={() => goTo({ tab: t.tab, screen: t.screen })}
        >
          <span className="ic">
            <Icon name={t.icon} />
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
