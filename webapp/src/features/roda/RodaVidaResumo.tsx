import { useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { pontosPorAreaSemana, ritmoInfo } from "../../lib/boletim";
import { load, save } from "../../lib/storage";
import { K_RODARESUMOABERTO } from "../../lib/constants";
import { Icon } from "../../components/Icon";
import { useIsDesktop } from "../../lib/useIsDesktop";
import { cn } from "../../lib/cn";
import { Etiqueta } from "../../ui/Etiqueta";
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
 * 11/09/2026 (mockup do Pedro): cabeçalho retrátil e áreas paginadas de duas
 * em duas. Desde 30/09/2026 o rodapé de fatos saiu: a nota vira o selo à
 * esquerda ("13,9 de 95" = nota / esperado até hoje, verde no ritmo, vermelho
 * abaixo) e os dias restantes, uma etiqueta no cabeçalho.
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

  const irBoletim = () => goTo({ tab: "home", screen: "boletim" });
  // selo da nota (mockup de 30/09/2026): verde claro no ritmo ou acima do
  // esperado para o dia, vermelho claro abaixo
  const emDia = r ? r.nota >= r.esperado : true;

  return (
    <div
      className="mb-3.5 flex cursor-pointer items-start gap-2.5"
      data-roda="cartao"
      data-boletimcard="1"
      role="button"
      tabIndex={0}
      title="Ver o boletim da semana"
      onClick={irBoletim}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          irBoletim();
        }
      }}
    >
      {r && (
        <div
          data-roda="selo"
          data-ritmo={emDia ? "ok" : "abaixo"}
          className={cn(
            "flex size-[52px] flex-none flex-col items-center justify-center rounded-app leading-none",
            emDia ? "bg-ok-soft text-ok" : "bg-erro-soft text-erro"
          )}
          title={`Nota da semana ${num(r.nota)} · esperado até hoje ${num(r.esperado)} · ${r.label}`}
        >
          <b className="font-titulo text-xl">{num(r.nota)}</b>
          <span className="mt-0.5 font-sans text-2xs text-ink">de {num(r.esperado)}</span>
        </div>
      )}
      <div className="min-w-0 flex-1 rounded-app bg-card-2 px-4 py-3">
        <div
          className="flex min-h-7 cursor-pointer items-center gap-2.5"
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
          {r && (
            <Etiqueta tom="forte" data-roda="fato" title="Dias restantes na semana">
              <Icon name="clock" size={13} /> {r.diasRestantes} dia{r.diasRestantes > 1 ? "s" : ""}
            </Etiqueta>
          )}
          <span className="ml-auto flex">
            <Icon name={aberto ? "chevronDown" : "chevronUp"} size={17} />
          </span>
        </div>

        {aberto && linhas.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {temSetas && (
              <SetaPagina
                rotulo="Áreas anteriores"
                desabilitada={pag === 0}
                onClick={(e) => irPara(e, -1)}
                icone="chevronLeft"
              />
            )}
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
            {temSetas && (
              <SetaPagina
                rotulo="Próximas áreas"
                desabilitada={pag >= paginas - 1}
                onClick={(e) => irPara(e, 1)}
                icone="chevronRight"
              />
            )}
          </div>
        )}
      </div>
    </div>
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
