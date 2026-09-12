// Tabbar em duas pílulas vítreas (mockups de 12/09/2026): quatro abas de
// conteúdo — "Dados" voltou a ser aba — e "Ajustes" separado.
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Tabbar } from "./Tabbar";
import { useAppStore } from "../store/useAppStore";

describe("Tabbar", () => {
  beforeEach(() => {
    useAppStore.setState({ view: { tab: "home", screen: "home" } });
  });

  it("separa as abas de conteúdo de Ajustes em duas pílulas", () => {
    const { container } = render(<Tabbar />);
    const pilulas = container.querySelectorAll(".tabbar-pill");
    expect(pilulas.length).toBe(2);
    expect(pilulas[0].querySelectorAll("button").length).toBe(4);
    expect(pilulas[1].querySelectorAll("button").length).toBe(1);
    expect(pilulas[1].querySelector("button")?.getAttribute("aria-label")).toBe("Ajustes");
  });

  it("a aba Dados navega para a tela de estatísticas e fica ativa", () => {
    const { getByLabelText } = render(<Tabbar />);
    fireEvent.click(getByLabelText("Dados"));
    expect(useAppStore.getState().view).toEqual({ tab: "dados", screen: "stats" });
    expect(getByLabelText("Dados").className).toContain("active");
  });
});
