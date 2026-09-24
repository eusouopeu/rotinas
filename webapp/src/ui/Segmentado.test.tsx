import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegPill, Toggle } from "./Segmentado";

const opcoes = [
  { key: "a", label: "Semana" },
  { key: "b", label: "Dia" },
];

describe("SegPill / Toggle", () => {
  it("marca a opção ativa e avisa a escolhida", () => {
    const onSelect = vi.fn();
    render(<SegPill options={opcoes} active="a" onSelect={onSelect} />);
    expect(screen.getByText("Semana").className).toContain("bg-caneta");
    expect(screen.getByText("Dia").className).not.toContain("bg-caneta");
    fireEvent.click(screen.getByText("Dia"));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("aceita várias opções ligadas ao mesmo tempo (Metas)", () => {
    render(<Toggle options={opcoes} active={["a", "b"]} onSelect={() => {}} />);
    expect(screen.getByText("Semana").className).toContain("bg-caneta");
    expect(screen.getByText("Dia").className).toContain("bg-caneta");
  });

  it("carrega data-seg (o SwipeItem não pode iniciar arrasto sobre ele)", () => {
    const { container } = render(<SegPill options={opcoes} active="a" onSelect={() => {}} />);
    expect(container.firstElementChild?.hasAttribute("data-seg")).toBe(true);
  });
});
