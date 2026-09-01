import { describe, expect, it } from "vitest";
import { notifIdFor, planoNotificacaoCompromissos, planoNotificacaoRotinas } from "./notifications";
import type { Compromisso, Routine } from "./types";

describe("notifIdFor", () => {
  it("é estável pra mesma chave/dia e muda com o dia", () => {
    expect(notifIdFor("x", 2)).toBe(notifIdFor("x", 2));
    expect(notifIdFor("x", 2)).not.toBe(notifIdFor("x", 3));
  });
});

describe("planoNotificacaoCompromissos", () => {
  it("ignora sem notify/feito/passado, e agenda um dia antes quando pedido", () => {
    const agora = new Date("2026-01-10T08:00:00").getTime();
    const compromissos: Compromisso[] = [
      { id: "a", title: "Sem notify", date: "2026-01-15", time: "10:00", notify: "nenhuma", createdAt: 0 },
      { id: "b", title: "Feito", date: "2026-01-15", time: "10:00", notify: "nodia", createdAt: 0, feito: true },
      { id: "c", title: "Reunião", date: "2026-01-15", time: "10:00", notify: "diaanterior", createdAt: 0 },
    ];
    const plano = planoNotificacaoCompromissos(compromissos, agora);
    expect(plano).toHaveLength(1);
    expect(plano[0].title).toBe("Amanhã: Reunião");
    expect(new Date(plano[0].when).toISOString().slice(0, 10)).toBe("2026-01-14");
  });
});

describe("planoNotificacaoRotinas", () => {
  it("modo dias vira um plano recorrente por dia da semana agendado", () => {
    const r: Routine = { id: "r1", name: "Correr", steps: [{ id: "s1", name: "Correr", type: "timer", seconds: 1800 }], schedule: { enabled: true, anchor: "start", time: "07:00", days: [1, 3] } };
    const plano = planoNotificacaoRotinas([r], Date.now());
    expect(plano).toHaveLength(2);
    expect(plano.map((p) => p.weekday).sort()).toEqual([2, 4]); // weekday do plugin: 1=domingo
    expect(plano[0].hour).toBe(7);
  });

  it("rotina desativada ou sem horário não entra no plano", () => {
    const r: Routine = { id: "r1", name: "X", steps: [], schedule: { enabled: false, anchor: "start", time: "07:00", days: [1] } };
    expect(planoNotificacaoRotinas([r], Date.now())).toEqual([]);
  });
});
