// Porta parcial de renderDesktopTopbar (index.html:3446-3469).
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";

export function DesktopTopbar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const openSearch = useAppStore((s) => s.openSearch);

  return (
    <div className="desktop-topbar">
      <button
        className="icon-btn borderless"
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        onClick={toggleSidebarCollapsed}
      >
        <Icon name="bars3" size={16} />
      </button>
      <button className="dtb-search" title="Busca global (/)" onClick={openSearch}>
        <Icon name="magnifyingGlass" size={14} />
        <span>Buscar rotinas, metas, notas...</span>
      </button>
      <span style={{ flex: 1 }} />
    </div>
  );
}
