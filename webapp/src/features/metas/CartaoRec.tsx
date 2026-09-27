// Cartão de meta recorrente (hábito N vezes ao dia/na semana; negativa =
// limite, com penalidade ao passar). O saldo de pontos vive no Boletim: aqui só
// nome, peso, frequência, lembretes e o contador (o saldo é a dica do peso).
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { fatorParaArea } from "../../lib/gamificacao";
import {
  metaRecCompleta,
  metaRecCumprido,
  metaRecExcesso,
  metaRecFeitas,
  metaRecSaldo,
  metaRecSequencia,
  virarPeriodoMetaRec,
} from "../../lib/metas";
import { metaRecPenalidadeUnidade, metaRecPontosBrutos, metaRecPontosUnidade } from "../../lib/scoring";
import type { GamificacaoState, MetaRecProgresso, MetaRecorrente } from "../../lib/types";
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

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function rotuloPeriodo(p: MetaRecProgresso): string {
  const iso = p.periodo.slice(p.periodo.indexOf(":") + 1);
  const [y, m, d] = iso.split("-").map(Number);
  const dd = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  return p.periodo.startsWith("semana:") ? `semana de ${dd}` : `${DIAS_CURTOS[new Date(y, m - 1, d).getDay()]} ${dd}`;
}

/** Últimos períodos da meta (recomendação 6 de 26/09/2026): cheio verde =
 *  cumprido, cheio vermelho = não cumprido, vazado = período atual em curso. */
function MiniCalendario({ rec }: { rec: MetaRecorrente }) {
  const v = virarPeriodoMetaRec(rec);
  const fechados = (v.historico || []).slice(-6);
  if (!fechados.length) return null;
  const atual = v.progresso!;
  const txt = (p: MetaRecProgresso) =>
    `${rotuloPeriodo(p)}: ${rec.negativa ? `${rec.vezes - p.feitas} de saldo` : `${p.feitas}/${rec.vezes}`}`;
  return (
    <div className="mt-1.5 flex items-center gap-1" aria-label="Últimos períodos">
      {fechados.map((p) => (
        <span
          key={p.periodo}
          title={txt(p)}
          className={cn("inline-block size-2.5 rounded-full", metaRecCumprido(rec, p.feitas) ? "bg-ok" : "bg-erro")}
        />
      ))}
      <span
        title={`${txt(atual)} (em curso)`}
        className={cn(
          "inline-block size-2.5 rounded-full border-[1.5px] border-line",
          !rec.negativa && metaRecCumprido(rec, atual.feitas) && "border-ok bg-ok"
        )}
      />
    </div>
  );
}

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
  // pontos do último toque no contador (recomendação 5): some sozinho
  const [aviso, setAviso] = useState<{ texto: string; positivo: boolean; n: number } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 1400);
    return () => clearTimeout(id);
  }, [aviso]);

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

  /** Pontos que o toque (+1/-1 em `feitas`) lança ou estorna no boletim. */
  function pontosDoToque(delta: 1 | -1): number {
    if (rec.negativa) {
      const pen = -metaRecPenalidadeUnidade(rec, gam.config) * fator;
      if (delta === 1) return feitas + 1 > rec.vezes ? -pen : 0;
      return feitas > rec.vezes ? pen : 0;
    }
    if (!rec.pontua) return 0;
    if (delta === 1) return metaRecPontosUnidade(rec, gam.config, feitas + 1) * fator;
    return feitas > 0 ? -metaRecPontosUnidade(rec, gam.config, feitas) * fator : 0;
  }

  function tocar(delta: 1 | -1) {
    const pts = pontosDoToque(delta);
    if (Math.abs(pts) >= 0.05) {
      const txt = (pts > 0 ? "+" : "−") + Math.abs(pts).toFixed(1).replace(".", ",");
      setAviso({ texto: txt, positivo: pts > 0, n: Date.now() });
    } else setAviso(null);
    onAjustar(delta);
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
        onMenos={() => tocar(rec.negativa ? 1 : -1)}
        onMais={() => tocar(rec.negativa ? -1 : 1)}
        aviso={aviso}
      />
      <MiniCalendario rec={rec} />
    </CartaoMeta>
  );
}
