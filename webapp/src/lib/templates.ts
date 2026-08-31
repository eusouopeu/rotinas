// Porta parcial de TMPL_TYPES/newTemplateDoc/tmplMeta (index.html:6286-6413,
// 6408-6431). Têm editor de verdade no React: scoreboard, thoughtrecord,
// proscons, market, matrix, kanban, travel. "expense" (registro de gastos,
// com import de CSV) segue como pasta genérica — ver TemplateDoc.tsx.
import type { IconName } from "./icons";
import { nomeAutoDoc } from "./notes";
import { sbTotais } from "./scoreboard";
import type { AnyTemplateDoc, KanbanDoc, MarketDoc, MatrixDoc, ProsConsDoc, ScoreboardDoc, ThoughtRecordDoc, TravelDoc } from "./types";

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

// Porta de GROCERY_DB/AISLES/guessAisle (index.html:6207-6227), sem o ajuste
// de gôndola aprendido por item (mkFreq/K_MKFREQ, ainda não portado).
export const GROCERY_DB: Record<string, string[]> = {
  "Hortifrúti": ["banana","maçã","laranja","limão","mamão","abacate","manga","uva","tomate","cebola","alho","batata","batata doce","cenoura","abobrinha","abóbora","chuchu","pimentão","alface","couve","brócolis","espinafre","coentro","cebolinha","salsinha","gengibre","aipim","macaxeira","inhame","pepino","beterraba","repolho","quiabo","maracujá","melancia","abacaxi"],
  "Açougue e Peixaria": ["frango","peito de frango","coxa de frango","carne moída","patinho","alcatra","picanha","costela","linguiça","peixe","tilápia","salmão","camarão","carne de sol","fígado"],
  "Frios e Laticínios": ["leite","queijo","queijo mussarela","queijo coalho","requeijão","manteiga","margarina","iogurte","creme de leite","leite condensado","presunto","peito de peru","ovos","ricota","nata"],
  "Padaria": ["pão","pão francês","pão de forma","pão integral","bolo","biscoito","torrada","tapioca"],
  "Mercearia": ["arroz","feijão","macarrão","farinha","farinha de trigo","farinha de mandioca","açúcar","sal","café","óleo","azeite","vinagre","molho de tomate","extrato de tomate","milho","ervilha","atum","sardinha","aveia","granola","mel","amendoim","castanha","cuscuz","flocão","rapadura","tempero","pimenta","canela","achocolatado","gelatina"],
  "Bebidas": ["água","água mineral","suco","refrigerante","cerveja","vinho","água de coco","energético","chá"],
  "Congelados": ["pizza congelada","lasanha congelada","açaí","sorvete","polpa de fruta","pão de queijo congelado","hambúrguer"],
  "Limpeza": ["detergente","sabão em pó","sabão em barra","amaciante","água sanitária","desinfetante","esponja","saco de lixo","papel toalha","álcool","limpa vidro","lustra móveis"],
  "Higiene": ["papel higiênico","sabonete","shampoo","condicionador","creme dental","pasta de dente","escova de dente","desodorante","absorvente","fio dental","cotonete","fralda"],
  "Pet": ["ração","areia de gato","petisco"],
};
export const AISLES = Object.keys(GROCERY_DB).concat(["Outros"]);
export function guessAisle(name: string): string {
  const n = name.trim().toLowerCase();
  for (const [aisle, items] of Object.entries(GROCERY_DB)) {
    if (items.some((it) => n === it || n.includes(it) || (it.includes(n) && n.length >= 4))) return aisle;
  }
  return "Outros";
}
export function brl(v: number): string {
  return "R$ " + (v || 0).toFixed(2).replace(".", ",");
}

/* Frequência de compra (K_MKFREQ, index.html:6204-6205 e 7212-7218) — itens
   mais adicionados viram chips de "frequentes" no formulário do mercado. */
export interface MkFreqEntry {
  name: string;
  count: number;
  unit?: string;
  qty?: number;
  price?: number;
  aisle?: string;
}
export type MkFreqMap = Record<string, MkFreqEntry>;

export function bumpMkFreq(mkFreq: MkFreqMap, item: { name: string; unit: string; qty: number; price: number; aisle: string }): MkFreqMap {
  const k = item.name.toLowerCase();
  const f = { ...(mkFreq[k] || { name: item.name, count: 0 }) };
  f.count++;
  f.unit = item.unit;
  f.qty = item.qty;
  f.aisle = item.aisle;
  if (item.price) f.price = item.price;
  return { ...mkFreq, [k]: f };
}

/** Top 8 por contagem, escondendo o que já está na lista (index.html:7170-7172). */
export function topMkFreq(mkFreq: MkFreqMap, items: Array<{ name: string }>): MkFreqEntry[] {
  return Object.values(mkFreq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .filter((f) => !items.some((i) => i.name.toLowerCase() === f.name.toLowerCase()));
}

/** Texto de compartilhamento da lista de mercado (index.html:7379-7386) —
 * só pendentes, agrupados por gôndola na ordem do doc. */
export function marketShareText(doc: { title: string; items: Array<{ name: string; qty: number; unit: string; price?: number; aisle?: string; checked?: boolean }>; aisleOrder: string[] }): string {
  const byAisle: Record<string, typeof doc.items> = {};
  doc.items.filter((i) => !i.checked).forEach((it) => {
    (byAisle[it.aisle || "Outros"] = byAisle[it.aisle || "Outros"] || []).push(it);
  });
  let txt = doc.title + "\n";
  doc.aisleOrder.concat(Object.keys(byAisle).filter((a) => !doc.aisleOrder.includes(a))).forEach((a) => {
    if (!byAisle[a] || !byAisle[a].length) return;
    txt += "\n" + a + "\n" + byAisle[a].map((it) => "• " + it.name + " — " + it.qty + (it.unit === "un" ? " un" : it.unit) + (it.price ? " — " + brl(it.price) : "")).join("\n") + "\n";
  });
  return txt;
}

export const MATRIX_COLORS = ["#EC6AA8", "#5B8DEF", "#6B8F71", "#C9B23E", "#B25B4C", "#9C7BB8"];

// Porta de TRAVEL_DB/TRAVEL_CATS/guessTravelCat (index.html:9524-9540).
export const TRAVEL_DB: Record<string, string[]> = {
  "Documentos": ["passaporte","rg","cnh","passagens","reserva do hotel","cartão de embarque","seguro viagem","dinheiro","cartão de crédito","vistos","comprovante de vacina"],
  "Roupas": ["camisas","camisetas","calças","shorts","roupa íntima","cuecas","calcinhas","meias","casaco","blusa de frio","pijama","roupa de banho","biquíni","sunga","vestido"],
  "Calçados": ["tênis","chinelo","sandália","sapato social","bota"],
  "Higiene": ["escova de dente","pasta de dente","shampoo","condicionador","sabonete","desodorante","protetor solar","escova de cabelo","aparelho de barbear","absorvente","fio dental","cotonete"],
  "Saúde": ["remédios","analgésico","band-aid","álcool gel","repelente","antialérgico","pomada"],
  "Eletrônicos": ["carregador","power bank","fones de ouvido","adaptador de tomada","câmera","cabo usb","notebook","kindle"],
  "Acessórios": ["óculos de sol","boné","chapéu","guarda-chuva","mochila","cadeado","garrafa de água","travesseiro de pescoço","necessaire"],
};
export const TRAVEL_CATS = Object.keys(TRAVEL_DB).concat(["Outros"]);
export function guessTravelCat(name: string): string {
  const n = (name || "").trim().toLowerCase();
  for (const [cat, items] of Object.entries(TRAVEL_DB)) {
    if (items.some((it) => n === it || n.includes(it) || (it.includes(n) && n.length >= 4))) return cat;
  }
  return "Outros";
}

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

export function newMarketDoc(): MarketDoc {
  return { ...base("market"), type: "market", items: [], aisleOrder: [...AISLES], shopMode: false };
}

export function newMatrixDoc(): MatrixDoc {
  return {
    ...base("matrix"),
    type: "matrix",
    axisX: "Urgência",
    axisY: "Importância",
    quadrants: [
      { title: "Urgente e importante", color: "#B25B4C", mode: "check", items: [] },
      { title: "Importante, não urgente", color: "#5B8DEF", mode: "check", items: [] },
      { title: "Urgente, não importante", color: "#C9B23E", mode: "check", items: [] },
      { title: "Nem urgente nem importante", color: "#6B8F71", mode: "check", items: [] },
    ],
  };
}

export function newKanbanDoc(): KanbanDoc {
  return {
    ...base("kanban"),
    type: "kanban",
    cols: [
      { title: "A fazer", items: [] },
      { title: "Fazendo", items: [] },
      { title: "Feito", items: [] },
    ],
  };
}

export function newTravelDoc(): TravelDoc {
  return { ...base("travel"), type: "travel", items: [], catOrder: [...TRAVEL_CATS] };
}

/** Cria um doc pra `type`; tipos sem editor no React ainda viram um doc
 * genérico (fica listado na pasta, mas TemplateDoc mostra "não portado"). */
export function newTemplateDoc(type: string): AnyTemplateDoc {
  if (type === "scoreboard") return newScoreboardDoc();
  if (type === "thoughtrecord") return newThoughtRecordDoc();
  if (type === "proscons") return newProsConsDoc();
  if (type === "market") return newMarketDoc();
  if (type === "matrix") return newMatrixDoc();
  if (type === "kanban") return newKanbanDoc();
  if (type === "travel") return newTravelDoc();
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
  if (doc.type === "market") {
    const mk = doc as MarketDoc;
    const p = mk.items.filter((i) => !i.checked).length;
    return `${p} pendente(s) de ${mk.items.length}`;
  }
  if (doc.type === "matrix") {
    const mx = doc as MatrixDoc;
    return mx.quadrants.reduce((a, q) => a + q.items.length, 0) + " item(ns)";
  }
  if (doc.type === "kanban") {
    const kb = doc as KanbanDoc;
    return kb.cols.map((c) => c.items.length).join(" / ");
  }
  if (doc.type === "travel") {
    const tv = doc as TravelDoc;
    const p = tv.items.filter((i) => !i.checked).length;
    return `${p} pendente(s) de ${tv.items.length}`;
  }
  return "";
}
