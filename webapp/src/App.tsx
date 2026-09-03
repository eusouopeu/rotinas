// Dispatcher de tela — porta o papel de render()/index.html:3312-3335 (só os
// branches "home" e "settings" existem por enquanto; os outros 39 ficam para
// fases seguintes). Sem router: mesmo modelo de view={tab,screen,id} trocado
// em memória que o app antigo usa, sem depender de URL.
import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { computeRemaining } from "./lib/player";
import { isDesktop } from "./lib/storage";
import { Home } from "./screens/Home";
import { Settings } from "./screens/Settings";
import { RoutineEditor } from "./screens/RoutineEditor";
import { RoutineDetail } from "./screens/RoutineDetail";
import { Player } from "./screens/Player";
import { Done } from "./screens/Done";
import { Metas } from "./screens/Metas";
import { Notes } from "./screens/Notes";
import { NoteEditor } from "./screens/NoteEditor";
import { TemplateFolders } from "./screens/TemplateFolders";
import { TmplFolder } from "./screens/TmplFolder";
import { TemplateDoc } from "./screens/TemplateDoc";
import { ExpenseFolder } from "./screens/ExpenseFolder";
import { Boletim } from "./screens/Boletim";
import { GlobalSearch } from "./components/GlobalSearch";

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

// Atalho "/" abre a busca global (index.html TECLA_ABA) — só os outros
// atalhos de tela (1..5, Esc) ainda não foram portados. `digitandoAgora()`:
// não rouba "/" de quem está digitando num input/textarea/contenteditable.
function useGlobalSearchShortcut(openSearch: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const digitando = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (digitando) return;
      e.preventDefault();
      openSearch();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch]);
}

// Registra, na janela principal, o handler que responde ao round-trip da
// mini-player (index.html:14650-14674) — janela separada sempre-no-topo que
// só pergunta "getState" (poll de 1s) e manda "control". Inerte hoje: o
// Electron ainda carrega o app legado, não este build (ver
// docs/react-migration.md), então window.electronBridge.onPlayerCall nunca
// dispara no runtime atual — fica pronto pro dia em que o Electron trocar.
function useMiniPlayerBridge() {
  useEffect(() => {
    if (!isDesktop || !window.electronBridge?.onPlayerCall) return;
    window.electronBridge.onPlayerCall(async (tool, args) => {
      const { playerState, view, togglePause, advanceStep } = useAppStore.getState();
      if (tool === "getState") {
        if (!playerState || view.screen !== "player") return null;
        const step = playerState.steps[playerState.idx];
        return {
          routineName: playerState.routineName,
          stepName: step.name,
          idx: playerState.idx,
          total: playerState.steps.length,
          isTimer: step.type === "timer",
          remaining: step.type === "timer" ? computeRemaining(playerState) : null,
          paused: !!playerState.paused,
        };
      }
      if (tool === "control") {
        if (!playerState) return null;
        if (args === "pause") togglePause();
        else if (args === "next") advanceStep();
        return true;
      }
      return null;
    });
  }, []);
}

function Screen({ screen }: { screen: string }) {
  switch (screen) {
    case "settings":
      return <Settings />;
    case "editor":
      return <RoutineEditor />;
    case "routineDetail":
      return <RoutineDetail />;
    case "player":
      return <Player />;
    case "done":
      return <Done />;
    case "metas":
      return <Metas />;
    case "notes":
      return <Notes />;
    case "noteEditor":
      return <NoteEditor />;
    case "templateFolders":
      return <TemplateFolders />;
    case "tmplFolder":
      return <TmplFolder />;
    case "templateDoc":
      return <TemplateDoc />;
    case "expenseFolder":
      return <ExpenseFolder />;
    case "boletim":
      return <Boletim />;
    case "home":
    default:
      return <Home />;
  }
}

export function App() {
  const booted = useAppStore((s) => s.booted);
  const boot = useAppStore((s) => s.boot);
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);
  const fontScale = useAppStore((s) => s.fontScale);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const openSearch = useAppStore((s) => s.openSearch);

  useEffect(() => {
    boot();
  }, [boot]);

  useThemeEffect(theme);
  useFontScaleEffect(fontScale);
  useSidebarCollapsedEffect(sidebarCollapsed);
  useGlobalSearchShortcut(openSearch);
  useMiniPlayerBridge();

  if (!booted) return null;

  return (
    <>
      <Screen screen={view.screen} />
      <GlobalSearch />
    </>
  );
}
