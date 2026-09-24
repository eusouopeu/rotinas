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
} from "../../lib/metas";
import type { MetaTarget } from "../../lib/types";
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
  const areas = t.areas || [];
  const corPonto = areas.length ? metaAreaInfo(areas[0], gam.config.roda.areas).color : "var(--caneta)";
  const urgCor = d < 0 ? "var(--erro)" : d <= 7 ? "var(--caneta)" : undefined;

  return (
    <CartaoMeta
      setRef={setRef}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      corBorda={feita ? "var(--ok)" : undefined}
      corPonto={corPonto}
      titulo={t.title}
      onEditar={onEditar}
      onExcluir={onExcluir}
    >
      <Fatos>
        <Fato
          destaque
          title={`Vale ${totalPts.toFixed(1)} pts no boletim ${ESCOPO_LABEL[esc]} · ${creditadoPts.toFixed(1)} creditados`}
        >
          <Icon name="ticket" size={13} /> {TAG_LABEL[t.tagValor || "alto"]}
        </Fato>
        {diasLabel && (
          <Fato title="Dias para trabalhar">
            <Icon name="calendar" size={13} /> {diasLabel}
          </Fato>
        )}
      </Fatos>
      {/* "−" antes de "+": a inversão só vale para meta negativa, que não existe
          em meta com prazo (ver CartaoRec) */}
      {t.topics != null && (
        <ContadorMeta
          texto={`${(t.done || 0).toLocaleString("pt-BR")} / ${t.topics.toLocaleString("pt-BR")}`}
          cor={feita ? "var(--ok)" : undefined}
          onMenos={() => onDone(Math.max(0, (t.done || 0) - 1))}
          onMais={() => onDone((t.done || 0) + 1)}
        />
      )}
      <Fatos className="mt-1.5">
        <Fato style={{ color: urgCor }} title={d >= 0 ? `faltam ${d} dia(s)` : `atrasada ${Math.abs(d)} dia(s)`}>
          <Icon name="countdown" size={13} /> {t.date.split("-").reverse().join("/")} ·{" "}
          {d >= 0 ? `${d}d` : `-${Math.abs(d)}d`}
        </Fato>
        {pace && (
          <Fato title="Ritmo necessário">
            <b className="font-titulo">&Sigma;</b> {pace.txt}
          </Fato>
        )}
      </Fatos>
    </CartaoMeta>
  );
}
