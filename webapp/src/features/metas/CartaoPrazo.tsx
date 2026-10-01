// Cartão de meta com prazo: peso, dias de trabalho, contador de itens (se há
// quantidade) e prazo com ritmo necessário.
import { Icon } from "../../components/Icon";
import { DIAS_ABREV } from "../../lib/constants";
import {
  cdPace,
  daysUntil,
  metaAreaInfo,
  metaConcluida,
  metaCreditado,
  metaDiasLabel,
  metaEscopo,
  metaPontosTotais,
  projecaoMeta,
  proximoMarco,
} from "../../lib/metas";
import type { MetaTarget } from "../../lib/types";
import { cn } from "../../lib/cn";
import { Etiqueta } from "../../ui/Etiqueta";
import { Fato, Fatos } from "../../ui/Fatos";
import { CartaoMeta, ContadorMeta } from "./CartaoMeta";
import { ESCOPO_LABEL, TAG_LABEL } from "./constantes";

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
  const diasLabel = metaDiasLabel(t, DIAS_ABREV);
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
      contador={
        t.topics != null && (
          <ContadorMeta
            texto={`${(t.done || 0).toLocaleString("pt-BR")} / ${t.topics.toLocaleString("pt-BR")}`}
            cor={feita ? "var(--ok)" : undefined}
            onMenos={() => onDone(Math.max(0, (t.done || 0) - 1))}
            onMais={() => onDone((t.done || 0) + 1)}
          />
        )
      }
      onEditar={onEditar}
      onExcluir={onExcluir}
    >
      <Fatos className="gap-x-2.5 gap-y-1.5">
        <Fato
          destaque
          className="font-medium"
          title={`Vale ${totalPts.toFixed(1)} pts no boletim ${ESCOPO_LABEL[esc]} · ${creditadoPts.toFixed(1)} creditados`}
        >
          <Icon name="ticket" size={14} /> {TAG_LABEL[t.tagValor || "alto"]}
        </Fato>
        <Etiqueta
          className={cn(d < 0 && "bg-erro-soft text-erro", d >= 0 && d <= 7 && "bg-caneta-soft text-caneta")}
          title={d >= 0 ? `faltam ${d} dia(s)` : `atrasada ${Math.abs(d)} dia(s)`}
        >
          <Icon name="countdown" size={13} /> {t.date.split("-").reverse().join("/")} ·{" "}
          {d >= 0 ? `${d}d` : `-${Math.abs(d)}d`}
        </Etiqueta>
        {diasLabel && (
          <Etiqueta title="Dias para trabalhar">
            <Icon name="calendar" size={13} /> {diasLabel}
          </Etiqueta>
        )}
        {pace && (
          <Fato title="Ritmo necessário">
            <b className="font-titulo">&Sigma;</b> {pace.txt}
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
              ? `no ritmo atual: ${proj.dataISO.split("-").reverse().slice(0, 2).join("/")}` +
                (proj.atrasa ? ` (${diasEntre(t.date, proj.dataISO)}d depois)` : "")
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
    </CartaoMeta>
  );
}

function dm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}
