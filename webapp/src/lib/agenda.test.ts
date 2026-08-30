import { describe, expect, it } from "vitest";
import { agendaGruposMes, agendaGruposSemana, computeGradeLayout, distribuirColunas, parseTimeBlocks, toggleLinhaFeita } from "./agenda";

describe("parseTimeBlocks", () => {
  it("lê horário simples (sem fim) como 1h de duração", () => {
    const blocos = parseTimeBlocks("- [ ] 08:00 Estudar");
    expect(blocos).toHaveLength(1);
    expect(blocos[0]).toMatchObject({ ini: 480, fim: 540, texto: "Estudar", feito: false, adiado: false });
  });

  it("lê intervalo explícito e marca feito/adiado", () => {
    const texto = ["- [x] 08:00 - 09:30 Reunião", "- [>] 10:00 Adiado", "não é bloco"].join("\n");
    const blocos = parseTimeBlocks(texto);
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toMatchObject({ ini: 480, fim: 570, feito: true, texto: "Reunião" });
    expect(blocos[1]).toMatchObject({ ini: 600, fim: 660, adiado: true, texto: "Adiado" });
  });

  it("ordena por horário de início e ignora hora >= 24h", () => {
    const texto = ["- [ ] 23:00 tarde", "- [ ] 06:00 cedo", "- [ ] 25:00 inválido"].join("\n");
    const blocos = parseTimeBlocks(texto);
    expect(blocos.map((b) => b.texto)).toEqual(["cedo", "tarde"]);
  });
});

describe("distribuirColunas", () => {
  it("blocos sem sobreposição ficam todos na coluna 0 com 1 coluna", () => {
    const blocos = parseTimeBlocks(["- [ ] 08:00 - 09:00 a", "- [ ] 10:00 - 11:00 b"].join("\n"));
    distribuirColunas(blocos);
    expect(blocos.every((b) => b.col === 0 && b.cols === 1)).toBe(true);
  });

  it("blocos sobrepostos dividem em colunas", () => {
    const blocos = parseTimeBlocks(["- [ ] 08:00 - 09:00 a", "- [ ] 08:30 - 09:30 b"].join("\n"));
    distribuirColunas(blocos);
    expect(blocos[0].cols).toBe(2);
    expect(blocos[1].cols).toBe(2);
    expect(new Set(blocos.map((b) => b.col))).toEqual(new Set([0, 1]));
  });
});

describe("computeGradeLayout", () => {
  it("calcula janela mIni/mFim e topo/altura em px a partir dos blocos", () => {
    const blocos = parseTimeBlocks("- [ ] 08:00 - 09:00 a");
    const layout = computeGradeLayout(blocos, null);
    expect(layout.horas[0].min).toBe(420); // 1h antes do primeiro bloco
    expect(layout.blocos[0].topPx).toBeCloseTo((480 - 420) * 1.15);
    expect(layout.blocos[0].larguraPct).toBe(100);
  });
});

describe("toggleLinhaFeita", () => {
  it("alterna [ ] para [x] e volta", () => {
    const t1 = toggleLinhaFeita("- [ ] 08:00 tarefa", 0);
    expect(t1).toBe("- [x] 08:00 tarefa");
    const t2 = toggleLinhaFeita(t1, 0);
    expect(t2).toBe("- [ ] 08:00 tarefa");
  });

  it("não mexe em linha sem checkbox", () => {
    expect(toggleLinhaFeita("texto qualquer", 0)).toBe("texto qualquer");
  });
});

describe("agendaGruposSemana", () => {
  it("agrupa por dia da semana e ordena por horário", () => {
    const texto = ["- [ ] seg 08:00 Reunião", "- [ ] seg Levar carro", "- [ ] qui Sem hora"].join("\n");
    const grupos = agendaGruposSemana(texto, [0, 1, 2, 3, 4, 5, 6], [
      "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
    ]);
    const seg = grupos.find((g) => g.label === "Segunda-feira")!;
    expect(seg.itens.map((i) => i.texto)).toEqual(["Reunião", "Levar carro"]);
  });
});

describe("agendaGruposMes", () => {
  it("agrupa por dia do mês em ordem crescente", () => {
    const texto = ["- [ ] 20 Aniversário", "- [ ] 05 Consulta"].join("\n");
    const grupos = agendaGruposMes(texto);
    expect(grupos.map((g) => g.label)).toEqual(["dia 05", "dia 20"]);
  });
});
