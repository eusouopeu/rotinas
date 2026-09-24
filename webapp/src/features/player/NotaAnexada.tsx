// Nota anexada à rotina (r.notaId), leitura/edição por cima do player
// (openPlayerNotaOverlay, index.html:11570-11621). Textarea simples na
// edição — mesma razão do NoteEditor: só existe uma instância de edição
// "ao vivo" por vez e ela pertence à tela de Notas. Sem checklist clicável
// na leitura ainda (a preview read-only, index.html:11588-11589, não existe
// em nenhum lugar do React hoje — não é regressão desta rodada).
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Botao } from "../../ui/Botao";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { AreaTexto } from "../../ui/Campo";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { MdPreview } from "../../screens/NoteEditor";
import { useAppStore } from "../../store/useAppStore";

export function NotaAnexada({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const routine = useAppStore((s) => s.routines.find((r) => r.id === routineId));
  const notes = useAppStore((s) => s.notes);
  const updateNote = useAppStore((s) => s.updateNote);
  const [editando, setEditando] = useState(false);

  const nota = routine?.notaId ? notes.find((n) => n.id === routine.notaId) : null;
  const [rascunho, setRascunho] = useState(nota?.content || "");

  if (!nota) {
    return (
      <Modal onFechar={onClose}>
        <ModalTexto>Nenhuma nota anexada a esta rotina</ModalTexto>
        <ModalAcoes>
          <Botao variante="neutro" tamanho="modal" onClick={onClose}>
            Fechar
          </Botao>
        </ModalAcoes>
      </Modal>
    );
  }

  function alternarEdicao() {
    if (editando) updateNote(nota!.id, { content: rascunho });
    else setRascunho(nota!.content || "");
    setEditando((e) => !e);
  }

  return (
    <Modal
      posicao="topo"
      onFechar={onClose}
      className="flex max-h-[82vh] max-w-[460px] flex-col text-left desktop:max-w-[640px]"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-titulo text-[17px] font-semibold">
          {nota.title || "(sem título)"}
        </span>
        <BotaoIcone rotulo={editando ? "Ver formatado" : "Editar"} onClick={alternarEdicao}>
          <Icon name={editando ? "eye" : "notes"} size={editando ? 15 : 14} />
        </BotaoIcone>
        <BotaoIcone rotulo="Fechar" onClick={onClose}>
          <Icon name="xmark" size={14} />
        </BotaoIcone>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto text-lg leading-[1.55]">
        {editando ? (
          <AreaTexto
            className="min-h-[40vh]"
            placeholder="Escreva em markdown…"
            value={rascunho}
            onChange={(e) => {
              setRascunho(e.target.value);
              updateNote(nota.id, { content: e.target.value });
            }}
            autoFocus
          />
        ) : (
          <MdPreview text={nota.content || ""} />
        )}
      </div>
    </Modal>
  );
}
