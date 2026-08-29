// Porta parcial de renderDesktopTopbar (index.html:3446-3469). O botão de
// busca fica desabilitado até a busca global existir no React — sem ele,
// `.home-header{ top:var(--topbar-h) }` (app.css, breakpoint desktop) empurra
// o cabeçalho das telas pra baixo sem ninguém ocupando esse espaço em cima.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";

export function DesktopTopbar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

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
      <button className="dtb-search" title="Busca global ainda não migrada" disabled>
        <Icon name="magnifyingGlass" size={14} />
        <span>Buscar rotinas, metas, notas, modelos...</span>
      </button>
      <span style={{ flex: 1 }} />
    </div>
  );
}
