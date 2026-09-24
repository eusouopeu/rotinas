// Porta de renderRoutineStats (index.html:6031-6201) — detalhe de
// estatísticas por rotina acessível a partir da tela de Estatísticas
// (view.screen === "routineStats").
import { useAppStore } from "../store/useAppStore";
import { BotaoLink } from "../ui/BotaoLink";
import { EstadoVazio } from "../ui/EstadoVazio";
import { RotuloSecao } from "../ui/RotuloSecao";
import {
  CargaExercicios,
  EtapasRotina,
  HorariosRotina,
  ResumoRotina,
  UltimasExecucoes,
} from "../features/dados/RotinaSecoes";
import { getRoutineDetailStats } from "../lib/stats";
import { fmtTime } from "../lib/format";

export function RoutineStats() {
  const goTo = useAppStore((s) => s.goTo);
  const view = useAppStore((s) => s.view);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const adjustRoutineStep = useAppStore((s) => s.adjustRoutineStep);
  const deleteHistoryEntry = useAppStore((s) => s.deleteHistoryEntry);

  const routine = routines.find((x) => x.id === view.id);
  const voltar = () => goTo({ tab: "dados", screen: "stats" });

  const barra = (titulo?: string) => (
    <div className="mb-5 flex items-center justify-between gap-3">
      <BotaoLink tom="suave" onClick={voltar}>
        &larr; Dados
      </BotaoLink>
      {titulo !== undefined && <RotuloSecao className="m-0">{titulo}</RotuloSecao>}
    </div>
  );

  if (!routine) {
    return (
      <div className="screen">
        {barra()}
        <EstadoVazio titulo="Rotina não encontrada" />
      </div>
    );
  }

  const stats = getRoutineDetailStats(routine, history, gam);

  function ajustar(s: { name: string; plan: number; newSec: number; newSecLabel: string }) {
    if (window.confirm(`Ajustar a etapa "${s.name}" de ${fmtTime(s.plan).replace("+", "")} para ${s.newSecLabel}?`)) {
      adjustRoutineStep(routine!.id, s.name, s.newSec);
    }
  }

  function apagar(ts: number) {
    if (window.confirm("Apagar este registro de execução?\nEle sai de todas as estatísticas.")) deleteHistoryEntry(ts);
  }

  return (
    <div className="screen">
      {barra((routine.icon ? routine.icon + " " : "") + routine.name)}

      <div className="flex-1 overflow-y-auto pb-5">
        {stats.allCount === 0 ? (
          <EstadoVazio className="min-h-[40vh]" titulo="Sem execuções" texto="Conclua esta rotina para gerar dados." />
        ) : (
          <>
            <ResumoRotina stats={stats} />
            {stats.stepRows.length > 0 && <EtapasRotina stats={stats} onAjustar={ajustar} />}
            {stats.exerciseRows.length > 0 && <CargaExercicios stats={stats} />}
            {stats.hasHourCounts && <HorariosRotina stats={stats} />}
            {stats.recent.length > 0 && <UltimasExecucoes stats={stats} onApagar={apagar} />}
          </>
        )}
      </div>
    </div>
  );
}
