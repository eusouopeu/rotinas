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
