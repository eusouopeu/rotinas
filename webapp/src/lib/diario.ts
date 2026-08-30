// Porta de index.html:12597-12636 — só a chave/rótulo de período. Agenda
// (time-blocking), kanban por período e o toggle "agenda" ficam para depois
// (dependem do parser RE_TIMEBLOCK e do grid, nenhum dos dois portado ainda).
import { addDaysISO, inicioSemanaISO, isoToDate, localKey } from "./gamificacao";
import type { DiarioScope } from "./types";

export const DIARIO_ESCOPOS: Array<[DiarioScope, string]> = [
  ["dia", "Dia"],
  ["semana", "Semana"],
  ["mes", "Mês"],
  ["ano", "Ano"],
];

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const DIAS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Chave de storage do período: "dia:<ISO>" | "semana:<início ISO>" | "mes:AAAA-MM" | "ano:AAAA". */
export function diarioChave(escopo: DiarioScope, iso: string): string {
  if (escopo === "semana") return "semana:" + inicioSemanaISO(isoToDate(iso));
  if (escopo === "mes") return "mes:" + iso.slice(0, 7);
  if (escopo === "ano") return "ano:" + iso.slice(0, 4);
  return "dia:" + iso;
}

export function diarioRotulo(escopo: DiarioScope, iso: string): string {
  const d = isoToDate(iso);
  const dm = (x: Date) => String(x.getDate()).padStart(2, "0") + "/" + String(x.getMonth() + 1).padStart(2, "0");
  if (escopo === "semana") {
    const dom = isoToDate(inicioSemanaISO(d));
    const sab = isoToDate(addDaysISO(localKey(dom), 6));
    return "semana de " + dm(dom) + " a " + dm(sab);
  }
  if (escopo === "mes") return MESES_PT[d.getMonth()] + " de " + d.getFullYear();
  if (escopo === "ano") return "ano de " + d.getFullYear();
  return DIAS_PT[d.getDay()];
}
