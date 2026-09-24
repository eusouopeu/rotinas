// Detalhe de um dia: o que foi executado (hora e duração) e, fora da visão
// semanal, o que estava agendado e não foi feito.
import { Icon } from "../../components/Icon";
import { fmtClock, fmtTime } from "../../lib/format";
import { getDayDetailData } from "../../lib/stats";
import type { HistoryEntry } from "../../lib/history";
import type { Routine, Snooze } from "../../lib/types";
import { Cartao } from "../../ui/Cartao";
import { CelNegrito, CelNota, CelRotulo, LinhaTabela } from "../../ui/LinhaTabela";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { cn } from "../../lib/cn";
import { NO_PAINEL } from "./colunas";

/* `soFeitos` (visão Semana, pedido do Pedro em 12/09/2026): o dia só lista o
   que foi executado — o que estava agendado e não foi feito já aparece no
   contador da grade acima, e repetir isso aqui virava lista de cobrança. */
export function DetalheDia({
  dia,
  history,
  routines,
  snoozes,
  soFeitos = false,
}: {
  dia: string;
  history: HistoryEntry[];
  routines: Routine[];
  snoozes: Snooze[];
  soFeitos?: boolean;
}) {
  const data = getDayDetailData(dia, history, routines, snoozes);
  if (soFeitos && data.executed.length === 0) return null;
  const d = data.dateObj;
  return (
    <>
      <RotuloSecao className={NO_PAINEL}>
        {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}/{d.getFullYear()}
      </RotuloSecao>
      <Cartao className={cn("mb-1.5", NO_PAINEL)}>
        {data.isEmpty && !soFeitos ? (
          <LinhaTabela>
            <CelNota className="break-words">Nada executado nem agendado.</CelNota>
          </LinhaTabela>
        ) : (
          <>
            {data.executed.map((h, i) => (
              <LinhaTabela key={`exec-${i}`}>
                <CelRotulo>
                  <Icon name="check" size={14} /> {h.routineName}
                </CelRotulo>
                <CelNota>{h.actualSec != null ? fmtTime(h.actualSec).replace("+", "") : ""}</CelNota>
                <CelNota>{h.ts ? fmtClock(new Date(h.ts)) : ""}</CelNota>
              </LinhaTabela>
            ))}
            {!soFeitos &&
              data.planned.map((r, i) => (
                <LinhaTabela key={`plan-${i}`}>
                  <CelRotulo>○ {r.routineName}</CelRotulo>
                  <CelNota>{r.startStr}</CelNota>
                  {r.status === "não feita" ? (
                    <CelNegrito status="atraso">não feita</CelNegrito>
                  ) : (
                    <CelNota>agendada</CelNota>
                  )}
                </LinhaTabela>
              ))}
          </>
        )}
      </Cartao>
    </>
  );
}
