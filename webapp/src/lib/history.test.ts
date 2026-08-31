import { describe, expect, it } from "vitest";
import { execucaoDoDia, execucaoMinutos, type HistoryEntry } from "./history";

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    date: "2026-08-24",
    ts: 0,
    startedTs: 0,
    routineId: "r1",
    routineName: "Rotina",
    plannedSec: 0,
    actualSec: 0,
    pauses: 0,
    pausedSec: 0,
    skippedCount: 0,
    steps: [],
    ...over,
  };
}

describe("execucaoDoDia", () => {
  it("acha a execução da rotina nesse dia", () => {
    const h = [entry({ routineId: "r2", date: "2026-08-24" }), entry({ routineId: "r1", date: "2026-08-24" })];
    expect(execucaoDoDia(h, "r1", "2026-08-24")).toBe(h[1]);
  });

  it("sem execução nesse dia devolve null", () => {
    expect(execucaoDoDia([entry({ date: "2026-08-23" })], "r1", "2026-08-24")).toBeNull();
  });

  it("com mais de uma execução no dia, pega a mais recente (última do array)", () => {
    const h = [entry({ actualSec: 100 }), entry({ actualSec: 200 })];
    expect(execucaoDoDia(h, "r1", "2026-08-24")).toBe(h[1]);
  });
});

describe("execucaoMinutos", () => {
  it("usa startedTs quando presente", () => {
    const ini = new Date(2026, 7, 24, 8, 0).getTime();
    const fim = new Date(2026, 7, 24, 8, 45).getTime();
    expect(execucaoMinutos(entry({ startedTs: ini, ts: fim }))).toEqual({ ini: 480, fim: 525 });
  });

  it("sem startedTs, reconstrói o início a partir do fim menos tempo real + pausas", () => {
    const fim = new Date(2026, 7, 24, 8, 45).getTime();
    const h = entry({ startedTs: undefined as unknown as number, ts: fim, actualSec: 20 * 60, pausedSec: 5 * 60 });
    expect(execucaoMinutos(h)).toEqual({ ini: 500, fim: 525 });
  });
});
