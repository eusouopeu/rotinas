import { describe, expect, it } from "vitest";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import { daysUntil, metaConcluida, metaEscopo, metaPontosTotais, sincronizarPontosMeta } from "./metas";
import type { MetaTarget } from "./types";

describe("metaEscopo", () => {
  // meia-noite local fixa (não Date.now(), que carrega hora do dia e desalinha
  // o cálculo de dias perto da fronteira — new Date("YYYY-MM-DD") sempre
  // parseia meia-noite)
  const hoje = new Date(2026, 6, 1).getTime();
  it("prazo de 10 dias -> mensal", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 10) })).toBe("mensal");
  });
  it("prazo de 29 dias -> mensal", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 29) })).toBe("mensal");
  });
  it("prazo de 30 dias -> trimestral", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 30) })).toBe("trimestral");
  });
  it("prazo de 90 dias -> trimestral", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 90) })).toBe("trimestral");
  });
  it("prazo de 91 dias -> anual", () => {
    expect(metaEscopo({ createdAt: hoje, date: iso(hoje, 91) })).toBe("anual");
  });
});

describe("metaConcluida", () => {
  it("done >= topics conclui", () => {
    expect(metaConcluida({ topics: 10, done: 10 })).toBe(true);
    expect(metaConcluida({ topics: 10, done: 9 })).toBe(false);
  });
  it("sem topics nunca conclui", () => {
    expect(metaConcluida({ topics: null, done: 5 })).toBe(false);
  });
});

describe("metaPontosTotais", () => {
  it("peso alto (padrão) vale 3x o multiplicador do escopo", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = { id: "1", title: "x", date: iso(Date.now(), 10), createdAt: Date.now() };
    expect(metaPontosTotais(t, gam)).toBeCloseTo(gam.config.pontosMeta.mensal * 3.0);
  });
});

describe("sincronizarPontosMeta", () => {
  it("credita proporcional ao progresso, no período corrente", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 10,
      done: 5,
    };
    const r = sincronizarPontosMeta(t, gam);
    expect(r.delta).toBeGreaterThan(0);
    expect(r.target.creditos && Object.values(r.target.creditos)[0]).toBeCloseTo(r.delta);
    expect(Object.values(r.gam.metasPontos)[0]).toBeCloseTo(r.delta);
  });

  it("reduzir o progresso estorna (delta negativo) sem deixar resíduo", () => {
    const gam = criarEstadoGamificacaoInicial();
    let t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 10,
      done: 10,
    };
    const cheio = sincronizarPontosMeta(t, gam);
    t = cheio.target;
    const menos = sincronizarPontosMeta({ ...t, done: 0 }, cheio.gam);
    expect(menos.delta).toBeLessThan(0);
    expect(Object.keys(menos.target.creditos || {})).toHaveLength(0);
    expect(Object.keys(menos.gam.metasPontos)).toHaveLength(0);
  });

  it("ruído de arredondamento (<0.05) não credita nada", () => {
    const gam = criarEstadoGamificacaoInicial();
    const t: MetaTarget = {
      id: "1",
      title: "Meta",
      date: iso(Date.now(), 10),
      createdAt: Date.now(),
      topics: 1000,
      done: 0,
      creditos: {},
    };
    const r = sincronizarPontosMeta(t, gam);
    expect(r.delta).toBe(0);
  });
});

describe("daysUntil", () => {
  it("hoje é 0", () => {
    expect(daysUntil(iso(Date.now(), 0))).toBe(0);
  });
  it("amanhã é 1", () => {
    expect(daysUntil(iso(Date.now(), 1))).toBe(1);
  });
});

function iso(base: number, addDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
