import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

/** `isNative` é congelado no import de storage.ts: stub antes do import. */
async function montar(plugins: Record<string, unknown>, emRotina = false) {
  vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: { Filesystem: {}, ...plugins } });
  vi.resetModules();
  const { DiagnosticoCronometro } = await import("./DiagnosticoCronometro");
  const { useAppStore } = await import("../../store/useAppStore");
  useAppStore.setState({ cronometroModo: "barra", playerState: emRotina ? ({} as never) : null });
  await act(async () => {
    render(<DiagnosticoCronometro />);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("DiagnosticoCronometro", () => {
  it("mostra o que o sistema permite e dispara o teste de 10 s", async () => {
    const show = vi.fn();
    await montar({
      TimerOverlay: {
        status: async () => ({ sdk: 36, notificacoes: true, promovidas: false, sobreposicao: true }),
        show,
        hide: () => undefined,
      },
    });
    expect(screen.getByText("Notificações em tempo real (Now Bar)").nextSibling?.textContent).toBe("bloqueado");
    expect(screen.getByText("Notificações do app").nextSibling?.textContent).toBe("permitido");
    fireEvent.click(screen.getByText("testar 10 s"));
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ label: "Teste do cronômetro", modo: "barra" }));
    expect(screen.getByText("contando…")).toBeTruthy();
  });

  it("desliga o teste com rotina em andamento e tolera APK sem status()", async () => {
    await montar(
      {
        TimerOverlay: { status: async () => ({ sdk: 34, notificacoes: true, promovidas: null, sobreposicao: false }) },
      },
      true
    );
    expect(screen.getByText("Notificações em tempo real (Now Bar)").nextSibling?.textContent).toBe("não se aplica");
    expect((screen.getByText("testar 10 s") as HTMLButtonElement).disabled).toBe(true);
    vi.resetModules();
    document.body.innerHTML = "";
    await montar({ TimerOverlay: { hide: () => undefined } });
    expect(screen.getByText("Diagnóstico indisponível nesta versão do app.")).toBeTruthy();
  });
});
