// Cartão de meta com prazo (mockup de 02/10/2026): prazo em vermelho e
// sequência em cima, nome, xp de cada item e ritmo necessário por dia, a
// semana em bolinhas, o progresso grande com a unidade embaixo e − / + de
// meia largura no rodapé. Projeção e marco seguem como linhas pequenas.
import { Icon } from "../../components/Icon";
import { fmtXp } from "../../lib/format";
import {
  cdPace,
  cdUnit,
  daysUntil,
  metaAreaInfo,
  metaConcluida,
  metaCreditado,
  metaDias,
  metaEscopo,
  metaPontosTotais,
  projecaoMeta,
  proximoMarco,
  semanaDaMeta,
  sequenciaMetaPrazo,
} from "../../lib/metas";
import type { MetaTarget } from "../../lib/types";
import { Fato, Fatos } from "../../ui/Fatos";
import { CartaoMeta, NumeroMeta, RodapeContador, SemanaMeta, SeloSequencia } from "./CartaoMeta";
import { ESCOPO_LABEL } from "./constantes";

type Props = {
  t: MetaTarget;
  gam: Parameters<typeof metaPontosTotais>[1];
  isDragging: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  dragHandleProps: Record<string, unknown>;
  onEditar: () => void;
  onDone: (d: number) => void;
  onExcluir: () => void;
};

export function CartaoPrazo({ t, gam, isDragging, setRef, dragHandleProps, onEditar, onDone, onExcluir }: Props) {
  const d = daysUntil(t.date);
  const esc = metaEscopo(t);
  const feita = metaConcluida(t);
  const totalPts = metaPontosTotais(t, gam);
  const creditadoPts = metaCreditado(t);
  const seq = sequenciaMetaPrazo(t);
  const semana = semanaDaMeta(metaDias(t), (iso) => t.progressoDias?.[iso] || 0);
  // xp de cada item (Pedro, 02/10/2026); sem quantidade, a meta inteira
  const xp = t.topics ? totalPts / t.topics : totalPts;
  const pace = cdPace(t);
  const proj = feita ? null : projecaoMeta(t);
  const marco = feita ? null : proximoMarco(t);
  const areas = t.areas || [];
  const corPonto = areas.length ? metaAreaInfo(areas[0], gam.config.roda.areas).color : "var(--caneta)";

  return (
    <CartaoMeta
      setRef={setRef}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      estado={feita ? "ok" : undefined}
      corPonto={corPonto}
      titulo={t.title}
      topo={
        <>
          <span
            className="font-sans text-md font-bold text-erro tabular-nums"
            title={d >= 0 ? `Prazo: faltam ${d} dia(s)` : `Prazo: atrasada ${Math.abs(d)} dia(s)`}
          >
            {t.date.split("-").reverse().join(" / ")}
          </span>
          <SeloSequencia
            n={seq.dias}
            execucoes={seq.execucoes}
            title={`${seq.dias} dia${seq.dias !== 1 ? "s" : ""} seguido${seq.dias !== 1 ? "s" : ""} · ${seq.execucoes} com progresso`}
          />
        </>
      }
      rodape={
        t.topics != null && (
          <RodapeContador
            onMenos={() => onDone(Math.max(0, (t.done || 0) - 1))}
            onMais={() => onDone((t.done || 0) + 1)}
          />
        )
      }
      onEditar={onEditar}
      onExcluir={onExcluir}
    >
      <Fatos className="gap-x-2.5 gap-y-1">
        {xp > 0 && (
          <Fato
            destaque
            title={`Cada item vale ${fmtXp(xp)} · a meta vale ${totalPts.toFixed(1)} pts no boletim ${ESCOPO_LABEL[esc]} · ${creditadoPts.toFixed(1)} creditados`}
          >
            <Icon name="ticket" size={14} /> {fmtXp(xp)} xp
          </Fato>
        )}
        {pace && (
          <Fato className="text-ink" title={`Ritmo necessário: ${pace.txt}`}>
            <b className="font-titulo text-lg">&Sigma;</b>{" "}
            {pace.days > 0 && pace.remaining > 0
              ? `${(pace.remaining / pace.days).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por dia`
              : pace.txt}
          </Fato>
        )}
        {proj && (
          <Fato
            data-meta="projecao"
            className={proj.atrasa ? "text-erro" : "text-ok"}
            title={
              proj.dataISO
                ? `No ritmo dos últimos dias (${proj.ritmo.toFixed(1).replace(".", ",")}/dia)`
                : "Nada feito nos últimos 14 dias"
            }
          >
            <Icon name="arrowRight" size={13} />{" "}
            {proj.dataISO
              ? `no ritmo: ${dm(proj.dataISO)}` + (proj.atrasa ? ` (${diasEntre(t.date, proj.dataISO)}d depois)` : "")
              : "parada"}
          </Fato>
        )}
        {marco && (
          <Fato
            data-meta="marco"
            className={marco.noRitmo ? "text-ok" : "text-erro"}
            title={
              marco.perdido
                ? "Prazo do marco passou sem chegar lá"
                : `No ritmo atual, ${marco.previsto} até ${dm(marco.marco.data)}`
            }
          >
            <Icon name="ticket" size={13} /> marco {marco.marco.alvo.toLocaleString("pt-BR")} até {dm(marco.marco.data)}
            {marco.perdido ? " · perdido" : marco.noRitmo ? "" : ` · prev. ${marco.previsto}`}
          </Fato>
        )}
      </Fatos>
      <SemanaMeta dias={semana} />
      {t.topics != null && (
        <div className="mt-2.5">
          <NumeroMeta
            grande
            texto={`${(t.done || 0).toLocaleString("pt-BR")} / ${t.topics.toLocaleString("pt-BR")}`}
            legenda={cdUnit(t)}
            ok={feita}
          />
        </div>
      )}
    </CartaoMeta>
  );
}

function dm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}
