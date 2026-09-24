// Gráficos de colunas de Dados: tempo por dia da semana (empilhado por rotina),
// horário de início, tendência da pontualidade e tempo por mês do ano.
import { cn } from "../../lib/cn";

const ROTULO = "font-sans text-[9.5px] text-sub";
const COR_STATUS: Record<string, string> = { late: "bg-erro", early: "bg-ok", ontime: "bg-caneta" };

export function BarrasDiaSemana({
  colunas,
}: {
  colunas: Array<{
    dow: number;
    dowLabel: string;
    totalSec: number;
    totalMin: number;
    segs: Array<{ height: number; color: string; routineName: string; sec: number }>;
  }>;
}) {
  return (
    <div className="flex items-end gap-2">
      {colunas.map((col) => (
        <div className="flex flex-1 flex-col items-center gap-[3px]" key={col.dow}>
          <span className={ROTULO}>{col.totalSec ? `${col.totalMin}m` : ""}</span>
          <div className="flex min-h-0.5 w-[70%] max-w-[30px] flex-col-reverse">
            {col.segs.map((seg, si) => (
              <div
                key={si}
                className="w-full first:rounded-[0_0_3px_3px] last:rounded-[3px_3px_0_0]"
                style={{ height: `${seg.height}px`, background: seg.color }}
                title={`${seg.routineName}: ${Math.round(seg.sec / 60)}min`}
              />
            ))}
          </div>
          <span className={ROTULO}>{col.dowLabel}</span>
        </div>
      ))}
    </div>
  );
}

export function BarrasHora({ colunas }: { colunas: Array<{ hour: number; showLabel: boolean; height: number }> }) {
  return (
    <div className="flex h-[84px] items-end gap-0.5">
      {colunas.map((c) => (
        <div className="flex h-full flex-1 flex-col items-center" key={c.hour}>
          <span className={cn(ROTULO, "h-3 leading-3")}>{c.showLabel ? `${c.hour}h` : ""}</span>
          <div className="flex w-full flex-1 items-end justify-center">
            <div className="w-full max-w-[12px] rounded-[2px_2px_0_0] bg-caneta" style={{ height: `${c.height}px` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarrasTendencia({
  pontos,
}: {
  pontos: Array<{ val: number | null; valLabel: string; height: number; statusClass: string; dateLabel: string }>;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {pontos.map((t, i) => (
        <div className="flex flex-1 flex-col items-center gap-1" key={i}>
          <div className="flex h-16 flex-col items-center justify-end gap-[3px]">
            {t.val !== null && (
              <>
                <span className={ROTULO}>{t.valLabel}</span>
                <div
                  className={cn("w-[70%] max-w-[26px] rounded-[4px_4px_0_0]", COR_STATUS[t.statusClass])}
                  style={{ height: `${t.height}px` }}
                />
              </>
            )}
          </div>
          <span className={ROTULO}>{t.dateLabel}</span>
        </div>
      ))}
    </div>
  );
}

export function BarrasMes({
  barras,
  maxMin,
  mediaMin,
  mesAtual,
}: {
  barras: Array<{ monthIdx: number; monthName: string; valStr: string; minutes: number }>;
  maxMin: number;
  mediaMin: number;
  /** índice do mês destacado (ano corrente) ou null */
  mesAtual: number | null;
}) {
  return (
    <>
      <div className="relative flex h-[72px] items-end gap-1">
        {barras.map((bar) => (
          <div className="flex h-full flex-1 items-end" key={bar.monthIdx} title={`${bar.monthName}: ${bar.valStr}`}>
            <div
              className={cn("w-full rounded-[3px_3px_0_0]", bar.monthIdx === mesAtual ? "bg-caneta" : "bg-heat-2")}
              style={{ height: `${bar.minutes ? Math.max(3, (bar.minutes / maxMin) * 100) : 0}%` }}
            />
          </div>
        ))}
        <div
          className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed border-sub"
          style={{ bottom: `${(mediaMin / maxMin) * 100}%` }}
        />
      </div>
      <div className="mt-1 flex gap-1">
        {barras.map((bar) => (
          <span key={bar.monthIdx} className={cn(ROTULO, "flex-1 text-center")}>
            {bar.monthName}
          </span>
        ))}
      </div>
    </>
  );
}
