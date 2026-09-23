import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { LiveMdEditor } from "./LiveMdEditor";
import { titulosRecolhidos } from "../lib/mdPreview";

describe("titulosRecolhidos", () => {
  const linhas = ["# A", "texto a", "## A1", "texto a1", "# B", "texto b"];

  it("sem nada recolhido, nenhuma linha fica escondida", () => {
    const { chaves, ocultaPor } = titulosRecolhidos(linhas, new Set());
    expect(chaves).toEqual(["1|A|0", null, "2|A1|0", null, "1|B|0", null]);
    expect(ocultaPor.every((o) => o == null)).toBe(true);
  });

  it("título recolhido esconde até o próximo título de nível igual ou maior", () => {
    const { ocultaPor } = titulosRecolhidos(linhas, new Set(["1|A|0"]));
    expect(ocultaPor).toEqual([null, 0, 0, 0, null, null]);
  });

  it("subtítulo recolhido não esconde a seção seguinte de nível maior", () => {
    const { ocultaPor } = titulosRecolhidos(linhas, new Set(["2|A1|0"]));
    expect(ocultaPor).toEqual([null, null, null, 2, null, null]);
  });

  it("títulos repetidos têm chaves distintas por ocorrência", () => {
    const { chaves } = titulosRecolhidos(["# X", "a", "# X", "b"], new Set());
    expect(chaves).toEqual(["1|X|0", null, "1|X|1", null]);
  });
});

function Harness({ inicial }: { inicial: string }) {
  const [v, setV] = useState(inicial);
  return <LiveMdEditor value={v} onChange={setV} colapsoKey="nota-teste" />;
}

describe("LiveMdEditor — títulos como toggle", () => {
  it("recolhe e expande a seção sem alterar o texto", () => {
    render(<Harness inicial={"# Compras\nleite\npão\n# Depois\nligar"} />);
    expect(screen.getByText("leite")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Recolher seção" })[0]);
    expect(screen.queryByText("leite")).not.toBeInTheDocument();
    expect(screen.queryByText("pão")).not.toBeInTheDocument();
    expect(screen.getByText("ligar")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // linhas escondidas

    fireEvent.click(screen.getByRole("button", { name: "Expandir seção" }));
    expect(screen.getByText("leite")).toBeInTheDocument();
  });
});
