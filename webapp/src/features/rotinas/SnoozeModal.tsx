// Snoozes (K_SNOOZES) — porta de agendaSnoozed/abrirSnoozeModal
// (index.html:5259-5290, 11023): pausa alertas/cumprimento por N dias.
// Estado reativo na store (addSnooze/resumeAgenda), ver useAppStore.ts.
import { useAppStore } from "../../store/useAppStore";
import type { Snooze } from "../../lib/types";
import { Botao } from "../../ui/Botao";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";

export function agendaSnoozed(snoozes: Snooze[]): Snooze | null {
  return snoozes.find((s) => Date.now() >= s.from && Date.now() <= s.to) || null;
}

const OPCOES = [
  ["1 dia", 1],
  ["3 dias", 3],
  ["7 dias", 7],
  ["30 dias", 30],
] as const;

export function SnoozeModal({ onClose }: { onClose: () => void }) {
  const addSnooze = useAppStore((s) => s.addSnooze);
  return (
    <Modal onFechar={onClose}>
      <ModalTexto>Pausar todos os alertas e o cumprimento por:</ModalTexto>
      <ModalAcoes className="flex-col">
        {OPCOES.map(([rotulo, dias]) => (
          <Botao
            key={dias}
            variante="solido"
            tamanho="modal"
            onClick={() => {
              addSnooze(dias);
              onClose();
            }}
          >
            {rotulo}
          </Botao>
        ))}
        <Botao variante="neutro" tamanho="modal" onClick={onClose}>
          Cancelar
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}
