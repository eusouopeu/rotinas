// Testes da rodada de 01/10/2026 (2ª): progressão de carga, versão mínima,
// etapas puladas, marcos de meta, orçamento por categoria, semana × anterior
// e espelho JSON das rotinas.
import { describe, expect, it } from "vitest";
import { comparacaoSemanaAnterior } from "./boletim";
import { progressaoCarga } from "./exercicios";
import { categoriasDoMes, chaveOrcamento } from "./expense";
import type { HistoryEntry } from "./history";
import { proximoMarco } from "./metas";
import { novoPlayerState, temVersaoMinima } from "./player";
import { planoEspelhoRotinas } from "./rotinaMirror";
import { getRoutineDetailStats } from "./stats";
import type { ExpenseDoc, MetaTarget, Routine } from "./types";

describe("progressaoCarga", () => {
  it("abaixo de 12 soma 2 repetições e mantém a carga", () => {
    expect(progressaoCarga(8, 20)).toEqual({ reps: 10, peso: 20 });
    expect(progressaoCarga(10, 20)).toEqual({ reps: 12, peso: 20 });
    expect(progressaoCarga(11, 20)).toEqual({ reps: 12, peso: 20 });
  });
  it("em 12 sobe 2,5 kg e volta a 8", () => {
    expect(progressaoCarga(12, 20)).toEqual({ reps: 8, peso: 22.5 });
    expect(progressaoCarga(12, 0)).toEqual({ reps: 8, peso: 2.5 });
  });
});

const rotina = (p: Partial<Routine> = {}): Routine => ({
  id: "r",
  name: "Treino",
  restSeconds: 30,
  steps: [
    { id: "a", name: "Aquecer", type: "timer", seconds: 60 },
    { id: "b", name: "Agachamento", type: "checklist", essencial: true },
    { id: "c", name: "Alongar", type: "timer", seconds: 60 },
  ],
  ...p,
});

describe("versão mínima", () => {
  it("roda só as essenciais, sem pausa sobrando", () => {
    const r = rotina();
    expect(temVersaoMinima(r)).toBe(true);
    const res = novoPlayerState(r, [], true)!;
    expect(res.playerState.steps.map((s) => s.id)).toEqual(["b"]);
    expect(res.playerState.minima).toBe(true);
  });
  it("sem essencial não há versão mínima", () => {
    expect(temVersaoMinima(rotina({ steps: [{ id: "a", name: "x", type: "timer", seconds: 5 }] }))).toBe(false);
  });
});

describe("etapas mais puladas", () => {
  it("conta pular e não fazer sobre as execuções em que a etapa apareceu", () => {
    const passo = (id: string, skipped: boolean) => ({
      id,
      tag: "medio" as const,
      name: id,
      isRest: false,
      planned: 60,
      actual: skipped ? 0 : 60,
      skipped,
    });
    const h = (ts: number, steps: ReturnType<typeof passo>[]): HistoryEntry => ({
      date: "2026-10-01",
      ts,
      startedTs: ts,
      routineId: "r",
      routineName: "Treino",
      plannedSec: 120,
      actualSec: 60,
      pauses: 0,
      pausedSec: 0,
      skippedCount: 0,
      steps,
    });
    const stats = getRoutineDetailStats(rotina(), [
      h(1, [passo("Aquecer", true), passo("Alongar", false)]),
      h(2, [passo("Aquecer", true), passo("Alongar", true)]),
      h(3, [passo("Aquecer", false)]),
    ]);
    expect(stats.skipRows).toEqual([
      { name: "Aquecer", puladas: 2, total: 3 },
      { name: "Alongar", puladas: 1, total: 2 },
    ]);
  });
});

describe("proximoMarco", () => {
  const meta = (p: Partial<MetaTarget>): MetaTarget => ({
    id: "m",
    title: "Questões",
    date: "2026-12-31",
    createdAt: new Date(2026, 8, 1).getTime(),
    topics: 100,
    done: 10,
    ...p,
  });
  it("pega o primeiro marco não batido e projeta no ritmo dos últimos dias", () => {
    // 14 itens em 14 dias = 1/dia; faltam 14 dias para 15/10 → 10 + 14 = 24
    const t = meta({
      progressoDias: { "2026-09-25": 14 },
      marcos: [
        { id: "1", data: "2026-09-20", alvo: 5 },
        { id: "2", data: "2026-10-15", alvo: 30 },
      ],
    });
    const m = proximoMarco(t, "2026-10-01")!;
    expect(m.marco.id).toBe("2");
    expect(m.previsto).toBe(24);
    expect(m.noRitmo).toBe(false);
  });
  it("marco vencido sem alcançar é perdido; todos batidos = nada", () => {
    const perdido = proximoMarco(meta({ marcos: [{ id: "1", data: "2026-09-20", alvo: 50 }] }), "2026-10-01")!;
    expect(perdido.perdido).toBe(true);
    expect(proximoMarco(meta({ marcos: [{ id: "1", data: "2026-09-20", alvo: 5 }] }), "2026-10-01")).toBeNull();
  });
});

describe("categoriasDoMes", () => {
  const d = (cat: string, date: string, value: number): ExpenseDoc => ({
    id: cat + date,
    type: "expense",
    desc: "",
    value,
    cat,
    date,
    createdAt: 0,
    updatedAt: 0,
  });
  it("mês atual × média dos 3 anteriores, com orçamento do diário", () => {
    const docs = [
      d("Lazer", "2026-07-10", 300),
      d("Lazer", "2026-08-10", 0),
      d("Lazer", "2026-09-10", 300),
      d("Lazer", "2026-10-01", 250),
      d("Saúde", "2026-10-01", 50),
    ];
    const linhas = categoriasDoMes(
      docs,
      { [chaveOrcamento("Lazer")]: "200", [chaveOrcamento("Moradia")]: "1500" },
      "2026-10-01"
    );
    expect(linhas.find((l) => l.cat === "Lazer")).toMatchObject({ atual: 250, media: 200, orcamento: 200 });
    expect(linhas.find((l) => l.cat === "Saúde")).toMatchObject({ atual: 50, media: 0, orcamento: null });
    // orçamento sem gasto ainda aparece
    expect(linhas.find((l) => l.cat === "Moradia")).toMatchObject({ atual: 0, orcamento: 1500 });
  });
  it("sem meses anteriores, média fica vazia", () => {
    expect(categoriasDoMes([d("Lazer", "2026-10-01", 10)], {}, "2026-10-01")[0].media).toBeNull();
  });
});

describe("comparacaoSemanaAnterior", () => {
  it("compara com a semana passada proporcional aos dias corridos", () => {
    const sem = {
      inicioISO: "2026-09-27",
      concluidos: [{ pontos: 20, area: "saude" }],
    };
    const hist = [{ inicioISO: "2026-09-20", nota: 70, badge: null, porArea: { saude: 35 } }];
    // 2º dia da semana (28/09): anterior proporcional = 70 × 2/7 = 20; saúde 35 × 2/7 = 10
    const c = comparacaoSemanaAnterior(sem, hist, "2026-09-28")!;
    expect(c.deltaNota).toBeCloseTo(0);
    expect(c.porArea.saude.delta).toBeCloseTo(10);
    expect(comparacaoSemanaAnterior(sem, [{ ...hist[0], dispensada: true }], "2026-09-28")).toBeNull();
  });
});

describe("planoEspelhoRotinas", () => {
  const r1 = rotina({ id: "r1", name: "Manhã", createdAt: 1 });
  const r2 = rotina({ id: "r2", name: "Noite", createdAt: 2 });
  it("primeira passada grava todas no formato de importação", () => {
    const p = planoEspelhoRotinas([r1, r2], null);
    expect(p.gravar.map((g) => g.caminho)).toEqual([
      "Rotinas/Rotinas/rotina-manha.json",
      "Rotinas/Rotinas/rotina-noite.json",
    ]);
    expect(JSON.parse(p.gravar[0].texto)).toMatchObject({ type: "rotina-share", routine: { id: "r1" } });
    expect(p.apagar).toEqual([]);
  });
  it("só grava a alterada; renomear apaga o antigo; excluir apaga o dela", () => {
    const r1b = { ...r1, name: "Manhã cedo" };
    const p = planoEspelhoRotinas([r1b], [r1, r2]);
    expect(p.gravar.map((g) => g.caminho)).toEqual(["Rotinas/Rotinas/rotina-manha-cedo.json"]);
    expect(p.apagar.sort()).toEqual(["Rotinas/Rotinas/rotina-manha.json", "Rotinas/Rotinas/rotina-noite.json"]);
    expect(planoEspelhoRotinas([r1, r2], [r1, r2])).toEqual({ gravar: [], apagar: [] });
  });
});
