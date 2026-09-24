// Porta de abrirPopupTarefa (index.html:5181-5256) — popup completo de tarefa do
// dia: texto, horário opcional, peso e área da roda (quando ativa). Sem o
// crédito de pontos do cartão (ver upsertDiaKanbanCard).
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { horaParaMin } from "../../lib/agenda";
import { formatHM } from "../../lib/schedule";
import type { DiaKanbanCard, Tag } from "../../lib/types";
import { Botao } from "../../ui/Botao";
import { Campo } from "../../ui/Campo";
import { TimeKbInput } from "../../ui/CamposTexto";
import { Chip } from "../../ui/Chip";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";

const PESOS = [
  { key: "baixo", label: "Baixo" },
  { key: "medio", label: "Médio" },
  { key: "alto", label: "Alto" },
] as const;

type Props = { iso: string; card: DiaKanbanCard | null; iniMin?: number | null; onClose: () => void };

export function TarefaPopup({ iso, card, iniMin, onClose }: Props) {
  const gam = useAppStore((s) => s.gam);
  const upsertDiaKanbanCard = useAppStore((s) => s.upsertDiaKanbanCard);
  const deleteDiaKanbanCard = useAppStore((s) => s.deleteDiaKanbanCard);
  const [text, setText] = useState(card?.text || "");
  // horário do vão clicado na grade: 1h de duração, mesma regra do legado
  const [hIni, setHIni] = useState(card?.hIni || (iniMin != null ? formatHM(iniMin) : ""));
  const [hFim, setHFim] = useState(card?.hFim || (iniMin != null ? formatHM(Math.min(24 * 60, iniMin + 60)) : ""));
  const [tag, setTag] = useState<Tag>((card?.tagValor as Tag) || "baixo");
  const [eixo, setEixo] = useState<string | null>(card?.eixo ?? null);
  const rodaAtiva = !!gam.config.roda.ativa;

  function salvar() {
    if (!text.trim()) return;
    const fimOk = hIni && hFim && (horaParaMin(hFim) ?? 0) > (horaParaMin(hIni) ?? 0) ? hFim : "";
    upsertDiaKanbanCard(iso, { id: card?.id, text, hIni, hFim: fimOk, tagValor: tag, eixo });
    onClose();
  }

  return (
    <Modal onFechar={onClose} className="text-left">
      <ModalTexto className="mb-2.5">
        {card ? "Editar" : "Nova"} tarefa · {iso.slice(8, 10)}/{iso.slice(5, 7)}
      </ModalTexto>
      <Campo
        variante="modelo"
        type="text"
        placeholder="O que precisa ser feito?"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && salvar()}
      />
      <RotuloSecao className="mt-3 mb-1">Horário (opcional)</RotuloSecao>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TimeKbInput value={hIni} onChange={setHIni} label="Hora de início" />
          <Legenda>até</Legenda>
          <TimeKbInput value={hFim} onChange={setHFim} label="Hora de término" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <RotuloSecao className="m-0">Peso</RotuloSecao>
        <Toggle quebra options={[...PESOS]} active={tag} onSelect={setTag} />
      </div>
      {rodaAtiva && (
        <>
          <RotuloSecao className="mt-3 mb-1">Área</RotuloSecao>
          <div className="flex flex-1 flex-wrap gap-1.5">
            <Chip ativo={!eixo} cor="var(--sub)" onClick={() => setEixo(null)}>
              sem área
            </Chip>
            {gam.config.roda.areas.map((a) => (
              <Chip key={a.id} ativo={eixo === a.id} cor={a.color} onClick={() => setEixo(a.id)}>
                {a.label}
              </Chip>
            ))}
          </div>
        </>
      )}
      <ModalAcoes className="mt-4 justify-between">
        {card ? (
          // botão cru de propósito: no legado ele nunca recebeu estilo (só a cor)
          <button
            className="flex-1 p-[13px] text-lg text-erro"
            title="Excluir tarefa"
            aria-label="Excluir tarefa"
            onClick={() => {
              deleteDiaKanbanCard(card.id);
              onClose();
            }}
          >
            <Icon name="trash" size={15} />
          </button>
        ) : (
          <Botao variante="neutro" tamanho="modal" onClick={onClose}>
            Cancelar
          </Botao>
        )}
        <Botao variante="solido" tamanho="modal" onClick={salvar}>
          {card ? "Salvar" : "Criar"}
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}
