// Faixa de progresso das etapas e os botões de baixo do player (voltar,
// pausar/concluir/pular, adiar) por tipo de etapa, mais a fileira "voltar
// série / não fazer".
import { Icon } from "../../components/Icon";
import { BotaoRedondo } from "../../ui/BotaoRedondo";
import { cn } from "../../lib/cn";

type Etapa = { id: string; type: string; seconds?: number; isRest?: boolean };
type Feita = { skipped?: boolean; naoFeita?: boolean } | undefined;

/** Uma barrinha por etapa: cheia se já passou (cinza se pulada, vermelha se
 * "não fazer"), enchendo na atual (tempo). Tocar abre o painel de etapas. */
export function TrilhaEtapas({
  etapas,
  feitas,
  atual,
  restante,
  onAbrir,
}: {
  etapas: Etapa[];
  feitas: Feita[];
  atual: number;
  restante: number;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Progresso das etapas"
      className="mb-1 flex w-full cursor-pointer gap-[5px] border-0 bg-transparent px-1 py-2 paisagem:mb-0 paisagem:py-1"
      onClick={onAbrir}
    >
      {etapas.map((s, i) => {
        const pct =
          i < atual
            ? 100
            : i === atual && s.type === "timer"
              ? (1 - Math.max(restante, 0) / (s.seconds || 1)) * 100
              : 0;
        const f = feitas[i];
        const cor = f?.naoFeita ? "bg-erro" : f?.skipped ? "bg-sub" : s.isRest ? "bg-ok" : "bg-caneta";
        return (
          <span
            key={s.id}
            className={cn(
              "h-1.5 flex-1 overflow-hidden rounded-full bg-line",
              i === atual && "ring-2 ring-caneta-soft"
            )}
          >
            <span className={cn("block h-full", cor)} style={{ width: `${pct}%` }} />
          </span>
        );
      })}
    </button>
  );
}

const FAIXA = "flex w-full items-center justify-center gap-[22px] paisagem:gap-3.5";
const DICA_ADIAR = "Adiar: vai para depois da pausa da próxima etapa";

type Comuns = { podeAdiar: boolean; onAnterior: () => void; onAdiar: () => void };

function Anterior({ onAnterior }: { onAnterior: () => void }) {
  return (
    <BotaoRedondo rotulo="Etapa anterior" onClick={onAnterior}>
      <Icon name="arrowLeft" size={15} />
    </BotaoRedondo>
  );
}

function Adiar({ podeAdiar, onAdiar, className }: { podeAdiar: boolean; onAdiar: () => void; className?: string }) {
  return (
    <BotaoRedondo
      rotulo="Adiar etapa"
      dica={DICA_ADIAR}
      disabled={!podeAdiar}
      className={cn(!podeAdiar && "opacity-35", className)}
      onClick={onAdiar}
    >
      <Icon name="arrowUturnRight" size={14} />
    </BotaoRedondo>
  );
}

export function ControlesTempo({
  pausado,
  estourou,
  onReiniciar,
  onPausar,
  onConcluir,
  ...c
}: Comuns & {
  pausado: boolean;
  estourou: boolean;
  onReiniciar: () => void;
  onPausar: () => void;
  onConcluir: () => void;
}) {
  const pequeno = "paisagem:size-[42px]"; // com cinco botões na fileira, no celular deitado
  return (
    <div className={cn(FAIXA, "gap-2.5 paisagem:gap-1.5")}>
      <BotaoRedondo rotulo="Etapa anterior" className={pequeno} onClick={c.onAnterior}>
        <Icon name="arrowLeft" size={15} />
      </BotaoRedondo>
      <BotaoRedondo rotulo="Reiniciar o temporizador da etapa" className={pequeno} onClick={onReiniciar}>
        <Icon name="arrowPath" size={15} />
      </BotaoRedondo>
      <BotaoRedondo
        rotulo={pausado ? "Continuar" : "Pausar"}
        tamanho="grande"
        cor="destaque"
        className={pequeno}
        onClick={onPausar}
      >
        <Icon name={pausado ? "play" : "pause"} size={22} />
      </BotaoRedondo>
      <BotaoRedondo rotulo="Concluir etapa" cor="ok" pulso={estourou} className={pequeno} onClick={onConcluir}>
        <Icon name="check" size={14} />
      </BotaoRedondo>
      <Adiar podeAdiar={c.podeAdiar} onAdiar={c.onAdiar} className={pequeno} />
    </div>
  );
}

export function ControlesExercicio({
  descansando,
  onConcluirSerie,
  onPularDescanso,
  ...c
}: Comuns & { descansando: boolean; onConcluirSerie: () => void; onPularDescanso: () => void }) {
  return (
    <div className={FAIXA}>
      <Anterior onAnterior={c.onAnterior} />
      {descansando ? (
        <BotaoRedondo rotulo="Pular descanso" tamanho="grande" cor="ok" onClick={onPularDescanso}>
          <Icon name="play" size={20} />
        </BotaoRedondo>
      ) : (
        <BotaoRedondo rotulo="Concluir série" tamanho="grande" cor="ok" onClick={onConcluirSerie}>
          <Icon name="check" size={14} />
        </BotaoRedondo>
      )}
      <Adiar podeAdiar={c.podeAdiar} onAdiar={c.onAdiar} />
    </div>
  );
}

export function ControlesSimples({ onConcluir, ...c }: Comuns & { onConcluir: () => void }) {
  return (
    <div className={FAIXA}>
      <Anterior onAnterior={c.onAnterior} />
      <BotaoRedondo rotulo="Concluir etapa" tamanho="grande" cor="ok" onClick={onConcluir}>
        <Icon name="check" size={14} />
      </BotaoRedondo>
      <Adiar podeAdiar={c.podeAdiar} onAdiar={c.onAdiar} />
    </div>
  );
}

const PULAR = "rounded-[10px] border border-dashed border-line bg-transparent px-4 py-2 font-sans text-base text-sub";

export function LinhaPular({
  podeVoltarSerie,
  podeNaoFazer,
  onVoltarSerie,
  onNaoFazer,
  onPular,
}: {
  podeVoltarSerie: boolean;
  podeNaoFazer: boolean;
  onVoltarSerie: () => void;
  onNaoFazer: () => void;
  onPular: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap justify-center gap-2.5 pt-2.5 pb-1 paisagem:pt-1 paisagem:pb-0.5">
      {podeVoltarSerie && (
        <button className={PULAR} title="Reabre só a última série registrada" onClick={onVoltarSerie}>
          <Icon name="arrowLeft" size={13} /> voltar série
        </button>
      )}
      {podeNaoFazer && (
        <button className={PULAR} title="Pular: fica no histórico como pulada, sem pontuar" onClick={onPular}>
          pular
        </button>
      )}
      {podeNaoFazer && (
        <button
          className={PULAR}
          title="Encerrar sem concluir e sem pontuar — volta hoje como pendente"
          onClick={onNaoFazer}
        >
          não fazer
        </button>
      )}
    </div>
  );
}
