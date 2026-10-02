// Testes da rodada de 02/10/2026: compra parcelada, receitas e import de
// extrato com entradas, variantes A/B, "nunca falhar dois dias", próxima
// rotina de hoje, volume de carga e Ano fechado.
import { describe, expect, it } from "vitest";
import { resumoAno } from "./anoFechado";
import { agruparPorMes, computeImportPreview, lancamentosRecorrentes, saldoDoMes, type ImportState } from "./expense";
import type { HistoryEntry } from "./history";
import { metaRecFalhouOntem } from "./metas";
import { falhouUltimaVez, proximaRotinaDeHoje, proximaVariante, rotinaDaVariante } from "./routines";
import { getRoutineDetailStats } from "./stats";
import type { AnyTemplateDoc, ExpenseDoc, GamificacaoState, MetaRecorrente, Routine } from "./types";

const despesa = (p: Partial<ExpenseDoc>): ExpenseDoc => ({
  id: "d1",
  type: "expense",
  desc: "Geladeira",
  value: 300,
  cat: "Moradia",
  date: "2026-08-10",
  createdAt: 0,
  updatedAt: 0,
  ...p,
});

describe("compra parcelada", () => {
  it("lança uma parcela por mês até a última, numerada", () => {
    const orig = despesa({ parcelas: 3 });
    const { novos } = lancamentosRecorrentes([orig], "2026-12-31", 1);
    expect(novos.map((n) => [n.id, n.date, n.parcela, n.parcelas])).toEqual([
      ["d1:2026-09", "2026-09-10", 2, 3],
      ["d1:2026-10", "2026-10-10", 3, 3],
    ]);
  });
  it("não lança parcela futura", () => {
    const { novos } = lancamentosRecorrentes([despesa({ parcelas: 3 })], "2026-09-05", 1);
    expect(novos).toHaveLength(0);
  });
});

describe("receitas", () => {
  const docs = [
    despesa({ id: "a", value: 100, date: "2026-10-01" }),
    despesa({ id: "b", value: 1000, date: "2026-10-05", receita: true, cat: "Salário" }),
  ];
  it("ficam fora do total de gastos e entram no saldo", () => {
    expect(saldoDoMes(docs, "2026-10")).toEqual({ entradas: 1000, saidas: 100, saldo: 900 });
    const [g] = agruparPorMes(docs);
    expect(g.total).toBe(100);
    expect(g.entradas).toBe(1000);
    expect(g.porCategoria.map((c) => c.cat)).toEqual(["Moradia"]);
  });
  it("cópia de receita fixa continua receita", () => {
    const { novos } = lancamentosRecorrentes([despesa({ receita: true, recorrente: true })], "2026-09-30", 1);
    expect(novos[0].receita).toBe(true);
  });
});

describe("import de extrato com entradas e saídas", () => {
  const st: ImportState = {
    dataRows: [
      ["01/10/2026", "Mercado", "-50,00"],
      ["05/10/2026", "Salário", "3000,00"],
      ["06/10/2026", "Padaria", "-12,50"],
    ],
    guess: { dateCol: 0, valCol: 2, descCol: 1, ncol: 3, header: null, dataRows: [] } as never,
    map: { date: 0, val: 2, desc: 1 },
    sign: "ambos",
  };
  it("saída vira despesa e entrada vira receita", () => {
    const { parsed } = computeImportPreview(st);
    expect(parsed.map((p) => [p.desc, p.value, !!p.receita])).toEqual([
      ["Mercado", 50, false],
      ["Salário", 3000, true],
      ["Padaria", 12.5, false],
    ]);
  });
  it("reimportar o mesmo extrato não duplica", () => {
    const existentes = [despesa({ desc: "Mercado", value: 50, date: "2026-10-01" })];
    const r = computeImportPreview(st, existentes);
    expect(r.duplicados).toBe(1);
    expect(r.parsed.map((p) => p.desc)).toEqual(["Salário", "Padaria"]);
  });
});

const h = (p: Partial<HistoryEntry>): HistoryEntry => ({
  date: "2026-10-01",
  ts: 1,
  startedTs: 0,
  routineId: "r",
  routineName: "Treino",
  plannedSec: 0,
  actualSec: 0,
  pauses: 0,
  pausedSec: 0,
  skippedCount: 0,
  steps: [],
  ...p,
});

describe("variantes A/B", () => {
  const r: Routine = {
    id: "r",
    name: "Treino",
    steps: [{ id: "a", name: "Supino", type: "timer", seconds: 60 }],
    stepsB: [{ id: "b", name: "Agachamento", type: "timer", seconds: 60 }],
  };
  it("começa pela A e alterna a cada execução, ignorando a mínima", () => {
    expect(proximaVariante(r, [])).toBe("A");
    expect(proximaVariante(r, [h({ variante: "A" })])).toBe("B");
    expect(proximaVariante(r, [h({ variante: "B" })])).toBe("A");
    expect(proximaVariante(r, [h({ variante: "A" }), h({ minima: true })])).toBe("B");
  });
  it("sem versão B não alterna", () => {
    expect(proximaVariante({ ...r, stepsB: null }, [])).toBeNull();
    expect(rotinaDaVariante({ ...r, stepsB: null }, "B").steps[0].id).toBe("a");
    expect(rotinaDaVariante(r, "B").steps[0].id).toBe("b");
  });
});

describe("nunca falhar dois dias", () => {
  // quinta 01/10/2026; rotina de seg/qua/qui/sex
  const hoje = new Date(2026, 9, 1, 10);
  const r: Routine = {
    id: "r",
    name: "Corrida",
    steps: [],
    schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 4, 5] },
  };
  it("marca quando a ocorrência anterior (quarta) ficou sem execução", () => {
    expect(falhouUltimaVez(r, [h({ date: "2026-09-28" })], [], hoje)).toBe(true);
  });
  it("não marca se a anterior foi feita, se hoje já foi feita ou se hoje não é dia", () => {
    expect(falhouUltimaVez(r, [h({ date: "2026-09-30" })], [], hoje)).toBe(false);
    expect(falhouUltimaVez(r, [h({ date: "2026-10-01" })], [], hoje)).toBe(false);
    expect(falhouUltimaVez(r, [], [], new Date(2026, 9, 3, 10))).toBe(false); // sábado
  });
  it("dia pausado não conta como falha", () => {
    const pausa = { from: new Date(2026, 8, 30).getTime(), to: new Date(2026, 8, 30, 23, 59).getTime() };
    // quarta pausada: a anterior passa a ser segunda (28), feita
    expect(falhouUltimaVez(r, [h({ date: "2026-09-28" })], [pausa], hoje)).toBe(false);
  });
  it("meta diária abaixo do alvo ontem e ainda aberta hoje", () => {
    const rec: MetaRecorrente = {
      id: "m",
      titulo: "Água",
      tipo: "diaria",
      vezes: 4,
      criadoEm: 0,
      progresso: { periodo: "dia:2026-10-01", feitas: 1 },
      historico: [{ periodo: "dia:2026-09-30", feitas: 2, vezes: 4 }],
    };
    expect(metaRecFalhouOntem(rec, hoje)).toBe(true);
    expect(metaRecFalhouOntem({ ...rec, historico: [{ periodo: "dia:2026-09-30", feitas: 4 }] }, hoje)).toBe(false);
    expect(metaRecFalhouOntem({ ...rec, negativa: true }, hoje)).toBe(false);
  });
});

describe("próxima rotina de hoje", () => {
  const hoje = new Date(2026, 9, 1, 10);
  const mk = (id: string, time: string, days = [4]): Routine => ({
    id,
    name: id,
    steps: [],
    schedule: { enabled: true, anchor: "start", time, days },
  });
  it("a primeira por horário, agendada hoje e ainda não feita", () => {
    const rs = [mk("noite", "20:00"), mk("manha", "07:00"), mk("tarde", "14:00"), mk("sabado", "08:00", [6])];
    expect(proximaRotinaDeHoje(rs, [], "manha", hoje)?.id).toBe("tarde");
    expect(proximaRotinaDeHoje(rs, [h({ routineId: "tarde" })], "manha", hoje)?.id).toBe("noite");
    expect(proximaRotinaDeHoje(rs, [h({ routineId: "tarde" }), h({ routineId: "noite" })], "manha", hoje)).toBeNull();
  });
});

describe("volume de carga por exercício", () => {
  it("séries × repetições × kg por sessão", () => {
    const r: Routine = { id: "r", name: "Treino", steps: [] };
    const hist = [
      h({
        ts: new Date(2026, 8, 1).getTime(),
        steps: [
          {
            id: "s",
            tag: "medio",
            name: "Supino",
            isRest: false,
            planned: null,
            actual: 0,
            skipped: false,
            exercicioId: "ex",
            series: [
              { reps: 10, peso: 20 },
              { reps: 8, peso: 20 },
            ],
          },
        ],
      }),
    ];
    const stats = getRoutineDetailStats(r, hist);
    expect(stats.exerciseRows[0].volumes.map((v) => v.valor)).toEqual([360]);
  });
});

describe("Ano fechado", () => {
  it("resume meses, rotinas, metas e dinheiro do ano", () => {
    const gam = {
      config: {},
      historico: {
        semanas: [],
        meses: [
          { anoMes: "2025-11", nota: 70, badge: null, bonusMetas: 0 },
          { anoMes: "2025-12", nota: 80, badge: null, bonusMetas: 0 },
          { anoMes: "2026-01", nota: 90, badge: null, bonusMetas: 0 },
        ],
        trimestres: [],
        anos: [
          { ano: 2024, nota: 60, badge: null, bonusMetas: 0 },
          { ano: 2025, nota: 75, badge: null, bonusMetas: 0 },
        ],
      },
    } as unknown as GamificacaoState;
    const templates = [
      { id: "c", type: "countdown", targets: [{ id: "t", title: "Livro", date: "2025-06-01", createdAt: 0, topics: 10, done: 10 }] },
      despesa({ id: "g", value: 200, date: "2025-03-01" }),
      despesa({ id: "s", value: 500, date: "2025-03-05", receita: true }),
      despesa({ id: "x", value: 999, date: "2026-01-01" }),
    ] as unknown as AnyTemplateDoc[];
    const r = resumoAno(gam.historico.anos[1], gam, [h({ date: "2025-05-01" }), h({ date: "2026-01-02" })], templates);
    expect(r.meses.map((m) => m.anoMes)).toEqual(["2025-11", "2025-12"]);
    expect(r.mediaMeses).toBe(75);
    expect(r.execucoes).toBe(1);
    expect(r.metas).toEqual({ concluidas: 1, total: 1 });
    expect([r.gastos, r.entradas]).toEqual([200, 500]);
    expect(r.delta).toBe(15);
  });
});
