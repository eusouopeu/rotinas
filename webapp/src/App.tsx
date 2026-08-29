// Dispatcher de tela — porta o papel de render()/index.html:3312-3335 (só os
// branches "home" e "settings" existem por enquanto; os outros 39 ficam para
// fases seguintes). Sem router: mesmo modelo de view={tab,screen,id} trocado
// em memória que o app antigo usa, sem depender de URL.
import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { Home } from "./screens/Home";
import { Settings } from "./screens/Settings";
import { RoutineEditor } from "./screens/RoutineEditor";
import { Player } from "./screens/Player";
import { Done } from "./screens/Done";
import { Metas } from "./screens/Metas";
import { Diario } from "./screens/Diario";

// Porta de resolvedTheme/applyTheme (index.html:93-103): "auto" só escurece
// se o sistema pedir tema escuro explicitamente — sem preferência, cai claro.
function useThemeEffect(theme: "auto" | "light" | "dark") {
  useEffect(() => {
    const mqDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function apply() {
      const eff = theme === "auto" ? (mqDark?.matches ? "dark" : "light") : theme;
      document.body.classList.toggle("dark", eff === "dark");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", eff === "dark" ? "#14181C" : "#F5F5F8");
    }
    apply();
    if (theme === "auto" && mqDark) {
      mqDark.addEventListener("change", apply);
      return () => mqDark.removeEventListener("change", apply);
    }
  }, [theme]);
}

function useFontScaleEffect(fontScale: number) {
  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(fontScale));
  }, [fontScale]);
}

// index.html:14447 (boot) + o toggle em DesktopTopbar — classe lida só pelo
// CSS de desktop (sidebar vira "só ícones").
function useSidebarCollapsedEffect(collapsed: boolean) {
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);
}

export function App() {
  const booted = useAppStore((s) => s.booted);
  const boot = useAppStore((s) => s.boot);
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);
  const fontScale = useAppStore((s) => s.fontScale);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    boot();
  }, [boot]);

  useThemeEffect(theme);
  useFontScaleEffect(fontScale);
  useSidebarCollapsedEffect(sidebarCollapsed);

  if (!booted) return null;

  switch (view.screen) {
    case "settings":
      return <Settings />;
    case "editor":
      return <RoutineEditor />;
    case "player":
      return <Player />;
    case "done":
      return <Done />;
    case "metas":
      return <Metas />;
    case "diario":
      return <Diario />;
    case "home":
    default:
      return <Home />;
  }
}
