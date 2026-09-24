// Porta de renderStats/renderWeekView/renderMonthView/renderYearView/
// renderPeriodExtras/dayDetailHtml (index.html:5296-6028) — tela "Estatísticas"
// (aba "Dados" no legado): visão semanal, mensal e anual com filtro por rotina,
// heatmap anual, metas, gráficos, insights e relatório PDF. As visões, os
// calendários e os gráficos moram em features/dados/.
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { Dicas } from "../features/dados/Dicas";
import { useEstadoDados } from "../features/dados/estado";
import { VistaAnual } from "../features/dados/VistaAnual";
import { VistaMensal } from "../features/dados/VistaMensal";
import { VistaSemanal } from "../features/dados/VistaSemanal";
import { exportPdfView } from "../lib/exportFile";
import { relatorioFechamentoHtml } from "../lib/pdfExport";
import type { CountdownDoc } from "../lib/types";
import { BotaoIcone } from "../ui/BotaoIcone";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Selecao } from "../ui/Selecao";
import { SegPill } from "../ui/Segmentado";

export function Stats() {
  const goTo = useAppStore((s) => s.goTo);
  const routines = useAppStore((s) => s.routines);
  const history = useAppStore((s) => s.history);
  const gam = useAppStore((s) => s.gam);
  const templates = useAppStore((s) => s.templates);
  const weekStart = useAppStore((s) => s.weekStart);
  const snoozes = useAppStore((s) => s.snoozes);
  const estado = useEstadoDados();
  const { statsView, statsRoutineFilter, setStatsRoutineFilter } = estado;

  const irRotina = (id: string) => goTo({ tab: "dados", screen: "routineStats", id });
  const dados = { history, routines, snoozes, gam, weekStart, estado };

  function handleExportPdf() {
    const doc = templates.find((t): t is CountdownDoc => t.type === "countdown");
    const { title, innerHtml } = relatorioFechamentoHtml(statsView, gam, history, routines, doc?.targets ?? []);
    exportPdfView(title, innerHtml, "Relatórios");
  }

  return (
    <div className="screen screen-wide with-tabbar">
      <div className="tab-scroll">
        {/* no desktop o cabeçalho fixo mantém os paddings/margens da barra de topo (.home-header) */}
        <div className="home-header sticky top-0 z-[6] mb-[22px] border-b-[1.5px] border-line bg-paper pt-0.5 pb-3.5 desktop:z-10 desktop:mb-1.5 desktop:pt-[22px] desktop:pb-4">
          <h1 className="flex items-center">Dados</h1>
          <div className="flex items-center gap-2.5">
            <BotaoIcone rotulo="Relatório de fechamento (PDF)" tamanho="sm" className="flex-shrink-0" onClick={handleExportPdf}>
              <Icon name="clipboard" size={15} />
            </BotaoIcone>
          </div>
        </div>

        <div id="statsHead">
          <div className="mb-3 flex">
            <SegPill
              cheia
              options={[
                { key: "semanal", label: "Semanal" },
                { key: "mensal", label: "Mensal" },
                { key: "anual", label: "Anual" },
              ]}
              active={statsView}
              onSelect={(v) => {
                estado.setStatsView(v);
                estado.setSelectedDay(null);
              }}
            />
          </div>

          <div className="mb-3 flex">
            <Selecao value={statsRoutineFilter || ""} onChange={(e) => setStatsRoutineFilter(e.target.value || null)}>
              <option value="">Todas as rotinas</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Selecao>
          </div>
        </div>

        <div id="statsBody" className="desktop:columns-2 desktop:gap-x-4 ultra:columns-3">
          {history.length === 0 ? (
            <EstadoVazio
              className="min-h-[50vh]"
              titulo="Sem dados ainda"
              texto="Conclua rotinas para ver seu histórico, desvios de tempo e pontualidade aqui."
            />
          ) : (
            <>
              <Dicas templates={templates} routines={routines} history={history} snoozes={snoozes} />
              {statsView === "mensal" ? (
                <VistaMensal {...dados} irRotina={irRotina} />
              ) : statsView === "anual" ? (
                <VistaAnual {...dados} irRotina={irRotina} />
              ) : (
                <VistaSemanal {...dados} />
              )}
            </>
          )}
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
