// Faixa de progresso das etapas e os botões de baixo do player (voltar,
// pausar/concluir/pular, adiar) por tipo de etapa, mais a fileira "voltar
// série / não fazer".
import { Icon } from "../../components/Icon";
import { BotaoRedondo } from "../../ui/BotaoRedondo";
import { cn } from "../../lib/cn";

type Etapa = { id: string; type: string; seconds?: number; isRest?: boolean };

/** Uma barrinha por etapa: cheia se já passou, enchendo na atual (tempo). */
export function TrilhaEtapas({ etapas, atual, restante }: { etapas: Etapa[]; atual: number; restante: number }) {
  return (
    <div className="mb-1 flex w-full gap-[5px] px-1 paisagem:mb-0">
      {etapas.map((s, i) => {
        const pct =
          i < atual
            ? 100
            : i === atual && s.type === "timer"
              ? (1 - Math.max(restante, 0) / (s.seconds || 1)) * 100
              : 0;
        return (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-[2px] bg-line">
            <div className={cn("h-full", s.isRest ? "bg-ok" : "bg-caneta")} style={{ width: `${pct}%` }} />
          </div>
        );
      })}
    </div>
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

const PULAR =
  "rounded-[10px] border-[1.5px] border-dashed border-line bg-transparent px-4 py-2 font-sans text-[13.5px] text-sub";

export function LinhaPular({
  podeVoltarSerie,
  podeNaoFazer,
  onVoltarSerie,
  onNaoFazer,
}: {
  podeVoltarSerie: boolean;
  podeNaoFazer: boolean;
  onVoltarSerie: () => void;
  onNaoFazer: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap justify-center gap-2.5 pt-2.5 pb-1 paisagem:pt-1 paisagem:pb-0.5">
      {podeVoltarSerie && (
        <button className={PULAR} title="Reabre só a última série registrada" onClick={onVoltarSerie}>
          <Icon name="arrowLeft" size={13} /> voltar série
        </button>
      )}
      {podeNaoFazer && (
        <button className={PULAR} title="Encerrar sem concluir e sem pontuar" onClick={onNaoFazer}>
          não fazer
        </button>
      )}
    </div>
  );
}
