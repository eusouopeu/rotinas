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

export type ScreenName = "home" | "settings" | "editor";

export interface AppView {
  tab: string;
  screen: ScreenName;
  id?: string;
}
