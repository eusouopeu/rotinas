// Seções retráteis da aba Ajustes e o filtro da busca (12/09/2026).
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { FiltroAjustes, SecaoAjuste } from "./SecaoAjuste";

describe("SecaoAjuste", () => {
  it("começa fechada e só monta o conteúdo ao abrir", () => {
    const { getByRole, queryByText } = render(
      <SecaoAjuste titulo="Notificações">
        <p>conteúdo</p>
      </SecaoAjuste>
    );
    expect(queryByText("conteúdo")).toBeNull();
    fireEvent.click(getByRole("button"));
    expect(queryByText("conteúdo")).not.toBeNull();
  });

  it("some quando o filtro da busca não casa com o título (sem acento importa)", () => {
    const { queryByText, rerender } = render(
      <FiltroAjustes.Provider value="notific">
        <SecaoAjuste titulo="Notificações">
          <p>conteúdo</p>
        </SecaoAjuste>
      </FiltroAjustes.Provider>
    );
    expect(queryByText("Notificações")).not.toBeNull();

    rerender(
      <FiltroAjustes.Provider value="backup">
        <SecaoAjuste titulo="Notificações">
          <p>conteúdo</p>
        </SecaoAjuste>
      </FiltroAjustes.Provider>
    );
    expect(queryByText("Notificações")).toBeNull();
  });
});
