import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { pontosPorAreaSemana, ritmoInfo } from "../lib/boletim";
import { load, save } from "../lib/storage";
import { K_RODARESUMOABERTO } from "../lib/constants";
import { Icon } from "./Icon";

/** Quantas áreas cabem por página antes de precisar das setas ‹ ›. */
const POR_PAGINA = 2;

/** 1,8 · 13,9 · 0 — decimal só quando existe, vírgula como no resto do app. */
function num(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Card resumido e clicável da Roda da Vida semanal.
 * Porta de rodaVidaResumoHtml (index.html:2055-2075), reestruturado em
 * 11/09/2026 (mockup do Pedro): cabeçalho retrátil, áreas paginadas de duas em
 * duas e rodapé de fatos (nota, itens concluídos, dias restantes).
 * Reutilizado no topo das telas Home, Metas e Stats.
 */
export function RodaVidaResumo() {
  const gam = useAppStore((s) => s.gam);
  const weekStart = useAppStore((s) => s.weekStart);
  const goTo = useAppStore((s) => s.goTo);

  const [aberto, setAberto] = useState(() => load<boolean>(K_RODARESUMOABERTO, true));
  const [pagina, setPagina] = useState(0);

  if (!gam.semanaAtual) return null;

  const roda = pontosPorAreaSemana(gam.semanaAtual, gam.config);
  const linhas = roda.linhas.filter((l) => l.label !== "Sem área");
  const temNota = (gam.semanaAtual.totalBrutoAgendado || 0) > 0;

  if (!linhas.length && !temNota) return null;

  const max = Math.max(...linhas.map((l) => Math.max(l.pontos, l.previsto)), 0);
  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visiveis = linhas.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA);
  const temSetas = linhas.length > POR_PAGINA;

  // Σ conta ITENS da semana, não pontos: a soma dos pontos por área é, por
  // construção, a própria nota (a semana é normalizada em 100) — repetir o
  // mesmo número em dois fatos não diria nada.
  const itensFeitos = (gam.semanaAtual.concluidos || []).length;
  const itensAgendados = (gam.semanaAtual.agendaCongelada || []).length;

  const r = temNota ? ritmoInfo(gam.semanaAtual, gam.config, new Date(), weekStart) : null;

  function alternar(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setAberto((v) => {
      save(K_RODARESUMOABERTO, !v);
      return !v;
    });
  }

  function irPara(e: React.MouseEvent, delta: number) {
    e.stopPropagation();
    setPagina(Math.min(paginas - 1, Math.max(0, pag + delta)));
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
      <div
        className="roda-head"
        role="button"
        tabIndex={0}
        aria-expanded={aberto}
        title={aberto ? "Recolher" : "Expandir"}
        onClick={alternar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alternar(e);
          }
        }}
      >
        <span className="roda-titulo">Roda da vida</span>
        <Icon name={aberto ? "chevronDown" : "chevronUp"} size={17} />
      </div>

      {aberto && (
        <>
          <div className="roda-pager">
            {temSetas && (
              <button
                className="roda-seta"
                title="Áreas anteriores"
                aria-label="Áreas anteriores"
                disabled={pag === 0}
                onClick={(e) => irPara(e, -1)}
              >
                <Icon name="chevronLeft" size={15} />
              </button>
            )}
            <div className="roda-linhas">
              {visiveis.map((l) => (
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
                    {num(l.pontos)}
                    {l.previsto ? " / " + l.previsto.toFixed(0) : ""}
                  </div>
                </div>
              ))}
            </div>
            {temSetas && (
              <button
                className="roda-seta"
                title="Próximas áreas"
                aria-label="Próximas áreas"
                disabled={pag >= paginas - 1}
                onClick={(e) => irPara(e, 1)}
              >
                <Icon name="chevronRight" size={15} />
              </button>
            )}
          </div>

          <div className="roda-boletim">
            {r && (
              <span className="rc-fact" title={`Nota da semana · ${r.label}`}>
                <Icon name="hashtag" size={13} /> Nota <b style={{ color: r.cor }}>{num(r.nota)}</b>
                <span className="roda-total">/100</span>
              </span>
            )}
            {itensAgendados > 0 && (
              <span className="rc-fact" title="Itens da semana já concluídos">
                <b style={{ fontFamily: "'Lato',sans-serif" }}>&Sigma;</b> <b>{itensFeitos}</b>
                <span className="roda-total">/{itensAgendados}</span>
              </span>
            )}
            {r && (
              <span className="rc-fact" title="Dias restantes na semana">
                <Icon name="clock" size={13} /> {r.diasRestantes} dia
                {r.diasRestantes > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
