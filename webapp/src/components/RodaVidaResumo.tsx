import { useAppStore } from "../store/useAppStore";
import { pontosPorAreaSemana, ritmoInfo } from "../lib/boletim";

/**
 * Card resumido e clicável da Roda da Vida semanal.
 * Porta de rodaVidaResumoHtml (index.html:2055-2075).
 * Reutilizado no topo das telas Home, Metas e Stats.
 */
export function RodaVidaResumo() {
  const gam = useAppStore((s) => s.gam);
  const weekStart = useAppStore((s) => s.weekStart);
  const goTo = useAppStore((s) => s.goTo);

  if (!gam.semanaAtual) return null;

  const roda = pontosPorAreaSemana(gam.semanaAtual, gam.config);
  const linhas = roda.linhas.filter((l) => l.label !== "Sem área");
  const temNota = (gam.semanaAtual.totalBrutoAgendado || 0) > 0;

  if (!linhas.length && !temNota) return null;

  const max = Math.max(...linhas.map((l) => Math.max(l.pontos, l.previsto)), 0);

  let rodape: React.ReactNode = null;
  if (temNota) {
    const r = ritmoInfo(gam.semanaAtual, gam.config, new Date(), weekStart);
    const d = r.diasRestantes;
    rodape = (
      <div className="roda-boletim">
        Nota <b style={{ color: r.cor }}>{r.nota.toFixed(1)}</b>/100 ·{" "}
        <span style={{ color: r.cor }}>{r.label}</span> · {d} dia{d > 1 ? "s" : ""}{" "}
        restante{d > 1 ? "s" : ""}
      </div>
    );
  }

  return (
    <div
      className="stat-card roda-resumo-card"
      data-boletimcard="1"
      role="button"
      tabIndex={0}
      title="Ver o boletim da semana"
      style={{ marginBottom: 14, cursor: "pointer" }}
      onClick={() => goTo({ tab: "home", screen: "boletim" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goTo({ tab: "home", screen: "boletim" });
        }
      }}
    >
      <div className="section-label" style={{ marginTop: 0 }}>
        Roda da vida — semana
      </div>
      {linhas.map((l) => (
        <div className="bar-row" key={l.label}>
          <div className="bar-name" style={{ color: l.color }}>
            {l.label}
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${max ? Math.max(3, Math.round((l.pontos / max) * 100)) : 0}%`,
                background: l.color,
              }}
            />
          </div>
          <div className="bar-val" style={{ width: "auto", whiteSpace: "nowrap", flex: "0 0 auto" }}>
            {l.pontos.toFixed(1)}
            {l.previsto ? " / " + l.previsto.toFixed(0) : ""}
          </div>
        </div>
      ))}
      {rodape}
    </div>
  );
}
