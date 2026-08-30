// Tipos portados do estado do app antigo (index.html). Cobre só o que já foi
// migrado para o React (ver CLAUDE.md > "webapp/") — os tipos crescem tela a
// tela, não de uma vez, para não inventar forma antes de precisar dela de
// verdade.

export type Tag = "nenhum" | "baixo" | "medio" | "alto";

export interface RoutineStep {
  id: string;
  name: string;
  type: "timer" | "exercicio" | "checklist" | string;
  seconds?: number;
  sets?: number;
  isRest?: boolean;
  tagValor?: Tag;
  noteId?: string | null;
  journaling?: boolean;
}

export interface RoutineSchedule {
  enabled: boolean;
  anchor: "start" | "end";
  time: string; // "HH:MM"
  mode?: "dias" | "intervalo";
  days: number[]; // 0=domingo..6=sábado (literal, casa com Date.getDay())
  intervaloDias?: number;
  intervaloInicio?: string; // ISO
}

export interface Routine {
  id: string;
  name: string;
  icon?: string;
  steps: RoutineStep[];
  schedule?: RoutineSchedule | null;
  restSeconds?: number;
  eixo?: string; // área da roda da vida
  tagValor?: Tag;
  semHabito?: boolean;
  sound?: "normal" | "suave" | "mudo";
  notaId?: string | null;
}

export interface GamificacaoConfig {
  multiplicadores: Record<Tag, number>;
  divisorDuracao: number;
  notaMinima: number;
  faixas: { bronze: number; prata: number; ouro: number; diamante: number };
  pontosMeta: { mensal: number; trimestral: number; anual: number };
  roda: { ativa: boolean; areas: RodaArea[]; pesoSemArea: number };
  habito: { ativo: boolean; streakMin: number; fator: number };
  vagas: { alto: number; medio: number; baixo: number };
}

export interface RodaArea {
  id: string;
  label: string;
  color: string;
  peso: number;
}

export interface SemanaAtual {
  inicioISO: string;
  fatorNormalizacao: number;
  totalBrutoAgendado: number;
  fatoresArea: Record<string, number>;
  habitos: Record<string, boolean>;
  agendaCongelada: Array<{ itemId: string; dia: number; area: string; pontos: number }>;
  concluidos: Array<{
    itemId?: string;
    pontos: number;
    pb?: number;
    area?: string;
    dataISO?: string;
    rotulo?: string;
  }>;
  dispensada?: boolean;
}

export interface GamificacaoState {
  config: GamificacaoConfig;
  semanaAtual: SemanaAtual | null;
  historico: {
    semanas: Array<{ inicioISO: string; nota: number; badge: string | null; dispensada?: boolean }>;
    meses: Array<{ anoMes: string; nota: number; badge: string | null; bonusMetas: number }>;
    trimestres: Array<{ anoTri: string; nota: number; badge: string | null; bonusMetas: number }>;
    anos: Array<{ ano: number; nota: number; badge: string | null; bonusMetas: number }>;
  };
  metasPontos: Record<string, number>;
  badges: Array<{ escopo: string; tipo: string; periodo: string; nota: number; emitidaEm: number }>;
}

export type MetaEscopo = "mensal" | "trimestral" | "anual";

export interface MetaTarget {
  id: string;
  title: string;
  date: string; // ISO, prazo
  createdAt: number;
  topics?: number | null;
  done?: number;
  tagValor?: Tag;
  nota?: string;
  creditos?: Record<string, number>; // período (ver periodoDeEscopo) -> pontos já creditados
}

export interface CountdownDoc {
  id: string;
  type: "countdown";
  title: string;
  targets: MetaTarget[];
  updatedAt: number;
  createdAt: number;
}

// Porta de renderScoreboardDoc (index.html:6856-6985) — placar por turno,
// colunas = jogadores. `scores` só tem entrada para quem já jogou naquele
// turno (célula vazia = "ainda não jogou", diferente de zero).
export interface ScoreboardDoc {
  id: string;
  type: "scoreboard";
  title: string;
  players: Array<{ id: string; name: string }>;
  rounds: Array<{ id: string; scores: Record<string, number> }>;
  higherWins: boolean;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderThoughtRecordDoc (index.html:7002-7032) — RPD (registro de
// pensamentos disfuncionais), formulário fixo de 5 campos.
export interface ThoughtRecordDoc {
  id: string;
  type: "thoughtrecord";
  title: string;
  trigger: string;
  emotions: string;
  distortion: string;
  altThoughts: string;
  results: string;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderProsConsDoc (index.html:9460-9519) — prós/contras com peso
// 1-5 por item, placar é a soma dos pesos de cada lado.
export interface ProsConsDoc {
  id: string;
  type: "proscons";
  title: string;
  pros: Array<{ id: string; text: string; w: number }>;
  cons: Array<{ id: string; text: string; w: number }>;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderMarketDoc (index.html:7148-7390), sem chips de frequência
// (K_MKFREQ) nem reordenar gôndola/compartilhar — ver templates.ts.
export interface MarketDoc {
  id: string;
  type: "market";
  title: string;
  items: Array<{ id: string; name: string; qty: number; unit: string; price: number; aisle: string; checked: boolean }>;
  aisleOrder: string[];
  shopMode: boolean;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderMatrixDoc (index.html:7421-7420ss) — 4 quadrantes com cor,
// modo (check/ul/ol) e itens com indentação; sem exportar PDF.
export interface MatrixDoc {
  id: string;
  type: "matrix";
  title: string;
  axisX: string;
  axisY: string;
  quadrants: Array<{
    title: string;
    color: string;
    mode: "check" | "ul" | "ol";
    items: Array<{ text: string; checked?: boolean; indent?: number }>;
  }>;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderKanbanDoc (index.html:7877-7893), chamando pintarKanban sem
// opts — sem horário/peso/abas nem arrastar (só mover com botões).
export interface KanbanDoc {
  id: string;
  type: "kanban";
  title: string;
  cols: Array<{ title: string; items: Array<{ id: string; text: string }> }>;
  createdAt: number;
  updatedAt: number;
}

// Porta de renderTravelDoc (index.html:9564-9877) — itens de mala por
// categoria, sem exportar PDF nem "desmarcar tudo".
export interface TravelDoc {
  id: string;
  type: "travel";
  title: string;
  items: Array<{ id: string; name: string; cat: string; qty: number; checked: boolean }>;
  catOrder: string[];
  createdAt: number;
  updatedAt: number;
}

// Diário: um texto markdown por período, chaveado por "dia:<ISO>" |
// "semana:<início ISO>" | "mes:AAAA-MM" | "ano:AAAA" (index.html K_DIARIO).
export type DiarioScope = "dia" | "semana" | "mes" | "ano";
export type DiarioMap = Record<string, string>;

// Nota simples (K_NOTES, index.html:51). `subjects` (assuntos) fica como
// array de string livre, sem o mountTagInput de sugestões ainda.
export interface Note {
  id: string;
  title: string;
  content: string;
  subjects?: string[];
  pinned?: boolean;
  createdAt?: number;
  updatedAt: number;
}

export type ScreenName =
  | "home"
  | "settings"
  | "editor"
  | "routineDetail"
  | "player"
  | "done"
  | "metas"
  | "diario"
  | "notes"
  | "noteEditor"
  | "templateFolders"
  | "tmplFolder"
  | "templateDoc";

// Templates é um array de docs de vários tipos (mercado, kanban, matriz...)
// no app antigo — o React só edita de verdade countdown/scoreboard/
// thoughtrecord/proscons; o resto passa por como está (unknown), pra nunca
// perder o que o app antigo já tiver salvo em K_TEMPLATES.
export type AnyTemplateDoc =
  | CountdownDoc
  | ScoreboardDoc
  | ThoughtRecordDoc
  | ProsConsDoc
  | MarketDoc
  | MatrixDoc
  | KanbanDoc
  | TravelDoc
  | (Record<string, unknown> & { id: string; type: string });

export interface AppView {
  tab: string;
  screen: ScreenName;
  id?: string;
  folderKind?: "type" | "routine";
  folderKey?: string;
}
