// Cartão de meta recorrente (hábito N vezes ao dia/na semana; negativa =
// limite, com penalidade ao passar). O saldo de pontos vive no Boletim: aqui só
// nome, peso, frequência, lembretes e o contador (o saldo é a dica do peso).
import { Icon } from "../../components/Icon";
import { fatorParaArea } from "../../lib/gamificacao";
import { metaRecCompleta, metaRecExcedida, metaRecExcesso, metaRecFeitas } from "../../lib/metas";
import { metaRecPenalidadeUnidade, metaRecPontosUnidade } from "../../lib/scoring";
import type { GamificacaoState, MetaRecorrente } from "../../lib/types";
import { Fato, Fatos } from "../../ui/Fatos";
import { CartaoMeta, ContadorMeta } from "./CartaoMeta";
import { TAG_LABEL } from "./constantes";

type Props = {
  rec: MetaRecorrente;
  gam: GamificacaoState;
  isDragging: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  dragHandleProps: Record<string, unknown>;
  onAjustar: (delta: number) => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
};

export function CartaoRec({ rec, gam, isDragging, setRef, dragHandleProps, onAjustar, onEditar, onDuplicar, onExcluir }: Props) {
  const feitas = metaRecFeitas(rec);
  const completa = rec.negativa ? !metaRecExcedida(rec) : metaRecCompleta(rec);
  const excesso = rec.negativa ? metaRecExcesso(rec) : 0;
  const noLimite = rec.negativa && feitas >= rec.vezes;

  const freqTxt = `${rec.negativa ? "até " : ""}${rec.vezes}x ${rec.tipo === "semanal" ? "por semana" : "ao dia"}`;
  const areaObj = rec.area ? gam.config.roda.areas.find((a) => a.id === rec.area) : null;
  const fator = fatorParaArea(rec.area || "", gam.semanaAtual?.fatoresArea || {}, gam.semanaAtual?.fatorNormalizacao || 1);

  let pesoTitle = "";
  if (rec.negativa) {
    const penUnidade = -metaRecPenalidadeUnidade(rec, gam.config);
    pesoTitle =
      excesso > 0
        ? `Excedeu em ${excesso} · -${(excesso * penUnidade * fator).toFixed(1)} pts no boletim`
        : "Dentro do limite";
  } else if (rec.pontua) {
    const ptsUnidade = metaRecPontosUnidade(rec, gam.config);
    pesoTitle = `+${(feitas * ptsUnidade * fator).toFixed(1)} pts no boletim${completa ? " · concluída" : ""}`;
  }

  const corBorda = rec.negativa ? (excesso > 0 ? "var(--erro)" : "var(--ok)") : completa ? "var(--ok)" : undefined;

  return (
    <CartaoMeta
      setRef={setRef}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      corBorda={corBorda}
      corPonto={areaObj?.color || "var(--caneta)"}
      titulo={rec.titulo}
      onEditar={onEditar}
      onExcluir={onExcluir}
      onDuplicar={onDuplicar}
    >
      <Fatos>
        {(rec.negativa || rec.pontua) && (
          <Fato destaque title={pesoTitle || undefined}>
            <Icon name="ticket" size={13} /> {TAG_LABEL[rec.tagValor || "medio"]}
          </Fato>
        )}
        <Fato title={rec.negativa ? "Limite do período" : "Frequência"}>
          <Icon name="calendar" size={13} /> {freqTxt}
        </Fato>
        {rec.notif && (
          <Fato title="Lembretes">
            <Icon name="bell" size={13} /> {rec.notif.inicio}–{rec.notif.fim}
          </Fato>
        )}
      </Fatos>
      <ContadorMeta
        texto={`${feitas} / ${rec.vezes}`}
        cor={noLimite ? "var(--erro)" : completa && !rec.negativa ? "var(--ok)" : undefined}
        invertido={rec.negativa}
        onMenos={() => onAjustar(-1)}
        onMais={() => onAjustar(1)}
      />
    </CartaoMeta>
  );
}
