// Cartão de meta recorrente (hábito N vezes ao dia/na semana; negativa =
// limite, com penalidade ao passar). O saldo de pontos vive no Boletim: aqui só
// nome, peso, frequência, lembretes e o contador (o saldo é a dica do peso).
import { Icon } from "../../components/Icon";
import { fatorParaArea } from "../../lib/gamificacao";
import { metaRecCompleta, metaRecExcesso, metaRecFeitas, metaRecSaldo, metaRecSequencia } from "../../lib/metas";
import { metaRecPenalidadeUnidade, metaRecPontosBrutos } from "../../lib/scoring";
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

export function CartaoRec({
  rec,
  gam,
  isDragging,
  setRef,
  dragHandleProps,
  onAjustar,
  onEditar,
  onDuplicar,
  onExcluir,
}: Props) {
  const feitas = metaRecFeitas(rec);
  const completa = metaRecCompleta(rec);
  const excesso = rec.negativa ? metaRecExcesso(rec) : 0;
  // meta negativa mostra o saldo que resta (4/4 no dia ideal): verde enquanto
  // positivo, cor do texto em zero (não pontua) e vermelho abaixo (desconta).
  const saldo = metaRecSaldo(rec);
  const sequencia = metaRecSequencia(rec);

  const freqTxt = `${rec.negativa ? "até " : ""}${rec.vezes}x ${rec.tipo === "semanal" ? "por semana" : "ao dia"}`;
  const areaObj = rec.area ? gam.config.roda.areas.find((a) => a.id === rec.area) : null;
  const fator = fatorParaArea(
    rec.area || "",
    gam.semanaAtual?.fatoresArea || {},
    gam.semanaAtual?.fatorNormalizacao || 1
  );

  let pesoTitle = "";
  if (rec.negativa) {
    const penUnidade = -metaRecPenalidadeUnidade(rec, gam.config);
    pesoTitle =
      excesso > 0
        ? `Saldo ${saldo} · -${(excesso * penUnidade * fator).toFixed(1)} pts no boletim`
        : saldo === 0
          ? "No limite · não pontua"
          : "Dentro do limite";
  } else if (rec.pontua) {
    const pts = metaRecPontosBrutos(rec, gam.config, feitas);
    pesoTitle = `+${(pts * fator).toFixed(1)} pts no boletim${completa ? " · concluída" : ""}`;
  }

  const corBorda = rec.negativa
    ? saldo < 0
      ? "var(--erro)"
      : saldo > 0
        ? "var(--ok)"
        : undefined
    : completa
      ? "var(--ok)"
      : undefined;
  const corTexto = rec.negativa
    ? saldo > 0
      ? "var(--ok)"
      : saldo < 0
        ? "var(--erro)"
        : undefined
    : completa
      ? "var(--ok)"
      : undefined;

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
        {sequencia > 0 && (
          <Fato
            title={`${sequencia} ${rec.tipo === "semanal" ? "semana" : "dia"}${sequencia > 1 ? "s" : ""} seguido${sequencia > 1 ? "s" : ""} cumprindo a meta`}
          >
            <Icon name="fire" size={13} /> {sequencia}
          </Fato>
        )}
        {rec.notif && (
          <Fato title="Lembretes">
            <Icon name="bell" size={13} /> {rec.notif.inicio}–{rec.notif.fim}
          </Fato>
        )}
      </Fatos>
      <ContadorMeta
        texto={rec.negativa ? `${saldo} / ${rec.vezes}` : `${feitas} / ${rec.vezes}`}
        cor={corTexto}
        onMenos={() => onAjustar(rec.negativa ? 1 : -1)}
        onMais={() => onAjustar(rec.negativa ? -1 : 1)}
      />
    </CartaoMeta>
  );
}
