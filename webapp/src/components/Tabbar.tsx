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
import { cn } from "../lib/cn";

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
    const ativa = view.tab === t.tab;
    return (
      <button
        key={t.tab}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-[3px] border-0 bg-transparent font-sans text-sm text-sub paisagem:gap-px paisagem:text-xs",
          // sidebar do desktop: linha com ícone e rótulo; recolhida, só o ícone
          "desktop:flex-none desktop:flex-row desktop:justify-start desktop:gap-2.5 desktop:rounded-app-sm desktop:px-2.5 desktop:py-[9px] desktop:text-base desktop:transition-[background-color,color] desktop:duration-[140ms] desktop:ease-[ease]",
          "desktop:recolhido:justify-center desktop:recolhido:px-0",
          "desktop:hover:bg-card-2 desktop:hover:text-ink electron:[-webkit-app-region:no-drag]",
          ativa && "text-caneta desktop:bg-caneta-soft desktop:hover:bg-caneta-soft desktop:hover:text-caneta"
        )}
        title={t.label}
        aria-label={t.label}
        aria-current={ativa ? "page" : undefined}
        onClick={() => goTo({ tab: t.tab, screen: t.screen })}
      >
        {/* pílula atrás do ícone da aba ativa; âncora do ponto de conflito de sync */}
        <span
          className={cn(
            "relative flex w-full flex-auto items-center justify-center rounded-pill px-[15px] text-[19px] transition-[background-color] duration-[180ms] ease-[ease] paisagem:text-base",
            "desktop:rounded-none desktop:p-0 desktop:text-2xl",
            ativa && "bg-caneta-soft desktop:bg-transparent"
          )}
        >
          <Icon name={t.icon} />
        </span>
        {/* rótulo some no mobile e sobrevive na sidebar do desktop (menos recolhida) */}
        <span className="hidden desktop:inline desktop:recolhido:hidden">{t.label}</span>
      </button>
    );
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex touch-pan-y items-center gap-2.5 px-3.5 pb-[calc(var(--safe-bottom)+12px)]",
          // desktop: sidebar flutuante à esquerda, abaixo da barra de busca
          "desktop:pointer-events-auto desktop:top-[calc(var(--topbar-h)+14px)] desktop:right-auto desktop:bottom-3.5 desktop:left-3.5 desktop:w-[var(--sidebar-w)] desktop:flex-col desktop:items-stretch desktop:justify-start desktop:gap-0.5 desktop:rounded-app desktop:border-[1.5px] desktop:border-line desktop:bg-card desktop:px-2.5 desktop:py-4 desktop:transition-[width] desktop:duration-[160ms] desktop:ease-[ease]",
          "desktop:before:block desktop:before:px-2.5 desktop:before:pb-4 desktop:before:font-titulo desktop:before:text-2xl desktop:before:font-semibold desktop:before:tracking-[-0.01em] desktop:before:text-ink desktop:before:content-['Rotinas']",
          "desktop:recolhido:before:px-0 desktop:recolhido:before:pb-3 desktop:recolhido:before:text-center desktop:recolhido:before:text-xl desktop:recolhido:before:content-['R']",
          "electron:[-webkit-app-region:drag]"
        )}
      >
        <div data-pilula className={PILULA}>
          {TABS.map(botao)}
        </div>
        <div data-pilula className={cn(PILULA, "flex-[0_0_auto]")}>
          {TABS_FIM.map(botao)}
        </div>
      </div>
      {isDesktop && <DesktopTopbar />}
    </>
  );
}

const PILULA =
  "pointer-events-auto flex h-[var(--tabbar-h)] flex-[1_1_auto] items-stretch rounded-pill border-[1.5px] border-line bg-card-blur p-[5px] backdrop-blur-[16px] backdrop-saturate-[1.15] desktop:contents";
