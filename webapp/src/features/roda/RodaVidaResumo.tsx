import { useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { pontosPorAreaSemana, ritmoInfo } from "../../lib/boletim";
import { load, save } from "../../lib/storage";
import { K_RODARESUMOABERTO } from "../../lib/constants";
import { Icon } from "../../components/Icon";
import { useIsDesktop } from "../../lib/useIsDesktop";
import { Cartao } from "../../ui/Cartao";
import { Fato } from "../../ui/Fatos";
import { LinhaBarra } from "../../ui/LinhaBarra";

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
    <Cartao
      className="mb-3.5 cursor-pointer"
      data-roda="cartao"
      data-boletimcard="1"
      role="button"
      tabIndex={0}
      title="Ver o boletim da semana"
      onClick={() => goTo({ tab: "home", screen: "boletim" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goTo({ tab: "home", screen: "boletim" });
        }
      }}
    >
      <div
        className="flex cursor-pointer items-center justify-between gap-2.5"
        data-roda="cabecalho"
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
        <span className="font-sans text-md tracking-[0.06em] text-ink uppercase">Roda da vida</span>
        <Icon name={aberto ? "chevronDown" : "chevronUp"} size={17} />
      </div>

      {aberto && (
        <>
          <div className="mt-2 flex items-center gap-1">
            {temSetas && <SetaPagina rotulo="Áreas anteriores" desabilitada={pag === 0} onClick={(e) => irPara(e, -1)} icone="chevronLeft" />}
            <div
              className="min-w-0 flex-1"
              data-roda="linhas"
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
                <LinhaBarra
                  key={l.label}
                  data-roda="linha"
                  className="my-1.5"
                  rotulo={l.label}
                  cor={l.color}
                  corRotulo={l.color}
                  pct={max ? Math.max(3, Math.round((l.pontos / max) * 100)) : 0}
                  valor={valTxt(l)}
                  larguraValor={valCh + 0.5}
                />
              ))}
            </div>
            {temSetas && <SetaPagina rotulo="Próximas áreas" desabilitada={pag >= paginas - 1} onClick={(e) => irPara(e, 1)} icone="chevronRight" />}
          </div>

          <div data-roda="rodape" className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 border-t-[1.5px] border-line pt-2.5 font-sans text-md text-ink">
            {r && (
              <Fato data-roda="fato" title={`Nota da semana · ${r.label}`}>
                <Icon name="hashtag" size={13} /> Nota <b style={{ color: r.cor }}>{num(r.nota)}</b>
                <span className="text-sub">/100</span>
              </Fato>
            )}
            {r && (
              <Fato data-roda="fato" title="Pontos que você deveria ter a esta altura da semana">
                <b className="font-titulo">&Sigma;</b> <b>{num(r.esperado)}</b>
                <span className="text-sub">/100</span>
              </Fato>
            )}
            {r && (
              <Fato data-roda="fato" title="Dias restantes na semana">
                <Icon name="clock" size={13} /> {r.diasRestantes} dia
                {r.diasRestantes > 1 ? "s" : ""}
              </Fato>
            )}
          </div>
        </>
      )}
    </Cartao>
  );
}

function SetaPagina({
  rotulo,
  desabilitada,
  onClick,
  icone,
}: {
  rotulo: string;
  desabilitada: boolean;
  onClick: (e: React.MouseEvent) => void;
  icone: "chevronLeft" | "chevronRight";
}) {
  return (
    <button
      title={rotulo}
      aria-label={rotulo}
      disabled={desabilitada}
      onClick={onClick}
      data-roda="seta"
      className="flex h-[38px] w-6 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-sub disabled:cursor-default disabled:opacity-25"
    >
      <Icon name={icone} size={15} />
    </button>
  );
}
