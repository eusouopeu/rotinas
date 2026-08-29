import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  anoMesDoFimDaSemana,
  badgeParaNota,
  criarEstadoGamificacaoInicial,
  destaquesDaSemana,
  fatoresPorArea,
  inicioSemanaISO,
  pesoBruto,
  tagMultiplicador,
  trimestreDe,
} from "./gamificacao";

// Mesmos invariantes que test/gamificacao.cjs cobre no app antigo — porta o
// comportamento, não a técnica (lá era regex-extraction + vm.runInContext;
// aqui é import direto do módulo real).

describe("inicioSemanaISO / addDaysISO", () => {
  it("domingo de uma sexta", () => {
    expect(inicioSemanaISO(new Date(2026, 6, 24), 0)).toBe("2026-07-19");
  });
  it("domingo de um domingo é ele mesmo", () => {
    expect(inicioSemanaISO(new Date(2026, 6, 19), 0)).toBe("2026-07-19");
  });
  it("sábado fecha a semana", () => {
    expect(inicioSemanaISO(new Date(2026, 6, 25), 0)).toBe("2026-07-19");
  });
  it("segunda abre a semana quando weekStart=1", () => {
    expect(inicioSemanaISO(new Date(2026, 6, 27), 1)).toBe("2026-07-27");
  });
  it("virada de ano no meio da semana", () => {
    expect(inicioSemanaISO(new Date(2027, 0, 1), 0)).toBe("2026-12-27");
  });
  it("soma virando o mês", () => {
    expect(addDaysISO("2026-07-28", 7)).toBe("2026-08-04");
  });
  it("soma virando o ano", () => {
    expect(addDaysISO("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("ano bissexto: 28/02 + 1 = 29/02", () => {
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("anoMesDoFimDaSemana", () => {
  it("semana a cavalo conta pelo sábado", () => {
    expect(anoMesDoFimDaSemana("2026-09-27")).toBe("2026-10");
  });
  it("semana inteira dentro do mês", () => {
    expect(anoMesDoFimDaSemana("2026-07-19")).toBe("2026-07");
  });
  it("semana a cavalo do ano", () => {
    expect(anoMesDoFimDaSemana("2026-12-27")).toBe("2027-01");
  });
});

describe("tagMultiplicador / pesoBruto", () => {
  const config = criarEstadoGamificacaoInicial().config;

  it("multiplicador conhecido", () => {
    expect(tagMultiplicador("alto", config)).toBe(3.0);
  });
  it("tag desconhecida cai no médio", () => {
    expect(tagMultiplicador("inexistente", config)).toBe(1.75);
  });
  it("sublinear: 4x a duração não vale 4x os pontos", () => {
    const p30 = pesoBruto("medio", 30, config);
    const p120 = pesoBruto("medio", 120, config);
    expect(p120).toBeLessThan(p30 * 4);
    expect(p120).toBeGreaterThan(p30);
  });
  it("ordem preservada: mais longo vale mais", () => {
    expect(pesoBruto("medio", 60, config)).toBeGreaterThan(pesoBruto("medio", 30, config));
  });
  it("peso nenhum é sempre 0", () => {
    expect(pesoBruto("nenhum", 60, config)).toBe(0);
  });
});

describe("badgeParaNota", () => {
  const config = criarEstadoGamificacaoInicial().config;
  it.each([
    [59.9, null],
    [60, "bronze"],
    [74.9, "bronze"],
    [75, "prata"],
    [89.9, "prata"],
    [90, "ouro"],
    [99.9, "ouro"],
    [100, "diamante"],
    [143.2, "diamante"],
  ])("nota %s -> %s", (nota, esperado) => {
    expect(badgeParaNota(nota, config)).toBe(esperado);
  });
});

describe("destaquesDaSemana", () => {
  it("ordena por soma e limita a 5, item sem rótulo vira Outros", () => {
    const sem = {
      concluidos: [
        { pontos: 10, rotulo: "Manhã" },
        { pontos: 20, rotulo: "Manhã" },
        { pontos: 15, rotulo: "Estudo" },
        { pontos: 5, rotulo: undefined },
      ],
    };
    const destaques = destaquesDaSemana(sem);
    expect(destaques[0].nome).toBe("Manhã");
    expect(destaques[0].pontos).toBe(30);
    expect(destaques[1].nome).toBe("Estudo");
    expect(destaques[2].nome).toBe("Outros");
  });
  it("semana vazia não quebra", () => {
    expect(destaquesDaSemana({ concluidos: [] })).toHaveLength(0);
  });
});

describe("trimestreDe", () => {
  it.each([
    ["2026-01", "2026-T1"],
    ["2026-03", "2026-T1"],
    ["2026-04", "2026-T2"],
    ["2026-06", "2026-T2"],
    ["2026-07", "2026-T3"],
    ["2026-09", "2026-T3"],
    ["2026-10", "2026-T4"],
    ["2026-12", "2026-T4"],
  ])("%s -> %s", (anoMes, esperado) => {
    expect(trimestreDe(anoMes)).toBe(esperado);
  });
});

describe("fatoresPorArea", () => {
  it("roda desligada devolve {}", () => {
    const config = criarEstadoGamificacaoInicial().config;
    expect(fatoresPorArea({ estudo: 10 }, config)).toEqual({});
  });
  it("área sem nada agendado não reserva fatia", () => {
    const config = criarEstadoGamificacaoInicial().config;
    config.roda.ativa = true;
    config.roda.areas = [
      { id: "estudo", label: "Estudo", color: "#000", peso: 5 },
      { id: "saude", label: "Saúde", color: "#111", peso: 5 },
    ];
    const fatores = fatoresPorArea({ estudo: 10 }, config);
    expect(fatores.saude).toBeUndefined();
    expect(fatores.estudo).toBeGreaterThan(0);
  });
});
