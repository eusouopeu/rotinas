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
    expect(rows[0]?.textContent).toContain("25 / 50");

    expect(rows[1]?.textContent).toContain("Trabalho");
    expect(rows[1]?.textContent).toContain("10 / 50");
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
    expect(footer?.textContent).toContain("Nota 50/100");
    // Σ conta itens da semana (1 de 2 concluídos) e o relógio, dias restantes
    expect(footer?.textContent).toContain("1/2");
    expect(footer?.textContent).toMatch(/\d+ dias?/);
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
  it("recolhe e expande pelo cabeçalho sem navegar para o boletim", () => {
    useAppStore.setState({ gam: baseGam({ concluidos: [{ pontos: 30, area: "saude" }] }) });

    const { container } = render(<RodaVidaResumo />);
    const head = container.querySelector(".roda-head") as HTMLElement;
    expect(container.querySelectorAll(".bar-row").length).toBe(2);

    fireEvent.click(head);
    expect(container.querySelectorAll(".bar-row").length).toBe(0);
    expect(container.querySelector(".roda-boletim")).toBeNull();
    // o clique no cabeçalho não pode disparar a navegação do card inteiro
    expect(useAppStore.getState().view).toEqual({ tab: "home", screen: "home" });

    fireEvent.click(head);
    expect(container.querySelectorAll(".bar-row").length).toBe(2);
  });

  it("pagina as áreas de duas em duas pelas setas, sem navegar", () => {
    const gam = baseGam({
      agendaCongelada: [
        { itemId: "a1", dia: 0, area: "saude", pontos: 25 },
        { itemId: "a2", dia: 1, area: "trabalho", pontos: 25 },
        { itemId: "a3", dia: 2, area: "estudo", pontos: 25 },
        { itemId: "a4", dia: 3, area: "lazer", pontos: 25 },
      ],
      concluidos: [{ pontos: 10, area: "saude" }],
    });
    gam.config.roda.areas = [
      ...gam.config.roda.areas,
      { id: "estudo", label: "Estudo", color: "#a855f7", peso: 1 },
      { id: "lazer", label: "Lazer", color: "#f59e0b", peso: 1 },
    ];
    useAppStore.setState({ gam });

    const { container } = render(<RodaVidaResumo />);
    const setas = container.querySelectorAll(".roda-seta");
    expect(setas.length).toBe(2);
    expect((setas[0] as HTMLButtonElement).disabled).toBe(true);

    let rows = container.querySelectorAll(".bar-row");
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain("Saúde");
    expect(rows[1]?.textContent).toContain("Trabalho");

    fireEvent.click(setas[1]);
    rows = container.querySelectorAll(".bar-row");
    expect(rows[0]?.textContent).toContain("Estudo");
    expect(rows[1]?.textContent).toContain("Lazer");
    expect((container.querySelectorAll(".roda-seta")[1] as HTMLButtonElement).disabled).toBe(true);
    expect(useAppStore.getState().view).toEqual({ tab: "home", screen: "home" });
  });
});
