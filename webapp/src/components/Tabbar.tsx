// Porta de renderTabbar (index.html:3413-3440). O botão central "+" (popup
// global de criação) e o dot de conflito de sync ficam para quando as telas
// que eles abrem/refletem existirem no React — por ora ele é decorativo.
// No desktop, vem sempre acompanhado do DesktopTopbar (mesmo par que
// renderTabbar devolve como fragment quando ehDesktop() no app antigo) — a
// CSS de >=900px assume os dois juntos.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import { DesktopTopbar } from "./DesktopTopbar";
import { useIsDesktop } from "../lib/useIsDesktop";
import type { IconName } from "../lib/icons";
import type { ScreenName } from "../lib/types";

type TabDef = { tab: string; screen: ScreenName; label: string; icon: IconName };

/* Duas pílulas separadas (mockups de 12/09/2026): as quatro abas de conteúdo
   numa, "Ajustes" sozinho na outra. Só ícone — o nome vive no title/aria. */
const TABS: TabDef[] = [
  { tab: "home", screen: "home", label: "Início", icon: "listBullet" },
  { tab: "metas", screen: "metas", label: "Metas", icon: "calendar" },
  { tab: "templates", screen: "notes", label: "Modelos", icon: "templates" },
  { tab: "dados", screen: "stats", label: "Dados", icon: "stats" },
];

const TABS_FIM: TabDef[] = [{ tab: "settings", screen: "settings", label: "Ajustes", icon: "settings" }];

export function Tabbar() {
  const view = useAppStore((s) => s.view);
  const goTo = useAppStore((s) => s.goTo);
  const isDesktop = useIsDesktop();

  function botao(t: TabDef) {
    return (
      <button
        key={t.tab}
        className={view.tab === t.tab ? "active" : ""}
        title={t.label}
        aria-label={t.label}
        onClick={() => goTo({ tab: t.tab, screen: t.screen })}
      >
        <span className="ic">
          <Icon name={t.icon} />
        </span>
        {/* rótulo some no mobile (CSS) e sobrevive na sidebar do desktop */}
        <span className="tab-label">{t.label}</span>
      </button>
    );
  }

  return (
    <>
      <div className="tabbar">
        <div className="tabbar-pill">{TABS.map(botao)}</div>
        <div className="tabbar-pill tabbar-pill-fim">{TABS_FIM.map(botao)}</div>
      </div>
      {isDesktop && <DesktopTopbar />}
    </>
  );
}
