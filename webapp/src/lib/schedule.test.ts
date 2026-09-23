import { describe, expect, it } from "vitest";
import { computeSchedule, diasChipLabel, formatHM } from "./schedule";
import type { Routine } from "./types";

describe("formatHM", () => {
  it("formata minutos do dia em HH:MM", () => {
    expect(formatHM(7 * 60 + 5)).toBe("07:05");
  });
  it("normaliza valores negativos (vira do dia anterior)", () => {
    expect(formatHM(-30)).toBe("23:30");
  });
  it("normaliza valores acima de 24h", () => {
    expect(formatHM(25 * 60)).toBe("01:00");
  });
});

describe("computeSchedule", () => {
  const base: Routine = {
    id: "r1",
    name: "Teste",
    steps: [{ id: "s1", name: "Etapa", type: "timer", seconds: 600 }],
    schedule: { enabled: true, anchor: "start", time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] },
  };

  it("sem schedule habilitado devolve null", () => {
    expect(computeSchedule({ ...base, schedule: { ...base.schedule!, enabled: false } })).toBeNull();
  });

  it("âncora início: soma a duração ao horário", () => {
    const sched = computeSchedule(base);
    expect(sched?.startStr).toBe("07:00");
    expect(sched?.endStr).toBe("07:10");
  });

  it("âncora término: subtrai a duração do horário", () => {
    const sched = computeSchedule({ ...base, schedule: { ...base.schedule!, anchor: "end", time: "08:00" } });
    expect(sched?.startStr).toBe("07:50");
    expect(sched?.endStr).toBe("08:00");
  });
});

describe("diasChipLabel — corridas de dias", () => {
  const comDias = (days: number[]): Routine => ({
    id: "r",
    name: "R",
    steps: [],
    schedule: { enabled: true, anchor: "start", time: "07:00", mode: "dias", days },
  });

  it("3+ dias seguidos viram intervalo", () => {
    expect(diasChipLabel(comDias([2, 3, 4, 5]))).toBe("ter → sex");
    expect(diasChipLabel(comDias([1, 2, 3]))).toBe("seg → qua");
  });

  it("dois dias seguidos continuam listados", () => {
    expect(diasChipLabel(comDias([2, 3]))).toBe("ter/qua");
  });

  it("grupos separados: só a corrida longa vira intervalo", () => {
    expect(diasChipLabel(comDias([0, 2, 3, 4]))).toBe("dom/ter → qui");
  });

  it("os rótulos especiais continuam ganhando do intervalo", () => {
    expect(diasChipLabel(comDias([1, 2, 3, 4, 5]))).toBe("dias úteis");
    expect(diasChipLabel(comDias([0, 1, 2, 3, 4, 5, 6]))).toBe("todos os dias");
    expect(diasChipLabel(comDias([0, 6]))).toBe("fim de semana");
  });
});
