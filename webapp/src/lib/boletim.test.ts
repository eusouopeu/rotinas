import { describe, expect, it } from "vitest";
import { contagemBadges, correlacaoAreas, distribuicaoTags, ritmoInfo } from "./boletim";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import type { GamificacaoState, Routine, SemanaAtual } from "./types";

function semana(overrides: Partial<SemanaAtual> = {}): SemanaAtual {
  return {
    inicioISO: "2026-01-05",
    fatorNormalizacao: 1,
    totalBrutoAgendado: 100,
    fatoresArea: {},
    habitos: {},
    agendaCongelada: [{ itemId: "a", dia: 0, area: "", pontos: 50 }],
    concluidos: [],
    ...overrides,
  };
}

describe("ritmoInfo", () => {
  const config = criarEstadoGamificacaoInicial().config;
  it("classifica as 4 faixas de ritmo pelo saldo (nota - esperado até hoje)", () => {
    const seg = new Date("2026-01-06T12:00:00"); // segunda, dia 1 da semana (offset 1)
    const casos: Array<[number, string]> = [
      [55, "Adiantado"], // esperado=50, saldo=+5
      [50, "No ritmo"],
      [40, "Levemente atrasado"], // saldo=-10
      [20, "Atrasado"], // saldo=-30
    ];
    casos.forEach(([pontos, label]) => {
      const sem = semana({ concluidos: pontos ? [{ pontos, area: "" }] : [] });
      expect(ritmoInfo(sem, config, seg, 0).label).toBe(label);
    });
  });
});

describe("distribuicaoTags", () => {
  it("conta só etapas timer, ignora outras, herda peso da rotina quando a etapa não tem o próprio", () => {
    const routines: Routine[] = [
      { id: "r1", name: "R1", tagValor: "alto", steps: [{ id: "s1", name: "A", type: "timer" }, { id: "s2", name: "B", type: "timer", tagValor: "baixo" }, { id: "s3", name: "C", type: "checklist" }] },
    ];
    const d = distribuicaoTags(routines);
    expect(d).toEqual({ alto: 1, medio: 0, baixo: 1, nenhum: 0, total: 2 });
  });
});

describe("contagemBadges", () => {
  it("agrupa por escopo e tipo", () => {
    const badges: GamificacaoState["badges"] = [
      { escopo: "semanal", tipo: "ouro", periodo: "p1", nota: 90, emitidaEm: 0 },
      { escopo: "semanal", tipo: "ouro", periodo: "p2", nota: 91, emitidaEm: 0 },
      { escopo: "mensal", tipo: "prata", periodo: "p3", nota: 80, emitidaEm: 0 },
    ];
    expect(contagemBadges(badges, "semanal")).toEqual({ diamante: 0, ouro: 2, prata: 0, bronze: 0 });
  });
});

describe("correlacaoAreas", () => {
  const config = criarEstadoGamificacaoInicial().config;
  it("sem porArea suficiente (menos de 2 semanas com dado) não gera correlação", () => {
    expect(correlacaoAreas([{ inicioISO: "1", nota: 10, badge: null }], config, 8)).toEqual([]);
  });
  it("duas áreas que sobem/descem juntas correlacionam positivamente perto de 1", () => {
    const historico = [
      { inicioISO: "1", nota: 10, badge: null, porArea: { a: 10, b: 20 } },
      { inicioISO: "2", nota: 20, badge: null, porArea: { a: 20, b: 40 } },
      { inicioISO: "3", nota: 30, badge: null, porArea: { a: 30, b: 60 } },
    ];
    const pares = correlacaoAreas(historico, config, 8);
    expect(pares).toHaveLength(1);
    expect(pares[0].r).toBeCloseTo(1, 5);
  });
});
