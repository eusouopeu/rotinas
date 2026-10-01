import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormMetaPrazo } from "./FormMetaPrazo";
import { criarEstadoGamificacaoInicial } from "../../lib/gamificacao";
import type { MetaTarget } from "../../lib/types";

const meta: MetaTarget = {
  id: "m",
  title: "Questões",
  date: "2026-12-31",
  createdAt: 0,
  topics: 100,
  done: 10,
  marcos: [{ id: "1", data: "2026-10-15", alvo: 30 }],
};

describe("FormMetaPrazo — marcos", () => {
  it("mantém os marcos válidos, limita ao total e descarta linha vazia", () => {
    const onSalvar = vi.fn();
    render(
      <FormMetaPrazo
        meta={meta}
        doc={null}
        gam={criarEstadoGamificacaoInicial()}
        onClose={() => {}}
        onSalvar={onSalvar}
      />
    );
    expect(screen.getByLabelText("Itens até o marco")).toHaveProperty("value", "30");
    fireEvent.click(screen.getByText("+ marco intermediário"));
    expect(screen.getAllByLabelText("Itens até o marco")).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("Itens até o marco")[0], { target: { value: "500" } });
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSalvar.mock.calls[0][0].marcos).toEqual([{ id: "1", data: "2026-10-15", alvo: 100 }]);
  });
});
