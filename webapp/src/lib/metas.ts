// Porta parcial de index.html:1637-1726 — só Prazos (metas com data-limite).
// Recorrentes (hábitos N vezes/semana, com penalidade se "negativa") ficam
// para outra fase: são um sub-sistema de pontuação à parte, não uma variação
// pequena deste. Sub-metas (parentId/bloqueio) e áreas da roda da vida também
// ficam de fora por ora.
import { addDaysISO, inicioSemanaISO, isoToDate, localKey, tagMultiplicador, trimestreDe } from "./gamificacao";
import { CORES_AREA_600, K_METASSUBVIEW, K_METASSUBVIEWSEL } from "./constants";
import type {
  CountdownDoc,
  GamificacaoState,
  MetaEscopo,
  MetaMarco,
  MetaRecProgresso,
  MetaRecorrente,
  MetaTarget,
} from "./types";
import { fmtNum } from "./format";

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function cdUnit(t: { unit?: string }): string {
  return (t.unit && t.unit.trim()) || "tópicos";
}

export interface MetaPace {
  days: number;
  remaining: number;
  txt: string;
}

export function cdPace(t: Pick<MetaTarget, "date" | "topics" | "done" | "unit">): MetaPace | null {
  const days = daysUntil(t.date);
  if (t.topics == null) return null;
  const unit = cdUnit(t);
  const remaining = Math.max(0, t.topics - (t.done || 0));
  if (days <= 0 || remaining <= 0) return { days, remaining, txt: remaining === 0 ? "concluído" : "prazo esgotado" };
  const perDay = remaining / days;
  const txt =
    perDay >= 1 ? fmtNum(perDay, 1) + " " + unit + "/dia" : "1 a cada " + fmtNum(days / remaining, 1) + " dias";
  return { days, remaining, txt };
}

/** <30 dias de prazo desde a criação = mensal, <=90 = trimestral, resto anual. */
export function metaEscopo(t: Pick<MetaTarget, "createdAt" | "date">): MetaEscopo {
  const ini = t.createdAt ? new Date(t.createdAt) : new Date();
  const dias = Math.round((new Date(t.date).getTime() - ini.getTime()) / 86400000);
  if (dias < 30) return "mensal";
  if (dias <= 90) return "trimestral";
  return "anual";
}

export function periodoDeEscopo(escopo: MetaEscopo, data: Date): string {
  const anoMes = localKey(data).slice(0, 7);
  if (escopo === "mensal") return anoMes;
  if (escopo === "trimestral") return trimestreDe(anoMes);
  return anoMes.slice(0, 4);
}

export function metaConcluida(t: Pick<MetaTarget, "topics" | "done">): boolean {
  return t.topics != null && (t.done || 0) >= t.topics;
}

/** Peso da meta (padrão alto, ×3) multiplica os pontos-base do escopo dela. */
export function metaPontosTotais(t: MetaTarget, gam: GamificacaoState): number {
  return (gam.config.pontosMeta[metaEscopo(t)] || 0) * tagMultiplicador(t.tagValor || "alto", gam.config);
}

export function metaCreditado(t: Pick<MetaTarget, "creditos">): number {
  const c = t.creditos || {};
  return Object.keys(c).reduce((s, k) => s + c[k], 0);
}

export function metaPontosDevidos(t: MetaTarget, gam: GamificacaoState): number {
  if (!t.topics || t.topics <= 0) return 0;
  const frac = Math.max(0, Math.min(1, (t.done || 0) / t.topics));
  return metaPontosTotais(t, gam) * frac;
}

/**
 * Porta de aplicarDeltaMeta (index.html:1688-1710), sem efeitos colaterais —
 * devolve cópias atualizadas de `target`/`gam` em vez de mutar+save() direto,
 * pra caber no padrão de store do React (quem chama decide o que persistir).
 */
export function aplicarDeltaMeta(
  t: MetaTarget,
  gam: GamificacaoState,
  delta: number
): { target: MetaTarget; gam: GamificacaoState } {
  if (Math.abs(delta) < 1e-9) return { target: t, gam };
  const creditos = { ...(t.creditos || {}) };
  const metasPontos = { ...gam.metasPontos };
  const atual = periodoDeEscopo(metaEscopo(t), new Date());

  if (delta > 0) {
    creditos[atual] = (creditos[atual] || 0) + delta;
    metasPontos[atual] = (metasPontos[atual] || 0) + delta;
  } else {
    let resta = -delta;
    const periodos = [
      atual,
      ...Object.keys(creditos)
        .filter((p) => p !== atual)
        .sort()
        .reverse(),
    ];
    for (const p of periodos) {
      if (resta <= 1e-9) break;
      const tira = Math.min(creditos[p] || 0, resta);
      if (tira <= 0) continue;
      creditos[p] -= tira;
      metasPontos[p] = Math.max(0, (metasPontos[p] || 0) - tira);
      if (metasPontos[p] < 1e-9) delete metasPontos[p];
      if (creditos[p] < 1e-9) delete creditos[p];
      resta -= tira;
    }
  }
  return { target: { ...t, creditos }, gam: { ...gam, metasPontos } };
}

/** Porta de sincronizarPontosMeta (index.html:1713-1726) — chamar depois de
 * qualquer mudança em done/topics/prazo/peso. */
export function sincronizarPontosMeta(
  t: MetaTarget,
  gam: GamificacaoState
): { target: MetaTarget; gam: GamificacaoState; delta: number } {
  const devido = metaPontosDevidos(t, gam);
  const delta = devido - metaCreditado(t);
  if (Math.abs(delta) < 0.05) return { target: t, gam, delta: 0 };
  const r = aplicarDeltaMeta(t, gam, delta);
  return { ...r, delta };
}

/** Porta de estornarMetaConcluida (index.html:1730-1735) — usar ao excluir. */
export function estornarMeta(t: MetaTarget, gam: GamificacaoState): { target: MetaTarget; gam: GamificacaoState } {
  const pago = metaCreditado(t);
  if (pago <= 0) return { target: { ...t, creditos: undefined }, gam };
  const r = aplicarDeltaMeta(t, gam, -pago);
  return { target: { ...r.target, creditos: undefined }, gam: r.gam };
}

/* ---- Metas Recorrentes (index.html:7960-8420) ---- */

export function metaRecPeriodoAtual(rec: Pick<MetaRecorrente, "tipo">, data: Date = new Date()): string {
  return rec.tipo === "semanal" ? "semana:" + inicioSemanaISO(data) : "dia:" + localKey(data);
}

export const METAREC_HISTORICO_MAX = 60;

/**
 * Meta com o período corrente aberto: se o dia/semana virou desde o último
 * registro, fecha o período antigo (sequência + histórico) e abre um zerado.
 * Pura — devolve o mesmo objeto quando nada virou. Até 27/09/2026 isso era
 * feito mutando a meta dentro de metaRecProgresso, durante o render do cartão,
 * e só persistia no próximo save qualquer; agora a store vira as metas no boot
 * e na volta ao app (virarMetasRec) e grava na hora.
 */
export function virarPeriodoMetaRec(rec: MetaRecorrente, data: Date = new Date()): MetaRecorrente {
  const per = metaRecPeriodoAtual(rec, data);
  if (rec.progresso && rec.progresso.periodo === per) return rec;
  if (!rec.progresso) return { ...rec, progresso: { periodo: per, feitas: 0, vezes: rec.vezes } };
  const fechado = { ...rec.progresso, vezes: rec.progresso.vezes ?? rec.vezes };
  const historico = [...(rec.historico || []), fechado];
  const vazios = Math.min(periodosVazios(rec, fechado.periodo, data), METAREC_HISTORICO_MAX);
  const passo = rec.tipo === "semanal" ? 7 : 1;
  const ini = fechado.periodo.slice(fechado.periodo.indexOf(":") + 1);
  for (let i = 1; i <= vazios; i++) {
    const d = isoParaData(ini);
    d.setDate(d.getDate() + i * passo);
    historico.push({ periodo: metaRecPeriodoAtual(rec, d), feitas: 0, vezes: rec.vezes });
  }
  return {
    ...rec,
    sequencia: sequenciaAoFechar(rec, fechado, data),
    historico: historico.slice(-METAREC_HISTORICO_MAX),
    progresso: { periodo: per, feitas: 0, vezes: rec.vezes },
  };
}

function isoParaData(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Progresso do período corrente (zerado se o período virou). Não altera a meta. */
export function metaRecProgresso(rec: MetaRecorrente, data: Date = new Date()): MetaRecProgresso {
  return virarPeriodoMetaRec(rec, data).progresso!;
}

/** Documento com todas as metas recorrentes viradas para o período de `data`;
 * devolve o mesmo doc se nenhuma virou (a store só grava quando muda). */
export function virarMetasRecDoc(doc: CountdownDoc, data: Date = new Date()): CountdownDoc {
  const recs = doc.recorrentes || [];
  let mudou = false;
  const novas = recs.map((r) => {
    const v = virarPeriodoMetaRec(r, data);
    if (v !== r) mudou = true;
    return v;
  });
  return mudou ? { ...doc, recorrentes: novas } : doc;
}

/** Período cumprido pelo limite DELE (`p.vezes`), não o atual da meta. */
/**
 * Troca do início da semana (27/09/2026): a chave do período semanal é a data
 * em que a semana começa, então mudar o início em Ajustes deixava histórico e
 * progresso com chaves que não batem mais — a sequência zerava e a Semana
 * fechada não achava o período. Reancora: o período em curso vira a semana
 * nova que contém hoje (preserva o progresso); cada período fechado vira a
 * semana nova que contém o meio da semana antiga (dias +3), o que mantém
 * semanas vizinhas distintas. Colisão com o período em curso é descartada.
 * Meta diária não muda. Devolve o mesmo doc se nada mudou.
 */
export function reancorarMetasRecSemana(doc: CountdownDoc, novoInicio: number, hoje: Date = new Date()): CountdownDoc {
  const recs = doc.recorrentes || [];
  if (!recs.some((r) => r.tipo === "semanal")) return doc;
  const chave = (iso: string) => {
    const d = isoParaData(iso);
    d.setDate(d.getDate() + 3);
    return "semana:" + inicioSemanaISO(d, novoInicio);
  };
  const atualNovo = "semana:" + inicioSemanaISO(hoje, novoInicio);
  const atualVelho = metaRecPeriodoAtual({ tipo: "semanal" }, hoje);
  let mudou = false;
  const novas = recs.map((r) => {
    if (r.tipo !== "semanal") return r;
    const iniDe = (per: string) => per.slice(per.indexOf(":") + 1);
    const progresso = r.progresso
      ? { ...r.progresso, periodo: r.progresso.periodo === atualVelho ? atualNovo : chave(iniDe(r.progresso.periodo)) }
      : r.progresso;
    const vistos = new Set<string>([progresso?.periodo || ""]);
    const historico = (r.historico || [])
      .map((p) => ({ ...p, periodo: chave(iniDe(p.periodo)) }))
      .filter((p) => (vistos.has(p.periodo) ? false : (vistos.add(p.periodo), true)));
    mudou = true;
    return { ...r, progresso, historico };
  });
  return mudou ? { ...doc, recorrentes: novas } : doc;
}

export function metaRecCumprido(
  rec: Pick<MetaRecorrente, "negativa" | "vezes">,
  p: Pick<MetaRecProgresso, "feitas" | "vezes">
): boolean {
  return periodoCumprido({ negativa: rec.negativa, vezes: p.vezes ?? rec.vezes }, p.feitas);
}

function periodoCumprido(rec: Pick<MetaRecorrente, "negativa" | "vezes">, feitas: number): boolean {
  return rec.negativa ? feitas <= rec.vezes : feitas >= rec.vezes;
}

/** Quantos períodos inteiros existem entre o período fechado e o atual (0 =
 * adjacentes). Períodos sem nenhum registro contam como feitas = 0. */
function periodosVazios(rec: Pick<MetaRecorrente, "tipo">, perFechado: string, data: Date): number {
  const ini = perFechado.slice(perFechado.indexOf(":") + 1);
  const [y, m, d] = ini.split("-").map(Number);
  const atual = metaRecPeriodoAtual(rec, data);
  const iniAtual = atual.slice(atual.indexOf(":") + 1);
  const [ya, ma, da] = iniAtual.split("-").map(Number);
  const dias = Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(y, m - 1, d)) / 86400000);
  const passo = rec.tipo === "semanal" ? 7 : 1;
  return Math.max(0, Math.round(dias / passo) - 1);
}

/** Sequência depois de fechar `fechado`: soma o período se cumprido e os
 * períodos vazios no meio (vazio cumpre meta negativa e quebra a positiva). */
function sequenciaAoFechar(rec: MetaRecorrente, fechado: MetaRecProgresso, data: Date): number {
  let seq = rec.sequencia || 0;
  seq = metaRecCumprido(rec, fechado) ? seq + 1 : 0;
  const vazios = periodosVazios(rec, fechado.periodo, data);
  if (vazios > 0) seq = periodoCumprido(rec, 0) ? seq + vazios : 0;
  return seq;
}

/** Sequência exibida: períodos fechados em sequência + o atual quando já
 * cumprido (positiva). Meta negativa só soma o período atual ao fechar. */
export function metaRecSequencia(rec: MetaRecorrente, data: Date = new Date()): number {
  const v = virarPeriodoMetaRec(rec, data);
  const feitas = v.progresso!.feitas;
  const base = v.sequencia || 0;
  return !rec.negativa && feitas >= rec.vezes ? base + 1 : base;
}

/** Meta negativa: saldo que ainda resta (vezes - feitas); abaixo de zero é o
 * que desconta pontos no boletim. */
export function metaRecSaldo(rec: MetaRecorrente, data: Date = new Date()): number {
  return rec.vezes - metaRecFeitas(rec, data);
}

export function metaRecFeitas(rec: MetaRecorrente, data: Date = new Date()): number {
  return metaRecProgresso(rec, data).feitas;
}

export function metaRecCompleta(rec: MetaRecorrente, data: Date = new Date()): boolean {
  return metaRecFeitas(rec, data) >= rec.vezes;
}

/** "Nunca falhar dois dias" (02/10/2026): meta diária positiva que ficou
 *  abaixo do alvo ontem (último período fechado) e ainda não fechou hoje. */
export function metaRecFalhouOntem(rec: MetaRecorrente, data: Date = new Date()): boolean {
  if (rec.tipo !== "diaria" || rec.negativa || metaRecCompleta(rec, data)) return false;
  const ultimo = rec.historico?.[rec.historico.length - 1];
  const ontem = localKey(new Date(data.getFullYear(), data.getMonth(), data.getDate() - 1));
  return !!ultimo && ultimo.periodo === "dia:" + ontem && ultimo.feitas < (ultimo.vezes ?? rec.vezes);
}

/**
 * Meta negativa (ex: "delivery no máx 2x/semana"): vezes vira limite. Excedeu quando feitas > vezes.
 */
export function metaRecExcesso(rec: MetaRecorrente, data: Date = new Date()): number {
  return Math.max(0, metaRecFeitas(rec, data) - rec.vezes);
}

export function metaRecExcedida(rec: MetaRecorrente, data: Date = new Date()): boolean {
  return metaRecExcesso(rec, data) > 0;
}

/** Porta de metaRecHorarios (index.html:8069-8080) — só metas diárias com
 * janela de notificação (`notif`) geram horários: `vezes` alarmes
 * igualmente espaçados entre `notif.inicio` e `notif.fim`. Sem janela válida
 * (fim <= início) ou `vezes < 1`, nada é agendado. */
export function metaRecHorarios(
  rec: Pick<MetaRecorrente, "tipo" | "notif" | "vezes">
): Array<{ hour: number; minute: number }> {
  if (!rec.notif || rec.tipo !== "diaria") return [];
  const [hi, mi] = rec.notif.inicio.split(":").map(Number);
  const [hf, mf] = rec.notif.fim.split(":").map(Number);
  const ini = hi * 60 + mi;
  const fim = hf * 60 + mf;
  if (fim <= ini || rec.vezes < 1) return [];
  const passo = (fim - ini) / rec.vezes;
  return Array.from({ length: rec.vezes }, (_, i) => {
    const m = Math.round(ini + passo * i);
    return { hour: Math.floor(m / 60), minute: m % 60 };
  });
}

export function duplicarMetaRec(
  doc: CountdownDoc,
  id: string,
  newId: () => string = () => Math.random().toString(36).slice(2, 9)
): CountdownDoc {
  const recorrentes = doc.recorrentes || [];
  const src = recorrentes.find((x) => x.id === id);
  if (!src) return doc;
  const copy: MetaRecorrente = {
    ...src,
    id: newId(),
    titulo: src.titulo + " (cópia)",
    progresso: null,
    progressoDias: {},
    criadoEm: Date.now(),
  };
  return {
    ...doc,
    recorrentes: [...recorrentes, copy],
    updatedAt: Date.now(),
  };
}

export function ajustarProgressoMetaRec(
  rec: MetaRecorrente,
  delta: number,
  data: Date = new Date()
): {
  rec: MetaRecorrente;
  excessoAntes: number;
  excessoDepois: number;
  feitasAntes: number;
  feitasDepois: number;
} {
  rec = virarPeriodoMetaRec(rec, data);
  const p = { ...rec.progresso! };
  const excessoAntes = metaRecExcesso(rec, data);
  const feitasAntes = !rec.negativa && rec.pontua ? p.feitas : 0;
  // positiva e negativa podem passar do limite (excesso positivo vale meio item;
  // negativo vira saldo abaixo de zero e desconta).
  const antes = p.feitas;
  p.feitas = Math.max(0, p.feitas + delta);
  const novo = { ...rec, progresso: p, progressoDias: registrarProgressoDia(rec, p.feitas - antes, localKey(data)) };
  const excessoDepois = metaRecExcesso(novo, data);
  const feitasDepois = !rec.negativa && rec.pontua ? p.feitas : 0;
  return {
    rec: novo,
    excessoAntes,
    excessoDepois,
    feitasAntes,
    feitasDepois,
  };
}

/* Áreas de meta (porta de metaAreaInfo/metaAreasPool, index.html:7937-8104) —
   texto livre: os eixos da roda entram como sugestão e emprestam a cor; um
   nome novo ganha cor estável derivada do próprio nome. Metas antigas guardam
   o *id* do eixo, então o resolvedor aceita id e rótulo. */
const META_AREA_CORES = [
  CORES_AREA_600.pink,
  CORES_AREA_600.blue,
  CORES_AREA_600.green,
  CORES_AREA_600.amber,
  CORES_AREA_600.red,
  CORES_AREA_600.violet,
  CORES_AREA_600.teal,
];

export function metaAreaInfo(
  v: string,
  areasRoda: Array<{ id: string; label: string; color: string }> = []
): { label: string; color: string } {
  const s = String(v || "").trim();
  const e = areasRoda.find((x) => x.id === s) || areasRoda.find((x) => x.label.toLowerCase() === s.toLowerCase());
  if (e) return { label: e.label, color: e.color };
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return { label: s, color: META_AREA_CORES[h % META_AREA_CORES.length] };
}

export function metaAreasPool(
  doc: CountdownDoc,
  areasRoda: Array<{ id: string; label: string; color: string }> = []
): string[] {
  const set = new Set<string>();
  (doc.targets || []).forEach((t) =>
    (t.areas || []).forEach((a) => {
      const l = metaAreaInfo(a, areasRoda).label;
      if (l) set.add(l);
    })
  );
  areasRoda.forEach((a) => set.add(a.label));
  return [...set];
}

/* Dias para trabalhar a meta: vazio/ausente = todo dia, mesma convenção de
   diasDaRotina/rotinaOcorreHoje (index.html:7947-7955). */
export function metaDias(t: Pick<MetaTarget, "dias">): number[] {
  const d = t && t.dias;
  return d && d.length ? d : [0, 1, 2, 3, 4, 5, 6];
}

/* Rótulo curto dos dias — "" quando é todo dia (não vira chip). */
export function metaDiasLabel(t: Pick<MetaTarget, "dias">, abrev: string[]): string {
  const dias = metaDias(t);
  if (dias.length >= 7) return "";
  return dias
    .slice()
    .sort((a, b) => a - b)
    .map((d) => abrev[d])
    .join("/");
}

export type MetasSubview = "prazos" | "recorrentes";

export function loadMetasSubviewSel(loadFn: <T>(key: string, fallback: T) => T): MetasSubview[] {
  const v = loadFn<MetasSubview[] | null>(K_METASSUBVIEWSEL, null);
  if (Array.isArray(v) && v.length) return v;
  const leg = loadFn<string>(K_METASSUBVIEW, "recorrentes");
  return [leg === "prazos" ? "prazos" : "recorrentes"];
}

export function toggleMetasSubview(current: MetasSubview[], view: MetasSubview): MetasSubview[] {
  const pos = current.indexOf(view);
  if (pos >= 0) {
    if (current.length <= 1) return current; // não deixa ambos desmarcados
    return current.filter((v) => v !== view);
  }
  return [...current, view];
}

/** Guarda o saldo do dia em `progressoDias` (mantém só os últimos 60 dias). */
export function registrarProgressoDia(
  t: Pick<MetaTarget, "progressoDias">,
  delta: number,
  hojeISO: string = localKey()
): Record<string, number> {
  const corte = addDaysISO(hojeISO, -60);
  const out: Record<string, number> = {};
  Object.entries(t.progressoDias || {}).forEach(([k, v]) => {
    if (k >= corte) out[k] = v;
  });
  if (delta) out[hojeISO] = (out[hojeISO] || 0) + delta;
  if (out[hojeISO] === 0) delete out[hojeISO];
  return out;
}

export interface ProjecaoMeta {
  /** data prevista de conclusão no ritmo atual (null = parada) */
  dataISO: string | null;
  /** termina depois do prazo (ou está parada) */
  atrasa: boolean;
  /** itens por dia usados na conta */
  ritmo: number;
}

/** Projeção "no ritmo atual" (recomendação 2 de 30/09/2026): ritmo dos
 *  últimos 14 dias pelo registro diário; sem registro ainda (meta antiga),
 *  a média desde a criação. Null quando não há quantidade ou já acabou. */
export function projecaoMeta(
  t: Pick<MetaTarget, "date" | "topics" | "done" | "createdAt" | "progressoDias">,
  hojeISO: string = localKey()
): ProjecaoMeta | null {
  if (t.topics == null) return null;
  const restante = Math.max(0, t.topics - (t.done || 0));
  if (restante === 0) return null;
  const criada = localKey(new Date(t.createdAt || Date.now()));
  const diasDeVida = Math.max(
    1,
    Math.round((isoToDate(hojeISO).getTime() - isoToDate(criada).getTime()) / 86400000) + 1
  );
  let ritmo: number;
  const log = t.progressoDias || {};
  if (Object.keys(log).length) {
    const janela = Math.min(14, diasDeVida);
    const ini = addDaysISO(hojeISO, -(janela - 1));
    const feito = Object.entries(log).reduce((s, [k, v]) => (k >= ini && k <= hojeISO ? s + v : s), 0);
    ritmo = Math.max(0, feito) / janela;
  } else ritmo = (t.done || 0) / diasDeVida;
  if (ritmo <= 0) return { dataISO: null, atrasa: true, ritmo: 0 };
  const dataISO = addDaysISO(hojeISO, Math.ceil(restante / ritmo));
  return { dataISO, atrasa: dataISO > t.date, ritmo };
}

export interface MarcoStatus {
  marco: MetaMarco;
  /** já alcançado (feitos >= alvo) */
  batido: boolean;
  /** prazo do marco já passou sem alcançar */
  perdido: boolean;
  /** itens previstos na data do marco no ritmo atual */
  previsto: number;
  /** chega no alvo no ritmo atual */
  noRitmo: boolean;
}

/** Próximo marco ainda em aberto (01/10/2026): o primeiro, por data, que não
 *  foi batido. Projeção = feitos + ritmo dos últimos 14 dias × dias até a
 *  data do marco (mesmo ritmo de projecaoMeta). Null sem marco pendente. */
export function proximoMarco(
  t: Pick<MetaTarget, "date" | "topics" | "done" | "createdAt" | "progressoDias" | "marcos">,
  hojeISO: string = localKey()
): MarcoStatus | null {
  if (t.topics == null) return null;
  const feitos = t.done || 0;
  const ordem = (t.marcos || []).slice().sort((a, b) => a.data.localeCompare(b.data) || a.alvo - b.alvo);
  const marco = ordem.find((m) => feitos < m.alvo);
  if (!marco) return null;
  const perdido = marco.data < hojeISO;
  const ritmo = projecaoMeta(t, hojeISO)?.ritmo ?? 0;
  const dias = Math.max(0, Math.round((isoToDate(marco.data).getTime() - isoToDate(hojeISO).getTime()) / 86400000));
  const previsto = Math.floor(feitos + ritmo * dias);
  return { marco, batido: false, perdido, previsto, noRitmo: !perdido && previsto >= marco.alvo };
}

/* Semana no cartão de meta (mockup de 02/10/2026): sete bolinhas na ordem do
   início da semana dos Ajustes. previsto = dia de trabalhar a meta; feito =
   houve registro no dia; perdido = dia previsto que já passou sem registro. */
export type EstadoDiaMeta = "feitoPrevisto" | "feito" | "perdido" | "previsto" | "livre";
export interface DiaSemanaMeta {
  iso: string;
  dow: number;
  estado: EstadoDiaMeta;
}

export function semanaDaMeta(
  diasPrevistos: number[],
  qtdNoDia: (iso: string) => number,
  hoje: Date = new Date()
): DiaSemanaMeta[] {
  const hojeISO = localKey(hoje);
  const ini = inicioSemanaISO(hoje);
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(ini, i);
    const dow = isoToDate(iso).getDay();
    const previsto = diasPrevistos.includes(dow);
    const feito = qtdNoDia(iso) > 0;
    const estado: EstadoDiaMeta = feito
      ? previsto
        ? "feitoPrevisto"
        : "feito"
      : previsto
        ? iso < hojeISO
          ? "perdido"
          : "previsto"
        : "livre";
    return { iso, dow, estado };
  });
}

/** Quantidade feita num dia da meta recorrente: o registro diário; sem ele
 *  (feito antes de existir), a meta diária ainda tem o período do dia. */
export function metaRecQtdNoDia(rec: MetaRecorrente, iso: string): number {
  const dia = rec.progressoDias?.[iso];
  if (dia != null) return dia;
  if (rec.tipo !== "diaria") return 0;
  const per = "dia:" + iso;
  if (rec.progresso?.periodo === per) return rec.progresso.feitas;
  return (rec.historico || []).find((h) => h.periodo === per)?.feitas || 0;
}

/** Sequência "N – Mx" (mesmo formato do selo das rotinas). Meta com prazo:
 *  N = dias corridos desde o primeiro registro da sequência, M = dias com
 *  registro nela; só quebra num dia previsto que passou em branco (hoje
 *  nunca quebra). */
export function sequenciaMetaPrazo(
  t: Pick<MetaTarget, "dias" | "progressoDias">,
  hojeISO: string = localKey()
): { dias: number; execucoes: number } {
  const prog = t.progressoDias || {};
  const previstos = metaDias(t);
  let inicio: string | null = (prog[hojeISO] || 0) > 0 ? hojeISO : null;
  let execucoes = inicio ? 1 : 0;
  for (let k = 1; k <= 60; k++) {
    const d = addDaysISO(hojeISO, -k);
    if ((prog[d] || 0) > 0) {
      execucoes++;
      inicio = d;
    } else if (previstos.includes(isoToDate(d).getDay())) break;
  }
  if (!inicio) return { dias: 0, execucoes: 0 };
  const dias = Math.round((isoToDate(hojeISO).getTime() - isoToDate(inicio).getTime()) / 86400000) + 1;
  return { dias, execucoes };
}

/** Meta recorrente: N = períodos seguidos (metaRecSequencia), M = feitas
 *  nesses períodos fechados mais as do período atual. */
export function sequenciaMetaRec(rec: MetaRecorrente, data: Date = new Date()): { n: number; execucoes: number } {
  const v = virarPeriodoMetaRec(rec, data);
  const base = v.sequencia || 0;
  const fechados = base > 0 ? (v.historico || []).slice(-base) : [];
  const execucoes = fechados.reduce((t, p) => t + p.feitas, 0) + (v.progresso?.feitas || 0);
  return { n: metaRecSequencia(rec, data), execucoes };
}
