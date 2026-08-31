import type { StepActual } from "./player";

// Porta do formato de entry de finishRoutine (index.html:11840-11858), sem
// schedDelayMin (depende de rotinaAgendadaEm+computeSchedule já cruzados na
// hora de iniciar — fica pra quando o card da Home mostrar isso de novo).
export interface HistoryEntry {
  date: string;
  ts: number;
  startedTs: number;
  routineId: string;
  routineName: string;
  plannedSec: number;
  actualSec: number;
  pauses: number;
  pausedSec: number;
  skippedCount: number;
  steps: StepActual[];
}

/** Execução de uma rotina num dia (a mais recente, se houver mais de uma) —
 * porta de execucaoDoDia (index.html:3228-3234). Alimenta a agenda: card já
 * feito vai pro fim da lista e troca o horário planejado pelo real. */
export function execucaoDoDia(history: HistoryEntry[], routineId: string, iso: string): HistoryEntry | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.routineId === routineId && h.date === iso) return h;
  }
  return null;
}

/** Porta de execucaoMinutos (index.html:3238-3242) — `startedTs` só existe em
 * execuções gravadas a partir desta versão; sem ele, reconstrói o início a
 * partir do fim menos o tempo real gasto (execução + pausas). */
export function execucaoMinutos(h: HistoryEntry): { ini: number; fim: number } {
  const fimD = new Date(h.ts);
  const iniD = new Date(h.startedTs != null ? h.startedTs : h.ts - ((h.actualSec || 0) + (h.pausedSec || 0)) * 1000);
  return { ini: iniD.getHours() * 60 + iniD.getMinutes(), fim: fimD.getHours() * 60 + fimD.getMinutes() };
}
