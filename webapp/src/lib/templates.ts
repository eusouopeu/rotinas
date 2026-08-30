// Porta parcial de TMPL_TYPES/newTemplateDoc/tmplMeta (index.html:6286-6413,
// 6408-6431) — só os tipos com editor no React (scoreboard, thoughtrecord,
// proscons) ganham fábrica de verdade; os outros (market/matrix/kanban/
// expense/travel) aparecem como pasta (podem ser listados/importados de
// volta do app antigo) mas ainda não têm editor aqui — ver TemplateDoc.tsx.
import type { IconName } from "./icons";
import { nomeAutoDoc } from "./notes";
import { sbTotais } from "./scoreboard";
import type { AnyTemplateDoc, ProsConsDoc, ScoreboardDoc, ThoughtRecordDoc } from "./types";

export interface TmplTypeInfo {
  type: string;
  icon: IconName;
  label: string;
}

export const TMPL_TYPES: TmplTypeInfo[] = [
  { type: "market", icon: "market", label: "Listas de mercado" },
  { type: "matrix", icon: "matrix", label: "Matrizes" },
  { type: "kanban", icon: "kanban", label: "Kanbans" },
  { type: "expense", icon: "expense", label: "Registros de gastos" },
  { type: "travel", icon: "photo", label: "Listas de viagem" },
  { type: "thoughtrecord", icon: "diamond", label: "RPD" },
  { type: "scoreboard", icon: "stats", label: "Registros de pontos" },
];

export const COGNITIVE_DISTORTIONS = [
  "Pensamento tudo ou nada",
  "Catastrofização",
  "Desqualificação do positivo",
  "Raciocínio emocional",
  "Rotulação",
  "Leitura mental",
  "Adivinhação do futuro",
  "Supergeneralização",
  "Filtro mental",
  "Personalização",
  'Afirmações com "deveria"',
  "Culpar-se ou culpar os outros",
];

function base(type: string) {
  return { id: uid(), type, title: nomeAutoDoc(), createdAt: Date.now(), updatedAt: Date.now() };
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newScoreboardDoc(): ScoreboardDoc {
  return {
    ...base("scoreboard"),
    type: "scoreboard",
    players: [
      { id: uid(), name: "" },
      { id: uid(), name: "" },
    ],
    rounds: [],
    higherWins: true,
  };
}

export function newThoughtRecordDoc(): ThoughtRecordDoc {
  return {
    ...base("thoughtrecord"),
    type: "thoughtrecord",
    trigger: "",
    emotions: "",
    distortion: "",
    altThoughts: "",
    results: "",
  };
}

export function newProsConsDoc(): ProsConsDoc {
  return { ...base("proscons"), type: "proscons", pros: [], cons: [] };
}

/** Cria um doc pra `type`; tipos sem editor no React ainda viram um doc
 * genérico (fica listado na pasta, mas TemplateDoc mostra "não portado"). */
export function newTemplateDoc(type: string): AnyTemplateDoc {
  if (type === "scoreboard") return newScoreboardDoc();
  if (type === "thoughtrecord") return newThoughtRecordDoc();
  if (type === "proscons") return newProsConsDoc();
  return base(type) as AnyTemplateDoc;
}

/** Porta de tmplMeta (index.html:6408-6431) — só os ramos dos tipos com
 * editor no React; os demais caem no fallback genérico. */
export function tmplMeta(doc: AnyTemplateDoc): string {
  if (doc.type === "scoreboard") {
    const sb = doc as ScoreboardDoc;
    const tot = sbTotais(sb);
    const max = Math.max(0, ...Object.values(tot));
    return `${sb.rounds.length} turno(s) · ${sb.players.length} jogador(es)${sb.rounds.length ? " · líder " + max : ""}`;
  }
  if (doc.type === "proscons") {
    const pc = doc as ProsConsDoc;
    const ps = pc.pros.reduce((a, i) => a + i.w, 0);
    const cs = pc.cons.reduce((a, i) => a + i.w, 0);
    return `${ps} × ${cs}`;
  }
  if (doc.type === "thoughtrecord") {
    const tr = doc as ThoughtRecordDoc;
    return tr.distortion || "sem distorção marcada";
  }
  return "";
}
