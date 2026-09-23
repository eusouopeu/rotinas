import { describe, expect, it } from "vitest";
import { caminhoMdNota, mdDedupSuffix, noteToMarkdown, SUBPASTA_NOTAS } from "./mdMirror";
import type { Note } from "./types";

function nota(p: Partial<Note>): Note {
  return { id: "n1", title: "", content: "", updatedAt: 0, ...p };
}

describe("noteToMarkdown", () => {
  it("título vira h1 e os assuntos viram tags no fim", () => {
    const md = noteToMarkdown(nota({ title: "Plano", content: "- item", subjects: ["estudo", "prova final"] }));
    expect(md).toBe("# Plano\n\n- item\n\n## Assunto\n#estudo #prova-final\n");
  });

  it("nota sem título e sem assuntos não quebra o formato", () => {
    expect(noteToMarkdown(nota({ content: "texto" }))).toBe("# Sem título\n\ntexto\n");
  });
});

describe("caminhoMdNota", () => {
  it("grava na subpasta de notas com o slug do título", () => {
    const n = nota({ id: "a", title: "Ação de Estudo!" });
    expect(caminhoMdNota(n, [n])).toBe(`Rotinas/${SUBPASTA_NOTAS}/nota-acao-de-estudo.md`);
  });

  it("títulos iguais desambiguam por ordem de criação, não por id", () => {
    const velha = nota({ id: "b", title: "Diário", createdAt: 1 });
    const nova = nota({ id: "a", title: "Diário", createdAt: 2 });
    const todas = [nova, velha];
    expect(caminhoMdNota(velha, todas)).toBe(`Rotinas/${SUBPASTA_NOTAS}/nota-diario.md`);
    expect(caminhoMdNota(nova, todas)).toBe(`Rotinas/${SUBPASTA_NOTAS}/nota-diario-2.md`);
  });
});

describe("mdDedupSuffix", () => {
  it("o primeiro da fila não ganha sufixo", () => {
    const entries = [
      { id: "a", createdAt: 10 },
      { id: "b", createdAt: 20 },
      { id: "c", createdAt: 30 },
    ];
    expect(mdDedupSuffix(entries, "a")).toBe("");
    expect(mdDedupSuffix(entries, "b")).toBe("-2");
    expect(mdDedupSuffix(entries, "c")).toBe("-3");
  });
});
