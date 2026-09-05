import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { RodaVidaResumo } from "./RodaVidaResumo";
import { useAppStore } from "../store/useAppStore";
import { criarEstadoGamificacaoInicial } from "../lib/gamificacao";
import type { GamificacaoState, SemanaAtual } from "../lib/types";

function baseGam(overridesSemana: Partial<SemanaAtual> = {}): GamificacaoState {
  const initial = criarEstadoGamificacaoInicial();
  return {
    ...initial,
    config: {
      ...initial.config,
      roda: {
        ativa: true,
        areas: [
          { id: "saude", label: "Saúde", color: "#22c55e", peso: 1 },
          { id: "trabalho", label: "Trabalho", color: "#3b82f6", peso: 1 },
        ],
        pesoSemArea: 1,
      },
    },
    semanaAtual: {
      inicioISO: "2026-01-05",
      fatorNormalizacao: 1,
      totalBrutoAgendado: 100,
      fatoresArea: {},
      habitos: {},
      agendaCongelada: [
        { itemId: "a1", dia: 0, area: "saude", pontos: 50 },
        { itemId: "a2", dia: 1, area: "trabalho", pontos: 50 },
      ],
      concluidos: [],
      ...overridesSemana,
    },
  };
}

describe("RodaVidaResumo", () => {
  beforeEach(() => {
    useAppStore.setState({
      view: { tab: "home", screen: "home" },
      weekStart: 0,
    });
  });

  it("não renderiza nada se não há linhas de área e totalBrutoAgendado é 0", () => {
    useAppStore.setState({
      gam: {
        ...criarEstadoGamificacaoInicial(),
        semanaAtual: {
          inicioISO: "2026-01-05",
          fatorNormalizacao: 1,
          totalBrutoAgendado: 0,
          fatoresArea: {},
          habitos: {},
          agendaCongelada: [],
          concluidos: [],
        },
      },
    });

    const { container } = render(<RodaVidaResumo />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza o card e as barras das áreas quando há dados na semana", () => {
    useAppStore.setState({
      gam: baseGam({
        concluidos: [
          { pontos: 25, area: "saude" },
          { pontos: 10, area: "trabalho" },
        ],
      }),
    });

    const { container } = render(<RodaVidaResumo />);
    const card = container.querySelector(".roda-resumo-card");
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-boletimcard")).toBe("1");

    const rows = container.querySelectorAll(".bar-row");
    expect(rows.length).toBe(2);

    expect(rows[0]?.textContent).toContain("Saúde");
    expect(rows[0]?.textContent).toContain("25.0 / 50");

    expect(rows[1]?.textContent).toContain("Trabalho");
    expect(rows[1]?.textContent).toContain("10.0 / 50");
  });

  it("exclui a categoria 'Sem área' das linhas do card", () => {
    useAppStore.setState({
      gam: baseGam({
        agendaCongelada: [
          { itemId: "a1", dia: 0, area: "saude", pontos: 50 },
          { itemId: "a2", dia: 1, area: "", pontos: 50 },
        ],
        concluidos: [
          { pontos: 20, area: "saude" },
          { pontos: 15, area: "" }, // Cai como "Sem área"
        ],
      }),
    });

    const { container } = render(<RodaVidaResumo />);
    const rows = container.querySelectorAll(".bar-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("Saúde");
    expect(container.textContent).not.toContain("Sem área");
  });

  it("renderiza o rodapé com nota e ritmo quando totalBrutoAgendado > 0", () => {
    useAppStore.setState({
      gam: baseGam({
        concluidos: [{ pontos: 50, area: "saude" }],
      }),
    });

    const { container } = render(<RodaVidaResumo />);
    const footer = container.querySelector(".roda-boletim");
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain("Nota 50.0/100");
    expect(footer?.textContent).toContain("restante");
  });

  it("navega para o boletim ao clicar no card ou ao pressionar Enter", () => {
    useAppStore.setState({
      gam: baseGam({
        concluidos: [{ pontos: 30, area: "saude" }],
      }),
    });

    const { container } = render(<RodaVidaResumo />);
    const card = container.querySelector(".roda-resumo-card") as HTMLElement;
    expect(card).not.toBeNull();

    fireEvent.click(card);
    expect(useAppStore.getState().view).toEqual({ tab: "home", screen: "boletim" });

    // Reseta e testa via teclado (Enter)
    useAppStore.setState({ view: { tab: "home", screen: "home" } });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(useAppStore.getState().view).toEqual({ tab: "home", screen: "boletim" });
  });
});
