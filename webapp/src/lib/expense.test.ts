import { describe, expect, it } from "vitest";
import { agruparPorMes, catColor, chartsBucketKey, chartsBucketLabel, computeDonutArcs, filtrarDespesas, resumoPorPeriodo } from "./expense";
import type { ExpenseDoc } from "./types";

function exp(partial: Partial<ExpenseDoc>): ExpenseDoc {
  return {
    id: partial.id || Math.random().toString(36),
    type: "expense",
    desc: partial.desc || "item",
    value: partial.value ?? 10,
    cat: partial.cat || "Outros",
    date: partial.date || "2026-01-15",
    time: partial.time,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("catColor", () => {
  it("é estável para a mesma categoria", () => {
    expect(catColor("Transporte")).toBe(catColor("Transporte"));
  });
  it("categoria desconhecida cai na última cor (mesmo bucket de 'Outros')", () => {
    expect(catColor("Categoria inexistente")).toBe(catColor("Outros"));
  });
});

describe("chartsBucketKey/Label", () => {
  it("bucket de mês", () => {
    expect(chartsBucketKey("2026-03-15", "mes")).toBe("2026-03");
    expect(chartsBucketLabel("2026-03", "mes")).toBe("03/26");
  });
  it("bucket de trimestre", () => {
    expect(chartsBucketKey("2026-04-01", "trimestre")).toBe("2026-T2");
    expect(chartsBucketKey("2026-01-01", "trimestre")).toBe("2026-T1");
  });
  it("bucket de ano", () => {
    expect(chartsBucketKey("2026-04-01", "ano")).toBe("2026");
  });
});

describe("filtrarDespesas", () => {
  const docs = [
    exp({ desc: "Uber", cat: "Transporte", date: "2026-01-05" }),
    exp({ desc: "Mercado", cat: "Alimentação", date: "2026-01-20" }),
    exp({ desc: "Cinema", cat: "Lazer", date: "2026-02-01" }),
  ];
  it("filtra por texto (desc ou categoria)", () => {
    expect(filtrarDespesas(docs, { query: "uber" })).toHaveLength(1);
    expect(filtrarDespesas(docs, { query: "lazer" })).toHaveLength(1);
  });
  it("filtra por intervalo de datas", () => {
    expect(filtrarDespesas(docs, { from: "2026-01-10", to: "2026-01-31" })).toHaveLength(1);
  });
  it("filtra por categoria exata", () => {
    expect(filtrarDespesas(docs, { cat: "Lazer" })).toHaveLength(1);
  });
});

describe("agruparPorMes", () => {
  it("agrupa por mês, mais recente primeiro, com total e repartição por categoria", () => {
    const docs = [
      exp({ date: "2026-01-05", value: 30, cat: "Transporte" }),
      exp({ date: "2026-01-20", value: 70, cat: "Alimentação" }),
      exp({ date: "2026-02-01", value: 50, cat: "Lazer" }),
    ];
    const grupos = agruparPorMes(docs);
    expect(grupos.map((g) => g.chave)).toEqual(["2026-02", "2026-01"]);
    const jan = grupos.find((g) => g.chave === "2026-01")!;
    expect(jan.total).toBe(100);
    expect(jan.porCategoria).toEqual([
      { cat: "Alimentação", valor: 70, pct: 70 },
      { cat: "Transporte", valor: 30, pct: 30 },
    ]);
  });
});

describe("computeDonutArcs", () => {
  it("ignora segmentos com valor zero e soma os arcos ao total", () => {
    const arcs = computeDonutArcs(
      [
        { value: 50, color: "#111" },
        { value: 0, color: "#222" },
        { value: 50, color: "#333" },
      ],
      100,
    );
    expect(arcs).toHaveLength(2);
    expect(arcs[0].color).toBe("#111");
  });
});

describe("resumoPorPeriodo", () => {
  it("calcula total e categoria no topo do período atual", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const docs = [exp({ date: hoje, value: 40, cat: "Lazer" }), exp({ date: hoje, value: 10, cat: "Transporte" })];
    const r = resumoPorPeriodo(docs, "mes");
    expect(r.total).toBe(50);
    expect(r.totalPeriodoAtual).toBe(50);
    expect(r.categoriaTopoPeriodoAtual).toEqual({ cat: "Lazer", valor: 40 });
    expect(r.lancamentosPeriodoAtual).toBe(2);
  });
});
