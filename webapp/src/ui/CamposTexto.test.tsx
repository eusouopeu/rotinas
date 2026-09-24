// Campos digitados que substituíram os seletores nativos (12/09/2026).
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { AreaInput, DateKbInput } from "./CamposTexto";

describe("DateKbInput", () => {
  it("formata enquanto digita e só emite ISO quando a data é válida", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<DateKbInput label="Prazo" value="" onChange={onChange} />);
    const campo = getByLabelText("Prazo") as HTMLInputElement;

    fireEvent.change(campo, { target: { value: "2012" } });
    expect(campo.value).toBe("20/12");
    expect(onChange).toHaveBeenLastCalledWith("");

    fireEvent.change(campo, { target: { value: "20/122026" } });
    expect(campo.value).toBe("20/12/2026");
    expect(onChange).toHaveBeenLastCalledWith("2026-12-20");
  });

  it("descarta data inexistente no blur", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<DateKbInput label="Prazo" value="" onChange={onChange} />);
    const campo = getByLabelText("Prazo") as HTMLInputElement;
    fireEvent.change(campo, { target: { value: "31022026" } });
    fireEvent.blur(campo);
    expect(campo.value).toBe("");
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

describe("AreaInput", () => {
  it("sugere as áreas que casam com o texto e devolve a escolhida", () => {
    const onEscolher = vi.fn();
    const { getByLabelText, queryByText, getByText } = render(
      <AreaInput label="Área" placeholder="+ área" valor="" pool={["Saúde", "Trabalho"]} onEscolher={onEscolher} />
    );
    const campo = getByLabelText("Área");
    fireEvent.change(campo, { target: { value: "tra" } });
    expect(queryByText("Saúde")).toBeNull();

    fireEvent.mouseDown(getByText("Trabalho"));
    expect(onEscolher).toHaveBeenCalledWith("Trabalho");
  });
});
