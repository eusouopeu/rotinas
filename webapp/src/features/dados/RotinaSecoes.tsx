// Seções da tela de Estatísticas de uma rotina (resumo, por etapa, planejado ×
// real, carga por exercício, horário de início, últimas execuções). Cada uma é
// um cartão com rótulo; os números vêm prontos de getRoutineDetailStats.
import type { ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { Cartao } from "../../ui/Cartao";
import { CelNegrito, CelNota, CelRotulo, LinhaTabela, statusDaClasse } from "../../ui/LinhaTabela";
import { Legenda } from "../../ui/Legenda";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { fmtTime } from "../../lib/format";
import type { getRoutineDetailStats } from "../../lib/stats";
import { BarrasHora } from "./Graficos";

type Stats = ReturnType<typeof getRoutineDetailStats>;
const semSinal = (t: number) => fmtTime(t).replace("+", "");
const unidade = (s: Stats) => (s.streakUnidade === "semanas" ? "semana(s)" : "dia(s)");

/** Rótulo + cartão: o par que se repete em toda seção. */
function Secao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <>
      <RotuloSecao>{titulo}</RotuloSecao>
      <Cartao className="mb-1.5">{children}</Cartao>
    </>
  );
}

/** Contagem ("39x") ao lado de um valor médio. */
const Vezes = ({ n }: { n: number }) => <CelNota>{n}x</CelNota>;

export function ResumoRotina({ stats }: { stats: Stats }) {
  return (
    <Secao titulo="Resumo geral">
      <LinhaTabela>
        <CelRotulo>Execuções</CelRotulo>
        <CelNegrito status="pontual">{stats.allCount}</CelNegrito>
      </LinhaTabela>
      <LinhaTabela>
        <CelRotulo>Tempo total registrado</CelRotulo>
        <CelNegrito status="pontual">{stats.totalTimeStr}</CelNegrito>
      </LinhaTabela>
      <LinhaTabela>
        <CelRotulo>Sequência atual</CelRotulo>
        <CelNegrito status="pontual">
          {stats.streak} {unidade(stats)}
          {stats.streakExecucoes != null &&
            ` · ${stats.streakExecucoes} execuç${stats.streakExecucoes === 1 ? "ão" : "ões"}`}
        </CelNegrito>
      </LinhaTabela>
      {stats.streakRecorde > 0 && (
        <LinhaTabela>
          <CelRotulo>Recorde</CelRotulo>
          <CelNegrito status="pontual">
            {stats.streakRecorde} {unidade(stats)}
          </CelNegrito>
        </LinhaTabela>
      )}
      {stats.medDev != null && (
        <LinhaTabela>
          <CelRotulo>Desvio médio</CelRotulo>
          <CelNegrito status={statusDaClasse(stats.medDevClass)}>{stats.medDevStr}</CelNegrito>
          <Vezes n={stats.devsCount} />
        </LinhaTabela>
      )}
      {stats.medMood != null && stats.moodStars && (
        <LinhaTabela>
          <CelRotulo>Humor médio</CelRotulo>
          <CelNegrito status="pontual">{stats.moodStars}</CelNegrito>
          <Vezes n={stats.moodCount} />
        </LinhaTabela>
      )}
      {stats.medDelay != null && (
        <LinhaTabela>
          <CelRotulo>Atraso médio no início</CelRotulo>
          <CelNegrito status={stats.medDelay > 5 ? "atraso" : "pontual"}>{stats.medDelay}min</CelNegrito>
          <Vezes n={stats.delayCount} />
        </LinhaTabela>
      )}
    </Secao>
  );
}

export function EtapasRotina({
  stats,
  onAjustar,
}: {
  stats: Stats;
  onAjustar: (s: Stats["stepRows"][number]) => void;
}) {
  return (
    <>
      <Secao titulo="Por etapa (desvio médio)">
        {stats.stepRows.map((s, i) => (
          <div key={i} className={s.suggestAdjust ? "mb-2" : undefined}>
            <LinhaTabela>
              <CelRotulo>{s.name}</CelRotulo>
              <CelNegrito status={statusDaClasse(s.statusClass)}>{s.medDevStr}</CelNegrito>
              <CelNota>
                {semSinal(s.plan)}&rarr;{semSinal(s.medAct)} &middot; {s.n}x
              </CelNota>
            </LinhaTabela>
            {s.suggestAdjust && (
              <div className="flex items-center justify-between gap-2 pt-0.5 pb-2 pl-3">
                <Legenda>A média real é {semSinal(s.medAct)}.</Legenda>
                <button
                  className="rounded-lg border-[1.5px] border-dashed border-caneta-soft bg-card-2 px-3 py-[5px] font-sans text-md text-caneta"
                  onClick={() => onAjustar(s)}
                >
                  ajustar para {s.newSecLabel}
                </button>
              </div>
            )}
          </div>
        ))}
      </Secao>
      <Secao titulo={<>Planejado &minus; real (média)</>}>
        <LinhaTabela cabecalho>
          <CelRotulo>tarefa</CelRotulo>
          <CelNegrito>média</CelNegrito>
        </LinhaTabela>
        {stats.durRows.map((d, i) => (
          <LinhaTabela key={i}>
            <CelRotulo>{d.name}</CelRotulo>
            <CelNegrito status={statusDaClasse(d.statusMedia)}>{d.difMediaStr}</CelNegrito>
          </LinhaTabela>
        ))}
        <Legenda className="mt-3">Positivo sobrou tempo, negativo estourou o planejado.</Legenda>
      </Secao>
    </>
  );
}

export function CargaExercicios({ stats }: { stats: Stats }) {
  return (
    <Secao titulo="Carga por exercício">
      {stats.exerciseRows.map((ex, i) => (
        <div key={i} className="mb-2">
          <LinhaTabela>
            <CelRotulo>{ex.nome}</CelRotulo>
            <CelNegrito status="pontual">{ex.maxPeso}kg</CelNegrito>
            <Vezes n={ex.count} />
          </LinhaTabela>
          <div className="flex items-center justify-between gap-2 pt-0.5 pb-2 pl-3">
            <Legenda>{ex.serieText}</Legenda>
            {ex.evoText && <Legenda>{ex.evoText}</Legenda>}
          </div>
        </div>
      ))}
    </Secao>
  );
}

export function HorariosRotina({ stats }: { stats: Stats }) {
  return (
    <Secao titulo="Horário real de início">
      <BarrasHora colunas={stats.hourCols} cor={stats.routineColor} />
    </Secao>
  );
}

export function UltimasExecucoes({ stats, onApagar }: { stats: Stats; onApagar: (ts: number) => void }) {
  return (
    <Secao
      titulo={
        <>
          Últimas execuções &middot; <Icon name="xmark" size={14} /> apaga o registro
        </>
      }
    >
      {stats.recent.map((h) => (
        <LinhaTabela key={h.ts}>
          <CelNota>
            {h.dateStr} {h.timeStr}
          </CelNota>
          <CelNota>
            {h.cmpStr} {h.moodStr}
          </CelNota>
          <button
            className="shrink-0 border-0 bg-transparent px-1.5 py-0.5 text-md text-sub active:text-erro desktop:hover:text-erro"
            onClick={() => onApagar(h.ts)}
            title="Apagar este registro de execução"
            aria-label="Apagar registro"
          >
            <Icon name="xmark" size={14} />
          </button>
        </LinhaTabela>
      ))}
    </Secao>
  );
}
