// Pausa só desta rotina (recomendação 9 de 27/09/2026): lesão, viagem — o
// treino sai da agenda, do "hoje", da pontuação da semana, dos alarmes e das
// sequências, sem pausar as outras rotinas (a pausa geral da agenda continua
// no SnoozeModal).
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { pausaAtualOuFutura } from "../../lib/schedule";
import type { Routine } from "../../lib/types";
import { Botao } from "../../ui/Botao";
import { BotaoLink } from "../../ui/BotaoLink";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";

const OPCOES = [
  ["3 dias", 3],
  ["1 semana", 7],
  ["2 semanas", 14],
  ["1 mês", 30],
] as const;

export const ddmm = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

export function PausaRotina({ r }: { r: Routine }) {
  const pausarRotina = useAppStore((s) => s.pausarRotina);
  const retomarRotina = useAppStore((s) => s.retomarRotina);
  const [aberto, setAberto] = useState(false);
  const pausa = pausaAtualOuFutura(r);

  return (
    <div className="mt-1.5 font-sans text-xs text-sub">
      {pausa ? (
        <>
          Pausada {pausa.de === pausa.ate ? `em ${ddmm(pausa.de)}` : `de ${ddmm(pausa.de)} até ${ddmm(pausa.ate)}`} ·{" "}
          <BotaoLink className="py-0 text-xs" onClick={() => retomarRotina(r.id)}>
            retomar agora
          </BotaoLink>
        </>
      ) : (
        <BotaoLink className="py-0 text-xs" onClick={() => setAberto(true)}>
          pausar só esta rotina
        </BotaoLink>
      )}
      {aberto && (
        <Modal onFechar={() => setAberto(false)}>
          <ModalTexto>
            Pausar “{r.name}” a partir de hoje por: (sai da agenda, do boletim, dos alarmes e não quebra a sequência)
          </ModalTexto>
          <ModalAcoes className="flex-col">
            {OPCOES.map(([rotulo, dias]) => (
              <Botao
                key={dias}
                variante="solido"
                tamanho="modal"
                onClick={() => {
                  pausarRotina(r.id, dias);
                  setAberto(false);
                }}
              >
                {rotulo}
              </Botao>
            ))}
            <Botao variante="neutro" tamanho="modal" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
          </ModalAcoes>
        </Modal>
      )}
    </div>
  );
}
