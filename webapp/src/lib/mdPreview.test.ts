import { describe, expect, it } from "vitest";
import { INDENT_MAX, indentLines, inserirTabela, nivelIndent } from "./mdPreview";

describe("indentLines", () => {
  it("aumenta e diminui o recuo da linha da seleção", () => {
    const v = "- um\n- dois";
    const mais = indentLines(v, 6, 6, 1);
    expect(mais.value).toBe("- um\n  - dois");
    expect(indentLines(mais.value, 8, 8, -1).value).toBe(v);
  });

  it("linha vazia não ganha recuo e o recuo tem teto", () => {
    expect(indentLines("", 0, 0, 1).value).toBe("");
    let v = "x";
    for (let i = 0; i < INDENT_MAX + 3; i++) v = indentLines(v, v.length, v.length, 1).value;
    expect(nivelIndent(v)).toBe(INDENT_MAX);
  });
});

describe("inserirTabela", () => {
  it("insere o esqueleto como bloco e deixa o cursor depois dele", () => {
    const r = inserirTabela("", 0, 0);
    expect(r.value).toBe("| Coluna | Coluna |\n| --- | --- |\n|  |  |\n");
    expect(r.start).toBe(r.value.length);
  });
});
