import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { pontosPorAreaSemana, ritmoInfo } from "../lib/boletim";
import { load, save } from "../lib/storage";
import { K_RODARESUMOABERTO } from "../lib/constants";
import { Icon } from "./Icon";
import { useIsDesktop } from "../lib/useIsDesktop";

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
  const isDesktop = useIsDesktop();

  const [aberto, setAberto] = useState(() => load<boolean>(K_RODARESUMOABERTO, true));
  const [pagina, setPagina] = useState(0);
  // x inicial do arrasto que troca de página no mobile (null = sem arrasto)
  const arrasto = useRef<number | null>(null);

  if (!gam.semanaAtual) return null;

  const roda = pontosPorAreaSemana(gam.semanaAtual, gam.config);
  const linhas = roda.linhas.filter((l) => l.label !== "Sem área");
  const temNota = (gam.semanaAtual.totalBrutoAgendado || 0) > 0;

  if (!linhas.length && !temNota) return null;

  const max = Math.max(...linhas.map((l) => Math.max(l.pontos, l.previsto)), 0);
  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visiveis = linhas.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA);
  // no mobile a troca de página é por arrasto; as setas ficam só no desktop
  const temSetas = linhas.length > POR_PAGINA && isDesktop;
  const podeArrastar = linhas.length > POR_PAGINA && !isDesktop;

  const valTxt = (l: (typeof linhas)[number]) => num(l.pontos) + (l.previsto ? " / " + l.previsto.toFixed(0) : "");
  // coluna do valor com a mesma largura em todas as linhas (e páginas): o
  // texto mais longo define a largura, então as barras ficam todas iguais.
  const valCh = Math.max(0, ...linhas.map((l) => valTxt(l).length));

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
    mover(delta);
  }

  function mover(delta: number) {
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
            <div
              className="roda-linhas"
              onTouchStart={(e) => {
                arrasto.current = podeArrastar ? e.touches[0].clientX : null;
              }}
              onTouchEnd={(e) => {
                const ini = arrasto.current;
                arrasto.current = null;
                if (ini == null) return;
                const dx = e.changedTouches[0].clientX - ini;
                // 40px é o mesmo limiar do swipe dos cards (SwipeItem)
                if (Math.abs(dx) < 40) return;
                e.stopPropagation();
                mover(dx < 0 ? 1 : -1);
              }}
            >
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
                  <div className="bar-val" style={{ width: `${valCh + 0.5}ch`, whiteSpace: "nowrap", flex: "0 0 auto" }}>
                    {valTxt(l)}
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
            {r && (
              <span className="rc-fact" title="Pontos que você deveria ter a esta altura da semana">
                <b style={{ fontFamily: "'Lato',sans-serif" }}>&Sigma;</b> <b>{num(r.esperado)}</b>
                <span className="roda-total">/100</span>
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
