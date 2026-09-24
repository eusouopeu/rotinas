// Gráficos dos gastos: total por período (barras) e por categoria (rosca).
import { useState } from "react";
import { Cartao } from "../../ui/Cartao";
import { EstadoVazio } from "../../ui/EstadoVazio";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";
import { brl, chartsPeriodUnit, computeDonutArcs, resumoPorPeriodo, type ChartsPeriod } from "../../lib/expense";
import type { ExpenseDoc } from "../../lib/types";

const PERIODOS: ChartsPeriod[] = ["semana", "mes", "trimestre", "ano"];

function Rosca({ segs, total }: { segs: Array<{ label: string; valor: number; color: string }>; total: number }) {
  const arcs = computeDonutArcs(
    segs.map((s) => ({ value: s.valor, color: s.color })),
    total
  );
  return (
    <svg viewBox="0 0 128 128" width={118} height={118} className="flex-none">
      {arcs.map((a, i) => (
        <circle
          key={i}
          cx={64}
          cy={64}
          r={52}
          fill="none"
          stroke={a.color}
          strokeWidth={22}
          strokeDasharray={a.dashArray}
          strokeDashoffset={a.dashOffset}
          transform="rotate(-90 64 64)"
        />
      ))}
      <circle cx={64} cy={64} r={52 - 11 - 1} className="fill-card" />
    </svg>
  );
}

/** Cartão de número: rótulo pequeno em cima, valor em negrito embaixo. */
function Numero({ rotulo, tamanho, children }: { rotulo: string; tamanho: string; children: React.ReactNode }) {
  return (
    <Cartao className="mb-1.5 text-center">
      <Legenda>{rotulo}</Legenda>
      <b className={tamanho}>{children}</b>
    </Cartao>
  );
}

export function GraficosGastos({ docs }: { docs: ExpenseDoc[] }) {
  const [period, setPeriod] = useState<ChartsPeriod>("mes");
  if (docs.length === 0) return <EstadoVazio className="min-h-[25vh]" texto="Sem dados para visualizar ainda." />;
  const r = resumoPorPeriodo(docs, period);
  const maxB = Math.max(...r.buckets.map((b) => b.valor), 1);
  const unidade = chartsPeriodUnit(period);
  const periodLabel = unidade + " atual";
  return (
    <>
      <Toggle
        className="mb-3"
        options={PERIODOS.map((p) => ({ key: p, label: chartsPeriodUnit(p) }))}
        active={period}
        onSelect={setPeriod}
      />
      <div className="mb-3.5 grid grid-cols-[1fr_1fr] gap-2.5">
        <Numero rotulo={`média por ${unidade}`} tamanho="text-[17px]">
          {brl(r.mediaPorBucket)}
        </Numero>
        <Numero rotulo={`total ${periodLabel}`} tamanho="text-[17px]">
          {brl(r.totalPeriodoAtual)}
        </Numero>
        <Numero rotulo={`maior categoria (${periodLabel})`} tamanho="text-base">
          {r.categoriaTopoPeriodoAtual
            ? `${r.categoriaTopoPeriodoAtual.cat} · ${brl(r.categoriaTopoPeriodoAtual.valor)}`
            : "—"}
        </Numero>
        <Numero rotulo={`lançamentos (${periodLabel})`} tamanho="text-[17px]">
          {r.lancamentosPeriodoAtual}
        </Numero>
      </div>
      <RotuloSecao>Total por {unidade}</RotuloSecao>
      <Cartao className="mb-1.5">
        <div className="flex min-h-[90px] items-end gap-1.5">
          {r.buckets.length === 0 ? (
            <Legenda>sem dados</Legenda>
          ) : (
            r.buckets.map((b) => (
              <div key={b.chave} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="text-right font-sans text-2xs text-sub tabular-nums">
                  {brl(b.valor).replace("R$ ", "")}
                </div>
                <div
                  className="w-[60%] max-w-[26px] rounded-[4px_4px_0_0] bg-caneta"
                  style={{ height: Math.max(4, Math.round((b.valor / maxB) * 60)) }}
                />
                <Legenda className="text-2xs">{b.label}</Legenda>
              </div>
            ))
          )}
        </div>
      </Cartao>
      <RotuloSecao>Por categoria</RotuloSecao>
      <Cartao className="mb-1.5 flex flex-wrap items-center gap-3.5">
        <div className="relative flex-none">
          <Rosca segs={r.segmentos} total={r.total} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-xs text-sub">total</div>
            <div className="font-sans text-md">{brl(r.total)}</div>
          </div>
        </div>
        <div className="min-w-[140px] flex-1">
          {r.segmentos.length === 0 ? (
            <Legenda>sem dados</Legenda>
          ) : (
            r.segmentos.map((s) => (
              <div className="my-[5px] flex items-center gap-2.5" key={s.label}>
                <span className="size-2.5 flex-none rounded-[3px]" style={{ background: s.color }} />
                <div className="flex-1 overflow-hidden text-base text-ellipsis whitespace-nowrap">{s.label}</div>
                <div className="w-[52px] text-right font-sans text-sm text-sub tabular-nums">{brl(s.valor)}</div>
              </div>
            ))
          )}
        </div>
      </Cartao>
    </>
  );
}
