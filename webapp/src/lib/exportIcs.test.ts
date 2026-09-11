import { describe, it, expect } from "vitest";
import { agendaIcs, icsEscape } from "./exportIcs";
import type { Compromisso, Routine } from "./types";

function rotina(over: Partial<Routine> = {}): Routine {
  return {
    id: "r1",
    name: "Treino",
    sound: "mudo",
    steps: [{ id: "s1", name: "Aquecer", seconds: 1800, type: "timer" }],
    schedule: { enabled: true, time: "07:00", anchor: "start", days: [1, 3, 5], mode: "dias" },
    restSeconds: 0,
    tagValor: "medio",
    createdAt: 0,
    ...over,
  } as Routine;
}

describe("agendaIcs", () => {
  it("devolve null quando não há rotina com horário nem compromisso", () => {
    expect(agendaIcs([rotina({ schedule: { enabled: false } as Routine["schedule"] })], [])).toBeNull();
    expect(agendaIcs([], [])).toBeNull();
  });

  it("gera VEVENT semanal para rotina agendada por dias", () => {
    // Uma quarta-feira, para o cálculo do primeiro DTSTART ter dia fixo.
    const ics = agendaIcs([rotina()], [], new Date(2026, 8, 9, 12, 0, 0));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:r1@brita");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(ics).toContain("SUMMARY:Treino");
    // 9/9/2026 é quarta (dia 3), que está na lista — começa no próprio dia, 07:00
    expect(ics).toContain("DTSTART:20260909T070000");
    // 30 min de etapa => DTEND 07:30
    expect(ics).toContain("DTEND:20260909T073000");
    expect(ics?.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("usa RRULE diária com INTERVAL no modo intervalo", () => {
    const r = rotina({
      schedule: { enabled: true, time: "06:00", anchor: "start", mode: "intervalo", intervaloDias: 3, intervaloInicio: "2026-09-09" } as Routine["schedule"],
    });
    const ics = agendaIcs([r], [], new Date(2026, 8, 9, 12, 0, 0));
    expect(ics).toContain("RRULE:FREQ=DAILY;INTERVAL=3");
  });

  it("compromisso sem horário vira evento de dia inteiro", () => {
    const c: Compromisso = { id: "c1", title: "Dentista", date: "2026-09-14", time: "", notify: "nenhuma", createdAt: 0 };
    const ics = agendaIcs([], [c], new Date(2026, 8, 9));
    expect(ics).toContain("DTSTART;VALUE=DATE:20260914");
    expect(ics).not.toContain("DTEND");
  });

  it("compromisso com horário vira evento de uma hora", () => {
    const c: Compromisso = { id: "c2", title: "Reunião", date: "2026-09-14", time: "15:30", notify: "nenhuma", createdAt: 0 };
    const ics = agendaIcs([], [c], new Date(2026, 8, 9));
    expect(ics).toContain("DTSTART:20260914T153000");
    expect(ics).toContain("DTEND:20260914T163000");
  });

  it("escapa os caracteres reservados do formato", () => {
    expect(icsEscape("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });
});
