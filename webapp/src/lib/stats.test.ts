import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDayDetailData,
  getWeekGridData,
  getMonthGridData,
  getHeatmapData,
  getYearMonthlyBars,
  getPeriodExtrasData,
  getResumoPeriodo,
  getAreasAno,
  getEvolucaoCumprimento,
  getRoutineDetailStats,
  computeStreakFor,
  computeStreak,
  computeStreakSemanalFor,
  recordeStreakFor,
  recordeStreakSemanalFor,
  streakInfoFor,
  marcoStreak,
  gerarInsights,
  intensityClass,
  snoozedOn,
} from "./stats";
import { relatorioFechamentoHtml } from "./pdfExport";
import { criarEstadoGamificacaoInicial, localKey } from "./gamificacao";
import type { HistoryEntry } from "./history";
import type { Routine, MetaTarget } from "./types";

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "r1",
    name: "Correr",
    steps: [{ id: "s1", name: "Corrida", type: "timer", seconds: 1800 }],
    schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
    ...overrides,
  };
}

function hist(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    date: "2026-01-05",
    ts: new Date("2026-01-05T08:00:00").getTime(),
    startedTs: new Date("2026-01-05T07:30:00").getTime(),
    routineId: "r1",
    routineName: "Correr",
    plannedSec: 1800,
    actualSec: 1800,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [{ id: "s1", name: "Corrida", tag: "medio", isRest: false, planned: 1800, actual: 1800, skipped: false }],
    ...overrides,
  };
}

describe("snoozedOn", () => {
  it("verdadeiro só quando a data cai dentro do período pausado", () => {
    const snoozes = [{ from: new Date("2026-01-05").getTime(), to: new Date("2026-01-07").getTime() }];
    expect(snoozedOn(snoozes, new Date("2026-01-06"))).toBe(true);
    expect(snoozedOn(snoozes, new Date("2026-01-10"))).toBe(false);
  });
});

describe("intensityClass", () => {
  it("mapeia minutos para classes lv0 a lv4", () => {
    expect(intensityClass(0)).toBe("lv0");
    expect(intensityClass(10)).toBe("lv1");
    expect(intensityClass(30)).toBe("lv2");
    expect(intensityClass(60)).toBe("lv3");
    expect(intensityClass(120)).toBe("lv4");
  });
});

describe("computeStreakFor e computeStreak", () => {
  // "hoje" fixado (era `new Date()` puro — passava só quando o dia real da
  // execução do teste caía num dos dias agendados da rotina, [1,3,5]).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T12:00:00")); // segunda-feira, dia 1
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computa sequência contínua por rotina considerando dias agendados", () => {
    const r = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } });
    const hoje = new Date();
    const k0 = localKey(hoje);
    const h1 = hist({ routineId: "r1", date: k0 });

    const streak = computeStreakFor("r1", [r], [h1]);
    expect(streak).toBe(1);
  });

  it("rotina sem execuções devolve sequência 0", () => {
    expect(computeStreakFor("r1", [routine()], [])).toBe(0);
    expect(computeStreak([routine()], [])).toBe(0);
  });

  it("sequência global não quebra em dia que nenhuma rotina é devida", () => {
    const r = routine({ schedule: { enabled: true, anchor: "start", time: "07:00", days: [] } });
    const streak = computeStreak([r], [hist({ date: localKey() })]);
    expect(streak).toBe(1);
  });
});

describe("computeStreakSemanalFor / recordeStreakSemanalFor (tolerante a trocar o dia)", () => {
  // Semanas começam no domingo (weekStartDow padrão, sem K_WEEKSTART salvo).
  // Jan/2026: dom 4–sáb 10, dom 11–sáb 17, dom 18–sáb 24.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00")); // quinta-feira, dentro da semana 11–17
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotina não-restrita (7/7 ou sem agenda) não usa streak semanal", () => {
    expect(computeStreakSemanalFor("r1", [routine()], [])).toBe(0);
  });

  it("bate a meta da semana em dias diferentes dos agendados não quebra a sequência", () => {
    const r = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } }); // seg/qua/sex, meta = 3/semana
    const history = [
      // semana 4–10: 3 execuções, mas em dom/ter/qui (fora do agendado) — deve contar mesmo assim.
      hist({ date: "2026-01-04" }),
      hist({ date: "2026-01-06" }),
      hist({ date: "2026-01-08" }),
      // semana 11–17 (em andamento, "hoje" é 15): só 2 execuções até agora — não quebra, mas também não conta ainda.
      hist({ date: "2026-01-12" }),
      hist({ date: "2026-01-14" }),
    ];
    expect(computeStreakSemanalFor("r1", [r], history)).toBe(1);
  });

  it("semana atual já cumprida antes de terminar conta imediatamente", () => {
    const r = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } });
    const history = [
      hist({ date: "2026-01-04" }),
      hist({ date: "2026-01-06" }),
      hist({ date: "2026-01-08" }),
      // semana em andamento já bateu a meta (3) até quinta (hoje):
      hist({ date: "2026-01-11" }),
      hist({ date: "2026-01-13" }),
      hist({ date: "2026-01-15" }),
    ];
    expect(computeStreakSemanalFor("r1", [r], history)).toBe(2);
  });

  it("semana totalmente encerrada sem bater a meta quebra a sequência", () => {
    const r = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } });
    const history = [
      // semana 4-10: só 1 execução — quebra.
      hist({ date: "2026-01-04" }),
      // semana 11-17 (em andamento): 2 até hoje.
      hist({ date: "2026-01-12" }),
      hist({ date: "2026-01-14" }),
    ];
    expect(computeStreakSemanalFor("r1", [r], history)).toBe(0);
  });

  it("recorde captura a maior sequência de semanas já cumprida, não só a atual", () => {
    const r = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } });
    const history = [
      // semana 4-10 e 11-17 (até hoje): cumpridas, streak de 2.
      hist({ date: "2026-01-04" }),
      hist({ date: "2026-01-06" }),
      hist({ date: "2026-01-08" }),
      hist({ date: "2026-01-11" }),
      hist({ date: "2026-01-13" }),
      hist({ date: "2026-01-15" }),
    ];
    expect(recordeStreakSemanalFor("r1", [r], history)).toBe(2);
    expect(recordeStreakFor("r1", [r], [])).toBe(0); // porta diária não se aplica a essa rotina restrita
  });

  it("streakInfoFor decide a unidade certa (semanas para restrita por dias, dias pro resto)", () => {
    const restrita = routine({ id: "r1", schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3, 5] } });
    const diaria = routine({ id: "r2", schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] } });
    const infoRestrita = streakInfoFor("r1", [restrita], [hist({ routineId: "r1", date: "2026-01-15" })]);
    expect(infoRestrita.unidade).toBe("semanas");
    const infoDiaria = streakInfoFor("r2", [diaria], [hist({ routineId: "r2", date: "2026-01-15" })]);
    expect(infoDiaria.unidade).toBe("dias");
  });
});

describe("marcoStreak", () => {
  it("mapeia patamares de dias (7/30/100/365)", () => {
    expect(marcoStreak({ atual: 3, recorde: 3, unidade: "dias" })).toBeNull();
    expect(marcoStreak({ atual: 7, recorde: 7, unidade: "dias" })).toBe("bronze");
    expect(marcoStreak({ atual: 30, recorde: 30, unidade: "dias" })).toBe("prata");
    expect(marcoStreak({ atual: 100, recorde: 100, unidade: "dias" })).toBe("ouro");
    expect(marcoStreak({ atual: 365, recorde: 365, unidade: "dias" })).toBe("diamante");
  });
  it("mapeia patamares de semanas (4/12/26/52)", () => {
    expect(marcoStreak({ atual: 2, recorde: 2, unidade: "semanas" })).toBeNull();
    expect(marcoStreak({ atual: 4, recorde: 4, unidade: "semanas" })).toBe("bronze");
    expect(marcoStreak({ atual: 52, recorde: 52, unidade: "semanas" })).toBe("diamante");
  });
});

describe("getWeekGridData", () => {
  const gam = criarEstadoGamificacaoInicial();

  it("conta planejadas/feitas/faltantes só até hoje (inclusive), e computa a taxa", () => {
    const hoje = new Date();
    const isoHoje = localKey(hoje);
    const data = getWeekGridData(hoje, [hist({ date: isoHoje })], [routine()], [], gam, 0);
    const diaHoje = data.days.find((d) => d.key === isoHoje)!;
    expect(diaHoje.isToday).toBe(true);
    expect(diaHoje.missedCount).toBe(0); // hoje não conta como "faltou" ainda
    expect(data.plannedTotal).toBeGreaterThan(0);
    expect(data.rate).not.toBeNull();
  });

  it("rotina agendada antes de existir (createdAt no futuro do dia) não entra em planejadas", () => {
    const hoje = new Date();
    const r = routine({ createdAt: hoje.getTime() + 10 * 86400000 });
    const data = getWeekGridData(hoje, [], [r], [], gam, 0);
    expect(data.plannedTotal).toBe(0);
  });
});

describe("getDayDetailData", () => {
  it("rotina já executada não entra como planejada-pendente", () => {
    const iso = "2026-01-05";
    const d = getDayDetailData(iso, [hist({ date: iso })], [routine()], []);
    expect(d.executed).toHaveLength(1);
    expect(d.planned).toHaveLength(0);
    expect(d.isEmpty).toBe(false);
  });

  it("dia sem execução nem rotina agendada fica vazio", () => {
    const d = getDayDetailData("2026-01-05", [], [routine({ schedule: { enabled: false, anchor: "start", time: "07:00", days: [] } })], []);
    expect(d.isEmpty).toBe(true);
  });
});

describe("getMonthGridData", () => {
  const gam = criarEstadoGamificacaoInicial();

  it("gera grade com dias do mês e contagem de void para offset", () => {
    const month = new Date(2026, 0, 1); // Janeiro 2026 (1º de jan é quinta-feira)
    const data = getMonthGridData(month, [], [routine()], [], gam, 0);
    expect(data.days).toHaveLength(31);
    expect(data.monthName).toBe("Janeiro");
    expect(data.year).toBe(2026);
    expect(data.voidCount).toBeGreaterThanOrEqual(0);
  });
});

describe("getHeatmapData", () => {
  it("monta colunas de 7 dias com marcação inRange e classes de intensidade", () => {
    const data = getHeatmapData(2026, [hist({ date: "2026-01-10", actualSec: 3600 })], 0);
    expect(data.columns.length).toBeGreaterThan(0);
    const allCells = data.columns.flatMap((c) => c.cells);
    const jan10 = allCells.find((c) => c.key === "2026-01-10");
    expect(jan10).toBeDefined();
    if (jan10?.inRange) {
      expect(jan10.intensity).toBe("lv3"); // 60 min = lv3
    }
  });
});

describe("getYearMonthlyBars e filtro por rotina", () => {
  it("filtra minutos apenas da rotina selecionada quando routineFilter está ativo", () => {
    const h1 = hist({ routineId: "r1", date: "2026-03-10", actualSec: 3600 });
    const h2 = hist({ routineId: "r2", date: "2026-03-15", actualSec: 7200 });

    const totalBars = getYearMonthlyBars(2026, [h1, h2], null);
    expect(totalBars.bars[2].minutes).toBe(180); // 60 + 120 = 180 min

    const filteredBars = getYearMonthlyBars(2026, [h1, h2], "r1");
    expect(filteredBars.bars[2].minutes).toBe(60);
  });
});

describe("gerarInsights", () => {
  it("usa a média (não a mediana) no atraso: um atraso grande puxa o insight", () => {
    // mediana seria 5 (sem insight); média é 16,7 (> 10)
    const rich = [
      hist({ routineName: "Leitura", schedDelayMin: 5 }),
      hist({ routineName: "Leitura", schedDelayMin: 5 }),
      hist({ routineName: "Leitura", schedDelayMin: 40 }),
    ];
    const insights = gerarInsights(rich);
    expect(insights.some((txt) => txt.includes("Leitura") && txt.includes("atrasa em média 17min"))).toBe(true);
  });

  it("gera insight de atraso na rotina quando média > 10 min e n >= 3", () => {
    const rich = [
      hist({ routineName: "Academia", schedDelayMin: 15 }),
      hist({ routineName: "Academia", schedDelayMin: 20 }),
      hist({ routineName: "Academia", schedDelayMin: 25 }),
    ];
    const insights = gerarInsights(rich);
    expect(insights.some((txt) => txt.includes("Academia") && txt.includes("atrasa em média"))).toBe(true);
  });

  it("gera insight de estouro de duração quando média >= 25% e n >= 3", () => {
    const rich = [
      hist({ routineName: "Leitura", plannedSec: 1000, actualSec: 1500 }),
      hist({ routineName: "Leitura", plannedSec: 1000, actualSec: 1600 }),
      hist({ routineName: "Leitura", plannedSec: 1000, actualSec: 1700 }),
    ];
    const insights = gerarInsights(rich);
    expect(insights.some((txt) => txt.includes("Leitura") && txt.includes("estourar o tempo"))).toBe(true);
  });

  it("limita o total de insights a no máximo 5", () => {
    const rich: HistoryEntry[] = [];
    for (let i = 1; i <= 8; i++) {
      rich.push(hist({ routineName: `R${i}`, schedDelayMin: 20 }));
      rich.push(hist({ routineName: `R${i}`, schedDelayMin: 20 }));
      rich.push(hist({ routineName: `R${i}`, schedDelayMin: 20 }));
    }
    const insights = gerarInsights(rich);
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});

describe("getPeriodExtrasData", () => {
  const gam = criarEstadoGamificacaoInicial();

  it("calcula metas semanais com pró-rata e ritmo", () => {
    const r = routine({ id: "r1", name: "Estudo", weeklyGoalTimes: 5 });
    const h = hist({ routineId: "r1", ts: Date.now() });
    const extras = getPeriodExtrasData("30d", [h], [r], [], gam, null, 0);

    expect(extras.goals).toHaveLength(1);
    expect(extras.goals[0].weeklyGoalTimes).toBe(5);
    expect(extras.goals[0].doneCount).toBe(1);
  });

  it("filtra rotinas em periodExtras quando routineFilter está ativo", () => {
    const r1 = routine({ id: "r1", name: "A", weeklyGoalTimes: 3 });
    const r2 = routine({ id: "r2", name: "B", weeklyGoalTimes: 4 });
    const extras = getPeriodExtrasData("30d", [], [r1, r2], [], gam, "r1", 0);

    expect(extras.goals).toHaveLength(1);
    expect(extras.goals[0].routineId).toBe("r1");
  });

  it("resume pontualidade em % no horário, atrasos > 15 min e atraso médio", () => {
    const r = routine({ id: "r1" });
    const agora = Date.now();
    const h = [0, 3, 20, 30].map((d, i) => hist({ routineId: "r1", ts: agora - i * 3600000, schedDelayMin: d }));
    const { punctualityKpi } = getPeriodExtrasData("30d", h, [r], [], gam, null, 0);

    expect(punctualityKpi).not.toBeNull();
    expect(punctualityKpi!.total).toBe(4);
    expect(punctualityKpi!.pctNoHorario).toBe(50);
    expect(punctualityKpi!.atrasosGrandes).toBe(2);
    expect(punctualityKpi!.mediaAtraso).toBe(13); // (0+3+20+30)/4 = 13,25
  });
});

describe("getEvolucaoCumprimento", () => {
  it("dá 12 meses de cumprimento, com null onde nada estava agendado", () => {
    const r = routine({ id: "r1", createdAt: new Date(2026, 1, 1).getTime() });
    // fevereiro/2026: 28 dias agendados, 7 feitos → 25%
    const h = [2, 5, 9, 12, 16, 19, 23].map((d) =>
      hist({ routineId: "r1", date: `2026-02-${String(d).padStart(2, "0")}`, ts: new Date(2026, 1, d, 8).getTime() }),
    );
    const pontos = getEvolucaoCumprimento("ano", h, [r], [], null, 0, new Date(2026, 2, 15, 12));

    expect(pontos).toHaveLength(12);
    expect(pontos[11].label).toBe("mar");
    expect(pontos[10]).toEqual({ label: "fev", pct: 25 });
    expect(pontos[9].pct).toBeNull(); // janeiro, antes de a rotina existir
  });
});

describe("getRoutineDetailStats", () => {
  it("calcula estatísticas por etapa e sugere ajuste de timer quando desvio é alto", () => {
    const r = routine({
      id: "r1",
      steps: [{ id: "s1", name: "Alongamento", type: "timer", seconds: 60 }],
    });
    const entries = [
      hist({
        routineId: "r1",
        steps: [{ id: "s1", name: "Alongamento", tag: "medio", isRest: false, planned: 60, actual: 120, skipped: false }],
      }),
      hist({
        routineId: "r1",
        steps: [{ id: "s1", name: "Alongamento", tag: "medio", isRest: false, planned: 60, actual: 130, skipped: false }],
      }),
      hist({
        routineId: "r1",
        steps: [{ id: "s1", name: "Alongamento", tag: "medio", isRest: false, planned: 60, actual: 140, skipped: false }],
      }),
    ];

    const stats = getRoutineDetailStats(r, entries);
    expect(stats.allCount).toBe(3);
    expect(stats.stepRows).toHaveLength(1);
    expect(stats.stepRows[0].name).toBe("Alongamento");
    expect(stats.stepRows[0].suggestAdjust).toBe(true);
    expect(stats.stepRows[0].newSec).toBe(150); // ceil(130/30)*30 = 150s
  });
});

describe("relatorioFechamentoHtml", () => {
  const gam = criarEstadoGamificacaoInicial();

  it("gera fallback quando não há semana em curso", () => {
    const gam = criarEstadoGamificacaoInicial();
    const rep = relatorioFechamentoHtml("semanal", gam, [], [], [], "2026-01-10");
    expect(rep.innerHtml).toContain("Sem semana em curso.");
  });

  it("gera relatório semanal com título, pontuação e metas", () => {
    const gam = criarEstadoGamificacaoInicial();
    gam.semanaAtual = {
      inicioISO: "2026-01-04",
      fatorNormalizacao: 1.0,
      totalBrutoAgendado: 100,
      fatoresArea: {},
      habitos: {},
      concluidos: [{ itemId: "c1", rotulo: "Treino", pontos: 20 }],
      agendaCongelada: [],
    };
    const target: MetaTarget = { id: "m1", title: "Comprar livro", date: "2026-01-10", createdAt: 0, topics: 1, done: 1 };
    const rep = relatorioFechamentoHtml("semanal", gam, [hist({ date: "2026-01-08" })], [routine()], [target], "2026-01-10");

    expect(rep.title).toBe("Relatório da semana");
    expect(rep.innerHtml).toContain("Relatório da semana");
    expect(rep.innerHtml).toContain("Pontuação: 20.0 pts");
    expect(rep.innerHtml).toContain("Treino — 20.0 pts");
    expect(rep.innerHtml).toContain("Comprar livro");
  });

  it("gera relatório mensal com chave AAAA-MM", () => {
    const rep = relatorioFechamentoHtml("mensal", gam, [hist({ date: "2026-05-10" })], [routine()], [], "2026-05-20");
    expect(rep.title).toContain("Relatório do mês");
    expect(rep.innerHtml).toContain("2026-05");
  });

  it("gera relatório anual com ano AAAA", () => {
    const rep = relatorioFechamentoHtml("anual", gam, [hist({ date: "2026-08-10" })], [routine()], [], "2026-08-20");
    expect(rep.title).toContain("Relatório do ano");
    expect(rep.innerHtml).toContain("2026");
  });
});

describe("resumo de período, áreas do ano e heatmap por quadrimestre", () => {
  it("getResumoPeriodo soma só o intervalo e calcula o cumprimento das agendadas", () => {
    const r = routine();
    const h = [
      hist({ routineId: "r1", date: "2026-01-05", actualSec: 1200 }),
      hist({ routineId: "r1", date: "2026-02-10", actualSec: 600 }),
    ];
    const res = getResumoPeriodo(new Date(2026, 0, 1, 12), new Date(2026, 0, 31, 12), h, [r], []);
    expect(res.execucoes).toBe(1);
    expect(res.minutos).toBe(20);
    expect(res.planejadas).toBe(31);
    expect(res.feitas).toBe(1);
    expect(res.cumprimento).toBe(3);
  });

  it("getHeatmapData com quadrimestre começa no mês certo e respeita o filtro de rotina", () => {
    const h = [hist({ routineId: "r1", date: "2025-05-06", actualSec: 3600 }), hist({ routineId: "r2", date: "2025-05-07", actualSec: 3600 })];
    const data = getHeatmapData(2025, h, 0, "r1", 2);
    expect(data.columns[0].monthLabel).toBe("mai");
    const cells = data.columns.flatMap((c) => c.cells);
    expect(cells.find((c) => c.key === "2025-04-30")?.inRange).toBe(false);
    expect(cells.find((c) => c.key === "2025-08-31")?.inRange).toBe(true);
    expect(cells.find((c) => c.key === "2025-05-06")?.intensity).toBe("lv3");
    expect(cells.find((c) => c.key === "2025-05-07")?.intensity).toBe("lv0");
  });

  it("getAreasAno agrupa minutos por área da roda com percentual", () => {
    const gam = criarEstadoGamificacaoInicial();
    // estado inicial não traz áreas: cria uma para o teste
    const area = { id: "saude", label: "Saúde", color: "#6b8e6b", peso: 5 };
    gam.config.roda.areas = [area as (typeof gam.config.roda.areas)[number]];
    const rotinas = [routine({ id: "a", eixo: area.id }), routine({ id: "b" })];
    const h = [
      hist({ routineId: "a", date: "2026-03-01", actualSec: 1800 }),
      hist({ routineId: "b", date: "2026-03-02", actualSec: 600 }),
      hist({ routineId: "a", date: "2025-03-01", actualSec: 1800 }),
    ];
    const rows = getAreasAno(2026, h, rotinas, gam);
    expect(rows[0]).toMatchObject({ id: area.id, label: area.label, minutos: 30, pct: 75 });
    expect(rows[1]).toMatchObject({ label: "Sem área", minutos: 10, pct: 25 });
  });
});

