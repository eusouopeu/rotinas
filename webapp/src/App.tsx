// Dispatcher de tela — porta o papel de render()/index.html:3312-3335 (só os
// branches "home" e "settings" existem por enquanto; os outros 39 ficam para
// fases seguintes). Sem router: mesmo modelo de view={tab,screen,id} trocado
// em memória que o app antigo usa, sem depender de URL.
import { Activity, useEffect, useState } from "react";
import { atualizarIcalSeVencido } from "./lib/ical";
import { syncLembreteGasto, TAG_LEMBRETE_GASTO } from "./lib/lembreteGasto";
import { useAppStore } from "./store/useAppStore";
import { computeRemaining } from "./lib/player";
import { isDesktop } from "./lib/storage";
import { onAppStateChange } from "./lib/nativeBridge";
import { publicarSequenciaWidget } from "./lib/widgets";
import { ATALHO_DESPESA, ATALHO_NOTA, ouvirAtalhos, publicarAtalhos } from "./lib/atalhos";
import { criarDispatcherMcp } from "./lib/mcpDispatch";
import { Tabbar } from "./components/Tabbar";
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
import { Stats } from "./screens/Stats";
import { RoutineStats } from "./screens/RoutineStats";
import { SemanaFechada } from "./screens/SemanaFechada";
import { MesFechado } from "./screens/MesFechado";
import { AnoFechado } from "./screens/AnoFechado";
import { GlobalSearch } from "./components/GlobalSearch";
import { BoasVindas } from "./components/BoasVindas";
import { GlobalBanner } from "./components/GlobalBanner";

// Porta de resolvedTheme/applyTheme (index.html:93-103): "auto" só escurece
// se o sistema pedir tema escuro explicitamente — sem preferência, cai claro.
function useThemeEffect(theme: "auto" | "light" | "dark") {
  useEffect(() => {
    const mqDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function apply() {
      const eff = theme === "auto" ? (mqDark?.matches ? "dark" : "light") : theme;
      document.body.classList.toggle("dark", eff === "dark");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", eff === "dark" ? "#14181C" : "#FFFFFF");
      // Android edge-to-edge: os ícones da barra de status seguiam o tema do
      // SISTEMA, não o do app — tema claro com sistema escuro deixava hora,
      // wifi etc. brancos sobre fundo branco (só a bateria aparecia).
      // "DARK" = fundo escuro, ícones claros (SystemBars do Capacitor 8).
      const bars = (
        window as unknown as { Capacitor?: { Plugins?: { SystemBars?: { setStyle(a: { style: string }): unknown } } } }
      ).Capacitor?.Plugins?.SystemBars;
      try {
        void Promise.resolve(bars?.setStyle({ style: eff === "dark" ? "DARK" : "LIGHT" })).catch(() => {});
      } catch {
        /* sem ponte nativa */
      }
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
      // Ctrl/Cmd+K (02/10/2026): com modificador, vale até digitando
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
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

// Servidor MCP embutido (desktop, index.html:14629-14633): o main process
// repassa cada chamada de tool por IPC e espera a resposta daqui. Registro
// único por janela — ipcRenderer.on acumularia handlers se o efeito rodasse
// de novo (StrictMode em dev), e cada um responderia a mesma chamada.
/** Calendário externo: rebusca ao abrir o app se a cópia tem mais de 30 min
 *  (antes só atualizava tocando no botão em Ajustes) e redesenha a agenda. */
function useIcalAtualizacao() {
  useEffect(() => {
    atualizarIcalSeVencido().then((c) => {
      if (c) useAppStore.setState((s) => ({ view: { ...s.view } }));
    });
  }, []);
}

let mcpRegistrado = false;
function useMcpBridge() {
  useEffect(() => {
    if (mcpRegistrado || !isDesktop || !window.electronBridge?.onMcpCall) return;
    mcpRegistrado = true;
    window.electronBridge.onMcpCall(criarDispatcherMcp(() => useAppStore.getState()));
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
    case "stats":
      return <Stats />;
    case "routineStats":
      return <RoutineStats />;
    case "semanaFechada":
      return <SemanaFechada />;
    case "mesFechado":
      return <MesFechado />;
    case "anoFechado":
      return <AnoFechado />;
    case "home":
    default:
      return <Home />;
  }
}

/** Telas-raiz das abas: ficam montadas depois da primeira visita (escondidas
 *  com <Activity>, que guarda estado, rolagem e DOM e pausa os efeitos), então
 *  trocar de aba não recarrega nada — e a barra de abas é uma só, fora delas. */
const RAIZES_ABA = ["home", "metas", "notes", "templateFolders", "stats", "settings"];
const TELAS_COM_ABAS = new Set([...RAIZES_ABA, "tmplFolder", "expenseFolder"]);

function Telas({ screen }: { screen: string }) {
  const [visitadas, setVisitadas] = useState<string[]>([]);
  const raiz = RAIZES_ABA.includes(screen);
  if (raiz && !visitadas.includes(screen)) setVisitadas([...visitadas, screen]);
  return (
    <>
      {visitadas.map((s) => (
        <Activity key={s} mode={s === screen ? "visible" : "hidden"}>
          <Screen screen={s} />
        </Activity>
      ))}
      {!raiz && <Screen screen={screen} />}
      {TELAS_COM_ABAS.has(screen) && <Tabbar />}
    </>
  );
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

  // Avisos proativos também na volta ao primeiro plano — o app pode ficar
  // aberto em segundo plano por dias, e o boot só roda uma vez
  // (index.html: appStateChange + checarNudge*). Idempotente: cada aviso tem
  // sua própria marca de "já avisei hoje".
  useEffect(() => {
    const checar = () => {
      void useAppStore.getState().aplicarToquesWidget();
      useAppStore.getState().lancarDespesasRecorrentes();
      useAppStore.getState().checarNudgesAgora();
    };
    const onVis = () => {
      if (!document.hidden) checar();
    };
    document.addEventListener("visibilitychange", onVis);
    const unsubscribe = onAppStateChange((isActive) => {
      if (isActive) checar();
      // saindo da frente: o dia pode ter virado com o app aberto — republica a
      // sequência do widget (index.html:2744 redesenhava os widgets aqui).
      else {
        const s = useAppStore.getState();
        publicarSequenciaWidget(s.routines, s.history, s.snoozes);
      }
    });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unsubscribe();
    };
  }, []);

  // Atalhos do launcher (index.html:2913-2918): só depois do boot, para o
  // toque que abriu o app já encontrar as rotinas carregadas.
  useEffect(() => {
    if (!booted) return;
    ouvirAtalhos((id) => {
      const s = useAppStore.getState();
      if (id === ATALHO_NOTA) s.openNote(null);
      else if (id === ATALHO_DESPESA) s.goTo({ tab: "templates", screen: "expenseFolder", id: "nova" });
      // toque nos widgets (01/10/2026): cada um abre a sua tela
      else if (id === "acao:rotinas") s.goTo({ tab: "home", screen: "home" });
      else if (id === "acao:boletim") s.goTo({ tab: "home", screen: "boletim" });
      else if (id === "acao:metas") s.goTo({ tab: "metas", screen: "metas" });
      else if (s.routines.some((r) => r.id === id)) s.startPlayer(id);
    });
    publicarAtalhos(useAppStore.getState().routines);
    // lembrete de gastos das 21h: replaneja ao abrir e a cada mudança nas
    // despesas; o toque na notificação abre a Nova despesa
    syncLembreteGasto(useAppStore.getState().templates);
    window.Capacitor?.Plugins.LocalNotifications?.addListener?.("localNotificationActionPerformed", (a) => {
      if (a?.notification?.extra?.brita === TAG_LEMBRETE_GASTO)
        useAppStore.getState().goTo({ tab: "templates", screen: "expenseFolder", id: "nova" });
    });
    return useAppStore.subscribe((s, antes) => {
      if (s.routines !== antes.routines) publicarAtalhos(s.routines);
      if (s.templates !== antes.templates) syncLembreteGasto(s.templates);
    });
  }, [booted]);

  useThemeEffect(theme);
  useFontScaleEffect(fontScale);
  useSidebarCollapsedEffect(sidebarCollapsed);
  useGlobalSearchShortcut(openSearch);
  useMiniPlayerBridge();
  useMcpBridge();
  useIcalAtualizacao();

  if (!booted) return null;

  return (
    <>
      <Telas screen={view.screen} />
      <GlobalSearch />
      <BoasVindas />
      <GlobalBanner />
    </>
  );
}
