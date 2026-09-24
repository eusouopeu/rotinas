// Painel "Etapas" do player (openPlayerStepsOverlay, index.html:11678-11759) —
// lista TODAS as etapas da rotina em andamento, agrupando tarefa + pausa dela.
// Reordenar só é liberado da etapa atual em diante — mexer no que já foi
// executado reescreveria o histórico (stepActuals é indexado por posição).
import { Icon } from "../../components/Icon";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { BotaoMover } from "../../ui/BotaoMover";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalTexto } from "../../ui/Modal";
import { useAppStore } from "../../store/useAppStore";
import { agruparEtapasPlayer, type PlayerState } from "../../lib/player";
import { fmtTime } from "../../lib/format";
import { cn } from "../../lib/cn";

type Estado = "feita" | "atual" | "futura";

function LinhaEtapa({
  estado,
  numero,
  nome,
  duracao,
  podeSubir,
  podeDescer,
  onSubir,
  onDescer,
}: {
  estado: Estado;
  numero: number;
  nome: string;
  duracao: string;
  podeSubir: boolean;
  podeDescer: boolean;
  onSubir: () => void;
  onDescer: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[9px] border-b-[1.5px] border-line px-0.5 py-[9px]",
        estado === "atual" && "rounded-[10px] bg-caneta-soft px-1.5"
      )}
    >
      <span
        className={cn("w-[22px] flex-none text-center font-sans text-sm text-sub", estado === "feita" && "text-ok")}
      >
        {estado === "feita" ? <Icon name="check" size={14} /> : numero}
      </span>
      <span
        className={cn(
          "min-w-0 flex-auto text-[14.5px]",
          estado === "feita" && "text-sub line-through",
          estado === "atual" && "font-semibold text-caneta"
        )}
      >
        {nome}
      </span>
      <span className={cn("flex-none font-sans text-[11.5px] text-sub", estado === "feita" && "line-through")}>
        {duracao}
      </span>
      <span className="flex shrink-0 gap-1">
        <BotaoMover rotulo="Subir etapa" disabled={!podeSubir} onClick={onSubir}>
          <Icon name="arrowUp" size={14} />
        </BotaoMover>
        <BotaoMover rotulo="Descer etapa" disabled={!podeDescer} onClick={onDescer}>
          <Icon name="arrowDown" size={14} />
        </BotaoMover>
      </span>
    </div>
  );
}

export function PainelEtapas({ playerState, onClose }: { playerState: PlayerState; onClose: () => void }) {
  const reordenarEtapasPlayer = useAppStore((s) => s.reordenarEtapasPlayer);
  const grupos = agruparEtapasPlayer(playerState.steps);
  const grupoAtual = grupos.findIndex((g) => g.reais.includes(playerState.idx));
  const restantes = playerState.steps
    .slice(playerState.idx)
    .filter((s) => s.type === "timer")
    .reduce((soma, s) => soma + (s.seconds || 0), 0);

  return (
    <Modal
      posicao="topo"
      onFechar={onClose}
      className="flex max-h-[82vh] max-w-[460px] flex-col text-left desktop:max-w-[640px]"
    >
      <div className="mb-1 flex items-center justify-between">
        <ModalTexto className="m-0">Etapas — {playerState.routineName}</ModalTexto>
        <BotaoIcone rotulo="Fechar" onClick={onClose}>
          <Icon name="xmark" size={14} />
        </BotaoIcone>
      </div>
      <Legenda className="mb-2.5">
        {playerState.idx + 1} de {playerState.steps.length} · faltam ~{fmtTime(restantes)}. Só dá para reordenar da
        etapa atual em diante.
      </Legenda>
      <div className="flex-auto overflow-y-auto desktop:grid desktop:grid-cols-2 desktop:content-start desktop:items-start desktop:gap-3">
        {grupos.map((g, gi) => {
          const s = g.step;
          const dur =
            s.type === "timer"
              ? fmtTime(s.seconds || 0)
              : s.type === "exercicio"
                ? `${s.sets || 1}x${s.reps || ""}`
                : "livre";
          return (
            <LinhaEtapa
              key={s.id}
              estado={gi < grupoAtual ? "feita" : gi === grupoAtual ? "atual" : "futura"}
              numero={g.reais[0] + 1}
              nome={s.name}
              duracao={dur}
              podeSubir={gi > grupoAtual + 1}
              podeDescer={gi > grupoAtual && gi < grupos.length - 1}
              onSubir={() => reordenarEtapasPlayer(gi, gi - 1)}
              onDescer={() => reordenarEtapasPlayer(gi, gi + 1)}
            />
          );
        })}
      </div>
    </Modal>
  );
}
