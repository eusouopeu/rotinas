import { describe, expect, it } from "vitest";
import { computeSchedule, diasChipLabel, formatHM, pausaAtualOuFutura, rotinaPausadaEm } from "./schedule";
import { rotinaCabeEmHoje } from "./routines";
import { itensAgendaDoDia } from "./agenda";
import { construirAgendaSemana } from "./scoring";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import { planoNotificacaoRotinas } from "./notifications";
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

describe("pausa só da rotina (27/09/2026)", () => {
  const base: Routine = {
    id: "r1",
    name: "Treino",
    steps: [{ id: "s1", name: "Supino", type: "timer", seconds: 600 }],
    schedule: { enabled: true, anchor: "start", time: "18:00", days: [1, 3, 5] },
    pausas: [{ de: "2026-09-28", ate: "2026-10-04" }],
  };

  it("rotinaPausadaEm e pausaAtualOuFutura respeitam as datas inclusivas", () => {
    expect(rotinaPausadaEm(base, new Date(2026, 8, 27))).toBe(false);
    expect(rotinaPausadaEm(base, new Date(2026, 8, 28))).toBe(true);
    expect(rotinaPausadaEm(base, new Date(2026, 9, 4))).toBe(true);
    expect(pausaAtualOuFutura(base, new Date(2026, 8, 27))).toEqual(base.pausas![0]);
    expect(pausaAtualOuFutura(base, new Date(2026, 9, 5))).toBeNull();
  });

  it("sai do 'hoje', da agenda e da agenda da semana (pontuação)", () => {
    const seg = new Date(2026, 8, 28);
    expect(rotinaCabeEmHoje(base, seg)).toBe(false);
    expect(rotinaCabeEmHoje(base, new Date(2026, 9, 5))).toBe(true);
    const gam = criarEstadoGamificacaoInicial();
    expect(itensAgendaDoDia("2026-09-28", seg, [base], gam, [], [], []).length).toBe(0);
    const semana = construirAgendaSemana([base], gam, "2026-09-27"); // dom 27 – sáb 03: seg/qua/sex pausados
    expect(semana.itens.length).toBe(0);
  });

  it("alarme vira avulso e pula os dias pausados", () => {
    const plano = planoNotificacaoRotinas([base], new Date(2026, 8, 27, 12).getTime());
    expect(plano.every((p) => p.at != null)).toBe(true);
    const dias = plano.map((p) => new Date(p.at!).getDate());
    expect(dias.slice(0, 3)).toEqual([5, 7, 9]); // seg 05, qua 07, sex 09/10
  });
});
