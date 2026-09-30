// Porta de Calendário externo (index.html:365-509) — busca + parser ICS
// mínimo + expansão de recorrência. Só leitura, nunca synced/backup (é uma
// cópia derivada de um serviço de fora, refazer o fetch já resolve; não faz
// sentido herdar backupData()/SYNCED_KEYS). Horário com TZID é tratado como
// hora de parede local (sem conversão de fuso de verdade). RRULE expande só
// FREQ=DAILY|WEEKLY|MONTHLY|YEARLY; outras mostram só a ocorrência do DTSTART
// original. Desde 30/09/2026 também MONTHLY/YEARLY (mesmo dia), busca nativa
// no Android e erros com o motivo (ver fetchIcalText).
import { K_ICALCACHE, K_ICALURL } from "./constants";
import { CapacitorHttp } from "@capacitor/core";
import { isDesktop, isNative, load, save } from "./storage";
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

/** Erro de busca com o motivo já em português, para o card mostrar. */
export class IcalErro extends Error {}

/** Aceita o que o Pedro tende a colar do Google (30/09/2026): `webcal://`,
 *  o link de incorporar (`embed?src=`) e o de compartilhar (`?cid=`) viram o
 *  endereço .ics público daquela agenda. O endereço secreto passa intacto. */
export function normalizarUrlIcal(bruta: string): string {
  let u = bruta.trim().replace(/^webcals?:\/\//i, "https://");
  try {
    const url = new URL(u);
    if (/(^|\.)calendar\.google\.com$/i.test(url.hostname) && !/\/ical\//.test(url.pathname)) {
      let id = url.searchParams.get("src");
      const cid = url.searchParams.get("cid");
      if (!id && cid) {
        try {
          id = cid.includes("@") ? cid : atob(cid.replace(/-/g, "+").replace(/_/g, "/"));
        } catch {
          id = cid;
        }
      }
      if (id) u = `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
    }
  } catch {
    // não é URL: a busca abaixo explica o erro
  }
  return u;
}

/** fetch do renderer bate em CORS na maioria dos provedores (endpoint ICS é
 * pensado pra cliente de calendário, não pra JS de página) — no desktop o main
 * process busca sem essa restrição; no Android vai direto pelo CapacitorHttp
 * nativo (o fetch "remendado" dele não é confiável com AbortController nem com
 * resposta text/calendar). */
export async function fetchIcalText(bruta: string): Promise<string> {
  const url = normalizarUrlIcal(bruta);
  if (!/^https?:\/\//i.test(url)) throw new IcalErro("O endereço precisa começar com https://");
  let status = 0;
  let texto = "";
  try {
    if (isDesktop && window.electronBridge?.ical) {
      texto = await window.electronBridge.ical.fetch(url);
      status = 200;
    } else if (isNative) {
      const r = await CapacitorHttp.get({ url, responseType: "text", connectTimeout: 15000, readTimeout: 20000 });
      status = r.status;
      texto = typeof r.data === "string" ? r.data : JSON.stringify(r.data ?? "");
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        status = res.status;
        texto = await res.text();
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (e) {
    // o Electron repassa o status como "HTTP 404" dentro da mensagem do IPC
    const m = /HTTP (\d{3})/.exec(String(e));
    if (m) status = +m[1];
    else
      throw new IcalErro(
        isNative || isDesktop
          ? "Sem conexão com o calendário — confira a internet e tente de novo."
          : "O navegador bloqueou a busca (CORS). No app instalado funciona."
      );
  }
  if (status === 404)
    throw new IcalErro(
      'Endereço não encontrado. No Google, use o "Endereço secreto em formato iCal" (o público só funciona se a agenda for pública).'
    );
  if (status === 401 || status === 403)
    throw new IcalErro('Acesso negado. Use o "Endereço secreto em formato iCal" da agenda.');
  if (status && (status < 200 || status >= 300)) throw new IcalErro(`O servidor respondeu com erro (${status}).`);
  if (!/BEGIN:VCALENDAR/.test(texto))
    throw new IcalErro(
      'Esse link não é de um calendário .ics. No Google: Configurações da agenda → "Endereço secreto em formato iCal".'
    );
  return texto;
}

function icsUnfold(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .reduce<string[]>((lines, line) => {
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
      cur = {
        uid: "",
        title: "",
        startMs: null as unknown as number,
        endMs: null,
        allDay: false,
        rrule: null,
        exdatesMs: [],
      };
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
    else if (prop === "SUMMARY")
      cur.title = val.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
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
export function expandirOcorrencias(
  ev: IcalEvent,
  janelaIni: number,
  janelaFim: number
): Array<{ startMs: number; endMs: number }> {
  const dur = ev.endMs != null && ev.endMs > ev.startMs ? ev.endMs - ev.startMs : ev.allDay ? 86400000 : 3600000;
  // fim exclusivo: um evento de dia inteiro termina à 0h do dia seguinte e
  // não pode aparecer nele também
  const naJanela = (ms: number) => ms <= janelaFim && ms + dur > janelaIni;
  if (!ev.rrule) {
    return naJanela(ev.startMs) ? [{ startMs: ev.startMs, endMs: ev.startMs + dur }] : [];
  }
  const r = parseRrule(ev.rrule);
  const interval = Math.max(1, +r.INTERVAL || 1);
  const count = r.COUNT ? +r.COUNT : null;
  const until = r.UNTIL ? ((icsParseDate(r.UNTIL) || {}).ms ?? null) : null;
  const out: Array<{ startMs: number; endMs: number }> = [];
  if (r.FREQ === "MONTHLY" || r.FREQ === "YEARLY") {
    // mesmo dia do mês (ou do ano) do DTSTART — aniversários do Google são YEARLY
    const base = new Date(ev.startMs);
    const passo = r.FREQ === "YEARLY" ? 12 * interval : interval;
    for (let n = 0; n < ICAL_EXPAND_MAX; n++) {
      const occ = new Date(base);
      occ.setMonth(base.getMonth() + n * passo);
      if (occ.getDate() !== base.getDate()) continue; // 31 num mês de 30: não existe
      const ms = occ.getTime();
      if (until != null && ms > until) break;
      if (count != null && n >= count) break;
      if (ms > janelaFim) break;
      if (naJanela(ms) && !ev.exdatesMs.includes(ms)) out.push({ startMs: ms, endMs: ms + dur });
    }
    return out;
  }
  if (r.FREQ !== "DAILY" && r.FREQ !== "WEEKLY") {
    return naJanela(ev.startMs) ? [{ startMs: ev.startMs, endMs: ev.startMs + dur }] : [];
  }
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
      ? [
          ...new Set(
            r.BYDAY.split(",")
              .map((d) => ICAL_DOW[d])
              .filter((d) => d != null)
          ),
        ].sort((a, b) => a - b)
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
  // eventos que já acabaram há mais de 60 dias e não se repetem não aparecem
  // em lugar nenhum e só incham o armazenamento (agendas antigas do Google têm
  // milhares)
  const corte = Date.now() - 60 * 86400000;
  const eventos = parseIcs(text).filter((e) => e.rrule || (e.endMs ?? e.startMs) >= corte);
  const cache: IcalCache = { fetchedAt: Date.now(), eventos };
  saveIcalCache(cache);
  return cache;
}

/** Atualiza em segundo plano se a última busca tem mais de 30 min (abrir o
 *  app). Falha silenciosa: o card de Ajustes mostra o erro quando pedido. */
export async function atualizarIcalSeVencido(): Promise<IcalCache | null> {
  const url = getIcalUrl();
  if (!icalStale(url, getIcalCache())) return null;
  try {
    return await atualizarIcal(url);
  } catch {
    return null;
  }
}
