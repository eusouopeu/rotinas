import { describe, expect, it } from "vitest";
import { blocosAgendaDia, itensAgendaDoDia } from "./agenda";
import { criarEstadoGamificacaoInicial } from "./gamificacao";
import type { IcalCache, IcalEvent } from "./ical";

const iso = "2026-08-24";
const data = new Date(2026, 7, 24);

function evento(over: Partial<IcalEvent>): IcalEvent {
  return {
    uid: "e1",
    title: "Reunião",
    startMs: new Date(2026, 7, 24, 9, 0).getTime(),
    endMs: new Date(2026, 7, 24, 10, 30).getTime(),
    allDay: false,
    rrule: null,
    exdatesMs: [],
    ...over,
  };
}

describe("itensAgendaDoDia com calendário externo", () => {
  const cache: IcalCache = {
    fetchedAt: Date.now(),
    eventos: [
      evento({}),
      evento({
        uid: "e2",
        title: "Feriado",
        allDay: true,
        startMs: new Date(2026, 7, 24).getTime(),
        endMs: new Date(2026, 7, 25).getTime(),
      }),
    ],
  };

  it("inclui eventos só leitura, dia inteiro no topo", () => {
    const gam = criarEstadoGamificacaoInicial();
    const itens = itensAgendaDoDia(iso, data, [], gam, [], [], [], cache);
    expect(itens.map((i) => i.texto)).toEqual(["Feriado", "Reunião"]);
    expect(itens[0]).toMatchObject({ tipo: "ical", diaTodo: true, ini: null });
    expect(itens[1]).toMatchObject({ tipo: "ical", ini: 540, fim: 630, feito: false });
  });

  it("sem cache continua igual e a grade do dia não duplica o evento", () => {
    const gam = criarEstadoGamificacaoInicial();
    expect(itensAgendaDoDia(iso, data, [], gam, [], [], [])).toEqual([]);
    const blocos = blocosAgendaDia(iso, data, "", [], gam, [], [], [], cache);
    expect(blocos.filter((b) => b.ical)).toHaveLength(1);
  });
});
