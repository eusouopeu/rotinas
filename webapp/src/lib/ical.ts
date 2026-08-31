// Porta de Calendário externo (index.html:365-509) — busca + parser ICS
// mínimo + expansão de recorrência. Só leitura, nunca synced/backup (é uma
// cópia derivada de um serviço de fora, refazer o fetch já resolve; não faz
// sentido herdar backupData()/SYNCED_KEYS). Horário com TZID é tratado como
// hora de parede local (sem conversão de fuso de verdade). RRULE expande só
// FREQ=DAILY|WEEKLY; outras frequências mostram só a ocorrência do DTSTART
// original.
import { K_ICALCACHE, K_ICALURL } from "./constants";
import { isDesktop, load, save } from "./storage";
import { isoToDate } from "./gamificacao";

export interface IcalEvent {
  uid: string;
  title: string;
  startMs: number;
  endMs: number | null;
  allDay: boolean;
  rrule: string | null;
  exdatesMs: number[];
}

export interface IcalCache {
  fetchedAt: number;
  eventos: IcalEvent[];
}

export interface IcalOcorrencia {
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
}

export function getIcalUrl(): string {
  return load(K_ICALURL, "");
}

export function saveIcalUrl(url: string): void {
  save(K_ICALURL, url);
}

export function getIcalCache(): IcalCache | null {
  return load<IcalCache | null>(K_ICALCACHE, null);
}

export function saveIcalCache(cache: IcalCache | null): void {
  save(K_ICALCACHE, cache);
}

/** fetch do renderer bateria em CORS na maioria dos provedores (endpoint ICS
 * é pensado pra cliente de calendário, não pra JS de página) — no desktop o
 * main process busca sem essa restrição; no Android o CapacitorHttp
 * (capacitor.config.json) intercepta o fetch e evita o mesmo problema. */
export async function fetchIcalText(url: string): Promise<string> {
  if (isDesktop && window.electronBridge?.ical) return window.electronBridge.ical.fetch(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function icsUnfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n").reduce<string[]>((lines, line) => {
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
    return lines;
  }, []);
}

function icsParseDate(val: string): { ms: number; allDay: boolean } | null {
  // "20260827" (dia inteiro) | "20260827T140000Z" (UTC) | "20260827T140000" (local/TZID)
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec((val || "").trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) return { ms: new Date(+y, +mo - 1, +d).getTime(), allDay: true };
  if (z) return { ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
  return { ms: new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime(), allDay: false };
}

export function parseIcs(text: string): IcalEvent[] {
  const eventos: IcalEvent[] = [];
  let cur: IcalEvent | null = null;
  icsUnfold(text).forEach((raw) => {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      cur = { uid: "", title: "", startMs: null as unknown as number, endMs: null, allDay: false, rrule: null, exdatesMs: [] };
      return;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.startMs != null) eventos.push(cur);
      cur = null;
      return;
    }
    if (!cur) return;
    const ci = line.indexOf(":");
    if (ci < 0) return;
    const prop = line.slice(0, ci).split(";")[0].toUpperCase();
    const val = line.slice(ci + 1);
    if (prop === "UID") cur.uid = val;
    else if (prop === "SUMMARY") cur.title = val.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
    else if (prop === "DTSTART") {
      const d = icsParseDate(val);
      if (d) {
        cur.startMs = d.ms;
        cur.allDay = d.allDay;
      }
    } else if (prop === "DTEND") {
      const d = icsParseDate(val);
      if (d) cur.endMs = d.ms;
    } else if (prop === "RRULE") cur.rrule = val;
    else if (prop === "EXDATE")
      val.split(",").forEach((v) => {
        const d = icsParseDate(v);
        if (d) cur!.exdatesMs.push(d.ms);
      });
  });
  return eventos;
}

function parseRrule(rr: string): Record<string, string> {
  const out: Record<string, string> = {};
  rr.split(";").forEach((p) => {
    const [k, v] = p.split("=");
    if (k) out[k] = v;
  });
  return out;
}

const ICAL_EXPAND_MAX = 400; // teto de ocorrências expandidas por evento — trava RRULE patológica
const ICAL_DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Ocorrências (em ms) de `ev` que caem dentro de [janelaIni, janelaFim]
 * (inclusive). Sem RRULE: só a ocorrência original, se estiver na janela. */
export function expandirOcorrencias(ev: IcalEvent, janelaIni: number, janelaFim: number): Array<{ startMs: number; endMs: number }> {
  const dur = ev.endMs != null && ev.endMs > ev.startMs ? ev.endMs - ev.startMs : ev.allDay ? 86400000 : 3600000;
  const naJanela = (ms: number) => ms <= janelaFim && ms + dur >= janelaIni;
  if (!ev.rrule) {
    return naJanela(ev.startMs) ? [{ startMs: ev.startMs, endMs: ev.startMs + dur }] : [];
  }
  const r = parseRrule(ev.rrule);
  if (r.FREQ !== "DAILY" && r.FREQ !== "WEEKLY") {
    return naJanela(ev.startMs) ? [{ startMs: ev.startMs, endMs: ev.startMs + dur }] : [];
  }
  const interval = Math.max(1, +r.INTERVAL || 1);
  const count = r.COUNT ? +r.COUNT : null;
  const until = r.UNTIL ? (icsParseDate(r.UNTIL) || {}).ms ?? null : null;
  const out: Array<{ startMs: number; endMs: number }> = [];
  if (r.FREQ === "DAILY") {
    for (let n = 0; n < ICAL_EXPAND_MAX; n++) {
      const ms = ev.startMs + n * interval * 86400000;
      if (until != null && ms > until) break;
      if (count != null && n >= count) break;
      if (ms > janelaFim) break; // monótono crescente: dali em diante só piora
      if (naJanela(ms) && !ev.exdatesMs.includes(ms)) out.push({ startMs: ms, endMs: ms + dur });
    }
  } else {
    // WEEKLY
    const base = new Date(ev.startMs);
    const byday = r.BYDAY
      ? [...new Set(r.BYDAY.split(",").map((d) => ICAL_DOW[d]).filter((d) => d != null))].sort((a, b) => a - b)
      : [base.getDay()];
    const semana0 = new Date(base);
    semana0.setHours(0, 0, 0, 0);
    semana0.setDate(semana0.getDate() - base.getDay());
    let occCount = 0;
    let pare = false;
    for (let w = 0; w < Math.ceil(ICAL_EXPAND_MAX / byday.length) + 2 && !pare; w++) {
      const semanaIni = new Date(semana0);
      semanaIni.setDate(semana0.getDate() + w * interval * 7);
      if (semanaIni.getTime() > janelaFim) break;
      for (const dow of byday) {
        const occ = new Date(semanaIni);
        occ.setDate(semanaIni.getDate() + dow);
        occ.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
        const ms = occ.getTime();
        if (ms < ev.startMs) continue; // RRULE nunca gera antes do DTSTART
        if (until != null && ms > until) {
          pare = true;
          break;
        }
        occCount++;
        if (count != null && occCount > count) {
          pare = true;
          break;
        }
        if (naJanela(ms) && !ev.exdatesMs.includes(ms)) out.push({ startMs: ms, endMs: ms + dur });
      }
    }
  }
  return out.slice(0, ICAL_EXPAND_MAX);
}

/** Eventos importados que caem no dia `iso` (qualquer ocorrência, expandida). */
export function icalEventosDoDia(cache: IcalCache | null, iso: string): IcalOcorrencia[] {
  if (!cache || !cache.eventos || !cache.eventos.length) return [];
  const ini = isoToDate(iso).getTime();
  const fim = ini + 86400000 - 1;
  const out: IcalOcorrencia[] = [];
  cache.eventos.forEach((ev) => {
    expandirOcorrencias(ev, ini, fim).forEach((occ) => {
      out.push({ title: ev.title || "(sem título)", startMs: occ.startMs, endMs: occ.endMs, allDay: ev.allDay });
    });
  });
  out.sort((a, b) => a.startMs - b.startMs);
  return out;
}

export function icalStale(url: string, cache: IcalCache | null): boolean {
  return !!url && (!cache || Date.now() - (cache.fetchedAt || 0) > 30 * 60000);
}

export async function atualizarIcal(url: string): Promise<IcalCache> {
  const text = await fetchIcalText(url);
  const cache: IcalCache = { fetchedAt: Date.now(), eventos: parseIcs(text) };
  saveIcalCache(cache);
  return cache;
}
