import { describe, expect, it } from "vitest";
import { getDayDetailData, getWeekGridData, snoozedOn } from "./stats";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import type { HistoryEntry } from "./history";
import type { Routine } from "./types";

function routine(overrides: Partial<Routine> = {}): Routine {
  return { id: "r1", name: "Correr", steps: [], schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] }, ...overrides };
}
function hist(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return { date: "2026-01-05", ts: 0, startedTs: 0, routineId: "r1", routineName: "Correr", plannedSec: 60, actualSec: 60, pauses: 0, pausedSec: 0, skippedCount: 0, steps: [], ...overrides };
}

describe("snoozedOn", () => {
  it("verdadeiro só quando a data cai dentro do período pausado", () => {
    const snoozes = [{ from: new Date("2026-01-05").getTime(), to: new Date("2026-01-07").getTime() }];
    expect(snoozedOn(snoozes, new Date("2026-01-06"))).toBe(true);
    expect(snoozedOn(snoozes, new Date("2026-01-10"))).toBe(false);
  });
});

describe("getWeekGridData", () => {
  const gam = criarEstadoGamificacaoInicial();
  it("conta planejadas/feitas/faltantes só até hoje (inclusive), e computa a taxa", () => {
    const hoje = new Date();
    const isoHoje = hoje.toISOString().slice(0, 10);
    const data = getWeekGridData(hoje, [hist({ date: isoHoje })], [routine()], [], gam, 0);
    const diaHoje = data.days.find((d) => d.key === isoHoje)!;
    expect(diaHoje.isToday).toBe(true);
    expect(diaHoje.missedCount).toBe(0); // hoje não conta como "faltou" ainda
    expect(data.plannedTotal).toBeGreaterThan(0);
    expect(data.rate).not.toBeNull();
  });

  it("rotina agendada antes de existir (createdAt no futuro do dia) não entra em planejadas", () => {
    const hoje = new Date();
    const r = routine({ createdAt: hoje.getTime() + 10 * 86400000 }); // criada daqui a 10 dias
    const data = getWeekGridData(hoje, [], [r], [], gam, 0);
    expect(data.plannedTotal).toBe(0);
  });
});

describe("getDayDetailData", () => {
  it("rotina já executada não entra como planejada-pendente", () => {
    const iso = "2026-01-05"; // segunda-feira
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
