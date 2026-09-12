// Cabeçalho da view "Dia" da aba Rotinas (mockups de 12/09/2026): o antigo
// link "hoje" virou botão-ícone de calendário e, como ele, só existe quando a
// agenda não está no dia atual; o ponto marca o dia de hoje.
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Home } from "./Home";
import { useAppStore } from "../store/useAppStore";

describe("Home — cabeçalho da view Dia", () => {
  beforeEach(() => {
    useAppStore.setState({ homeView: "dia", routines: [], history: [], diaKanban: [], compromissos: [] });
  });

  it("no dia de hoje mostra o ponto e esconde o botão de calendário", () => {
    const { container, queryByLabelText } = render(<Home />);
    expect(container.querySelector(".ag-dia-hoje-dot")).not.toBeNull();
    expect(queryByLabelText("Ir para hoje")).toBeNull();
  });

  it("ao navegar para outro dia some o ponto e aparece o calendário, que volta para hoje", () => {
    const { container, getByLabelText, queryByLabelText } = render(<Home />);
    fireEvent.click(getByLabelText("Próximo dia"));
    expect(container.querySelector(".ag-dia-hoje-dot")).toBeNull();

    const calendario = getByLabelText("Ir para hoje");
    fireEvent.click(calendario);
    expect(container.querySelector(".ag-dia-hoje-dot")).not.toBeNull();
    expect(queryByLabelText("Ir para hoje")).toBeNull();
  });
});
