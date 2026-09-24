// Porta parcial de renderDesktopTopbar (index.html:3446-3469). Barra fixa no
// topo do desktop: botão de recolher a sidebar e a busca global. Na janela do
// Electron (sem título nativo) ela é a área de arrasto; os botões não.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "./Icon";
import { BotaoIcone } from "../ui/BotaoIcone";

export function DesktopTopbar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const openSearch = useAppStore((s) => s.openSearch);

  return (
    <div className="fixed inset-x-0 top-0 z-30 flex h-[var(--topbar-h)] items-center gap-3 border-b-[1.5px] border-line bg-paper px-[22px] electron:[-webkit-app-region:drag]">
      <BotaoIcone
        semBorda
        rotulo={collapsed ? "Expandir menu" : "Recolher menu"}
        className="electron:[-webkit-app-region:no-drag]"
        onClick={toggleSidebarCollapsed}
      >
        <Icon name="bars3" size={16} />
      </BotaoIcone>
      <button
        className="flex h-[38px] min-w-0 flex-[0_1_420px] cursor-pointer items-center gap-2 rounded-[20px] border-[1.5px] border-line bg-card px-3.5 font-sans text-base text-sub hover:border-caneta-soft hover:text-ink electron:[-webkit-app-region:no-drag]"
        title="Busca global (/)"
        onClick={openSearch}
      >
        <Icon name="magnifyingGlass" size={14} />
        <span className="truncate">Buscar rotinas, metas, notas...</span>
      </button>
      <span className="flex-1" />
    </div>
  );
}
