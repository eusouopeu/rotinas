// Cartão de meta recorrente (hábito N vezes ao dia/na semana; negativa =
// limite, com penalidade ao passar). O saldo de pontos vive no Boletim: aqui,
// pelo mockup de 02/10/2026, nome, xp de cada unidade, sequência "N – Mx",
// a semana em bolinhas e o contador − N / M + no rodapé.
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { fatorParaArea } from "../../lib/gamificacao";
import {
  metaRecFalhouOntem,
  metaDias,
  metaRecCompleta,
  metaRecExcesso,
  metaRecFeitas,
  metaRecQtdNoDia,
  metaRecSaldo,
  semanaDaMeta,
  sequenciaMetaRec,
} from "../../lib/metas";
import { fmtXp } from "../../lib/format";
import { metaRecPenalidadeUnidade, metaRecPontosBrutos, metaRecPontosUnidade } from "../../lib/scoring";
import type { GamificacaoState, MetaRecorrente } from "../../lib/types";
import { Etiqueta } from "../../ui/Etiqueta";
import { useAppStore } from "../../store/useAppStore";
import { Fato, Fatos } from "../../ui/Fatos";
import { CartaoMeta, NumeroMeta, RodapeContador, SemanaMeta, SeloSequencia } from "./CartaoMeta";

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
  const seq = sequenciaMetaRec(rec);
  const naoFalharDois = useAppStore((s) => s.naoFalharDois);
  // pontos do último toque no contador (recomendação 5): some sozinho
  const [aviso, setAviso] = useState<{ texto: string; positivo: boolean; n: number } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 1400);
    return () => clearTimeout(id);
  }, [aviso]);

  const freqTxt = `${rec.negativa ? "até " : ""}${rec.vezes}x ${rec.tipo === "semanal" ? "por semana" : "ao dia"}`;
  const semana = semanaDaMeta(metaDias(rec), (iso) => metaRecQtdNoDia(rec, iso));
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

  const estado: "ok" | "erro" | undefined = rec.negativa
    ? saldo < 0
      ? "erro"
      : saldo > 0
        ? "ok"
        : undefined
    : completa
      ? "ok"
      : undefined;
  // xp de cada unidade (Pedro, 02/10/2026): o próximo +1; meta negativa mostra
  // o desconto de cada vez além do limite
  const xp = rec.negativa
    ? -metaRecPenalidadeUnidade(rec, gam.config) * fator
    : rec.pontua
      ? metaRecPontosUnidade(rec, gam.config, feitas + 1) * fator
      : 0;
  const unidadeSeq = rec.tipo === "semanal" ? "semana" : "dia";

  return (
    <CartaoMeta
      setRef={setRef}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      estado={estado}
      corPonto={areaObj?.color || "var(--caneta)"}
      titulo={rec.titulo}
      rodape={
        <RodapeContador
          onMenos={() => tocar(rec.negativa ? 1 : -1)}
          onMais={() => tocar(rec.negativa ? -1 : 1)}
          meio={
            <>
              <NumeroMeta
                texto={rec.negativa ? `${saldo} / ${rec.vezes}` : `${feitas} / ${rec.vezes}`}
                ok={estado === "ok"}
                erro={estado === "erro"}
              />
              <span
                className={
                  aviso
                    ? `font-sans text-sm font-semibold tabular-nums ${aviso.positivo ? "text-ok" : "text-erro"}`
                    : "font-sans text-sm text-sub"
                }
                aria-live="polite"
                title={freqTxt}
              >
                {aviso ? aviso.texto : rec.tipo === "semanal" ? "na semana" : "hoje"}
              </span>
            </>
          }
        />
      }
      onEditar={onEditar}
      onExcluir={onExcluir}
      onDuplicar={onDuplicar}
    >
      <Fatos className="gap-x-2 gap-y-1.5">
        {xp !== 0 && (
          <Fato destaque title={pesoTitle || undefined}>
            <Icon name="ticket" size={14} /> {xp < 0 ? "−" : ""}
            {fmtXp(Math.abs(xp))} xp
          </Fato>
        )}
        <SeloSequencia
          n={seq.n}
          execucoes={seq.execucoes}
          title={`${seq.n} ${unidadeSeq}${seq.n !== 1 ? "s" : ""} seguido${seq.n !== 1 ? "s" : ""} cumprindo a meta · ${seq.execucoes} vez${seq.execucoes !== 1 ? "es" : ""} nesse tempo`}
        />
        {naoFalharDois && metaRecFalhouOntem(rec) && (
          <Etiqueta
            tom="area"
            cor="var(--erro)"
            className="text-erro"
            title="Ontem ficou abaixo da meta: não deixe falhar dois dias seguidos"
          >
            <Icon name="exclamationCircle" size={13} /> não falhar hoje
          </Etiqueta>
        )}
        {rec.notif && (
          <Etiqueta title="Lembretes">
            <Icon name="bell" size={13} /> {rec.notif.inicio}–{rec.notif.fim}
          </Etiqueta>
        )}
      </Fatos>
      <SemanaMeta dias={semana} />
    </CartaoMeta>
  );
}
