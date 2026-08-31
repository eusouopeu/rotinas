import { describe, expect, it } from "vitest";
import { expandirOcorrencias, icalEventosDoDia, icalStale, parseIcs, type IcalCache, type IcalEvent } from "./ical";

describe("parseIcs", () => {
  it("extrai evento simples com horário", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:abc123",
      "SUMMARY:Reunião\\, semanal",
      "DTSTART:20260827T140000Z",
      "DTEND:20260827T150000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const eventos = parseIcs(ics);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].uid).toBe("abc123");
    expect(eventos[0].title).toBe("Reunião, semanal");
    expect(eventos[0].allDay).toBe(false);
    expect(eventos[0].startMs).toBe(Date.UTC(2026, 7, 27, 14, 0, 0));
  });

  it("evento de dia inteiro (sem horário) fica allDay", () => {
    const ics = ["BEGIN:VEVENT", "SUMMARY:Feriado", "DTSTART:20260827", "END:VEVENT"].join("\n");
    const eventos = parseIcs(ics);
    expect(eventos[0].allDay).toBe(true);
  });

  it("descarta VEVENT sem DTSTART", () => {
    const ics = ["BEGIN:VEVENT", "SUMMARY:Sem data", "END:VEVENT"].join("\n");
    expect(parseIcs(ics)).toHaveLength(0);
  });

  it("desdobra linhas de continuação (folding) — o espaço marcador é consumido, não preservado", () => {
    const ics = ["BEGIN:VEVENT", "SUMMARY:Titulo bem\r\n longo continuado", "DTSTART:20260827T100000Z", "END:VEVENT"].join("\r\n");
    expect(parseIcs(ics)[0].title).toBe("Titulo bemlongo continuado");
  });
});

describe("expandirOcorrencias", () => {
  const base: IcalEvent = { uid: "1", title: "Diário", startMs: Date.UTC(2026, 7, 24, 9, 0), endMs: Date.UTC(2026, 7, 24, 9, 30), allDay: false, rrule: null, exdatesMs: [] };

  it("sem RRULE, só a ocorrência original se estiver na janela", () => {
    const janelaIni = Date.UTC(2026, 7, 24, 0, 0);
    const janelaFim = Date.UTC(2026, 7, 24, 23, 59);
    expect(expandirOcorrencias(base, janelaIni, janelaFim)).toEqual([{ startMs: base.startMs, endMs: base.endMs }]);
    expect(expandirOcorrencias(base, Date.UTC(2026, 7, 25, 0, 0), Date.UTC(2026, 7, 25, 23, 59))).toEqual([]);
  });

  it("FREQ=DAILY expande dentro da janela", () => {
    const ev: IcalEvent = { ...base, rrule: "FREQ=DAILY" };
    const ocorrencias = expandirOcorrencias(ev, Date.UTC(2026, 7, 24), Date.UTC(2026, 7, 28));
    expect(ocorrencias).toHaveLength(4);
    expect(ocorrencias[1].startMs).toBe(Date.UTC(2026, 7, 25, 9, 0));
  });

  it("FREQ=DAILY respeita EXDATE", () => {
    const ev: IcalEvent = { ...base, rrule: "FREQ=DAILY", exdatesMs: [Date.UTC(2026, 7, 25, 9, 0)] };
    const ocorrencias = expandirOcorrencias(ev, Date.UTC(2026, 7, 24), Date.UTC(2026, 7, 27));
    expect(ocorrencias.map((o) => o.startMs)).toEqual([Date.UTC(2026, 7, 24, 9, 0), Date.UTC(2026, 7, 26, 9, 0)]);
  });

  it("FREQ=WEEKLY com BYDAY expande nos dias certos", () => {
    // 2026-08-24 é segunda-feira
    const ev: IcalEvent = { ...base, rrule: "FREQ=WEEKLY;BYDAY=MO,WE" };
    const ocorrencias = expandirOcorrencias(ev, Date.UTC(2026, 7, 24), Date.UTC(2026, 7, 30));
    expect(ocorrencias).toHaveLength(2);
    expect(ocorrencias[0].startMs).toBe(Date.UTC(2026, 7, 24, 9, 0));
    expect(ocorrencias[1].startMs).toBe(Date.UTC(2026, 7, 26, 9, 0));
  });

  it("frequência não suportada (ex: MONTHLY) mostra só a ocorrência original", () => {
    const ev: IcalEvent = { ...base, rrule: "FREQ=MONTHLY" };
    const ocorrencias = expandirOcorrencias(ev, Date.UTC(2026, 7, 24), Date.UTC(2026, 8, 30));
    expect(ocorrencias).toEqual([{ startMs: base.startMs, endMs: base.endMs }]);
  });
});

describe("icalEventosDoDia", () => {
  it("retorna vazio sem cache", () => {
    expect(icalEventosDoDia(null, "2026-08-27")).toEqual([]);
  });

  it("filtra e ordena eventos do dia", () => {
    const cache: IcalCache = {
      fetchedAt: Date.now(),
      eventos: [
        { uid: "1", title: "Tarde", startMs: Date.UTC(2026, 7, 27, 18, 0), endMs: Date.UTC(2026, 7, 27, 19, 0), allDay: false, rrule: null, exdatesMs: [] },
        { uid: "2", title: "Manhã", startMs: Date.UTC(2026, 7, 27, 9, 0), endMs: Date.UTC(2026, 7, 27, 10, 0), allDay: false, rrule: null, exdatesMs: [] },
        { uid: "3", title: "Outro dia", startMs: Date.UTC(2026, 7, 28, 9, 0), endMs: Date.UTC(2026, 7, 28, 10, 0), allDay: false, rrule: null, exdatesMs: [] },
      ],
    };
    const out = icalEventosDoDia(cache, "2026-08-27");
    expect(out.map((o) => o.title)).toEqual(["Manhã", "Tarde"]);
  });
});

describe("icalStale", () => {
  it("sem url configurada nunca é stale", () => {
    expect(icalStale("", null)).toBe(false);
  });
  it("com url e sem cache é stale", () => {
    expect(icalStale("https://x", null)).toBe(true);
  });
  it("com cache recente não é stale", () => {
    expect(icalStale("https://x", { fetchedAt: Date.now(), eventos: [] })).toBe(false);
  });
  it("com cache velho (>30min) é stale", () => {
    expect(icalStale("https://x", { fetchedAt: Date.now() - 31 * 60000, eventos: [] })).toBe(true);
  });
});
