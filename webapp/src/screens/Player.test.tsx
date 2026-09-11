import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { PlayerState } from "../lib/player";

function playerStateFake(): PlayerState {
  const now = Date.now();
  return {
    routineId: "r1",
    routineName: "Rotina de teste",
    steps: [
      { id: "s1", name: "Um", seconds: 60, type: "timer" },
      { id: "s2", name: "Dois", seconds: 30, type: "timer" },
    ],
    idx: 0,
    paused: false,
    pausedAt: null,
    pausedTotalMs: 0,
    stepStart: now,
    stepEndTs: now + 60000,
    startedAt: now,
    pauseCount: 0,
    stepActuals: [],
    pontosGanhos: 0,
    ex: null,
    overtimeCueFired: false,
  };
}

/** `isNative` é congelado no import de storage.ts, então o stub do Capacitor
 * precisa vir ANTES de importar Player/store — daí resetModules + import
 * dinâmico. */
async function montarComoNativo(plugins: Record<string, unknown>) {
  vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: plugins });
  vi.resetModules();
  const { Player } = await import("./Player");
  const { useAppStore } = await import("../store/useAppStore");
  useAppStore.setState({ playerState: playerStateFake(), view: { tab: "home", screen: "player" } });
  return () => render(<Player />);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Player no Android — pontes nativas nunca podem derrubar a tela", () => {
  it("abre quando TimerOverlay.hide() devolve algo que não é Promise", async () => {
    const montar = await montarComoNativo({
      Filesystem: {},
      TimerOverlay: { hide: () => undefined, show: () => undefined },
    });
    expect(montar).not.toThrow();
  });

  it("abre quando App.addListener() devolve um handle síncrono (sem .then)", async () => {
    const montar = await montarComoNativo({
      Filesystem: {},
      App: { addListener: () => ({ remove: () => {} }) },
    });
    expect(montar).not.toThrow();
  });

  it("abre quando a ponte lança de forma síncrona", async () => {
    const montar = await montarComoNativo({
      Filesystem: {},
      TimerOverlay: {
        hide: () => {
          throw new Error("serviço indisponível");
        },
      },
      App: {
        addListener: () => {
          throw new Error("plugin ausente");
        },
      },
    });
    expect(montar).not.toThrow();
  });

  it("com a preferência ligada, espelha a etapa atual e a fila das seguintes", async () => {
    const chamadas: Array<Record<string, unknown>> = [];
    vi.stubGlobal("Capacitor", {
      isNativePlatform: () => true,
      Plugins: {
        Filesystem: {},
        TimerOverlay: { show: (a: Record<string, unknown>) => chamadas.push(a), hide: () => undefined },
      },
    });
    vi.resetModules();
    const { Player } = await import("./Player");
    const { useAppStore } = await import("../store/useAppStore");
    useAppStore.setState({
      playerState: playerStateFake(),
      view: { tab: "home", screen: "player" },
      cronometroModo: "bolha",
    });
    render(<Player />);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].label).toBe("Um");
    expect(chamadas[0].paused).toBe(false);
    // a bolha só aparece fora do app; em primeiro plano o serviço fica de pé oculto
    expect(chamadas[0].visible).toBe(false);
    expect(JSON.parse(String(chamadas[0].queue))).toEqual([{ label: "Dois", seconds: 30, auto: false }]);
  });
});

describe("Player fora do Android", () => {
  it("abre normalmente sem nenhum plugin nativo", async () => {
    vi.resetModules();
    const { Player } = await import("./Player");
    const { useAppStore } = await import("../store/useAppStore");
    useAppStore.setState({ playerState: playerStateFake(), view: { tab: "home", screen: "player" } });
    expect(() => render(<Player />)).not.toThrow();
  });
});
