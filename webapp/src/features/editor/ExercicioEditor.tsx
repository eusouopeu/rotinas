import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { GRUPOS_MUSCULARES } from "../../lib/constants";
import type { Exercicio } from "../../lib/types";
import { Botao } from "../../ui/Botao";
import { Campo } from "../../ui/Campo";
import { CampoNumero } from "../../ui/CampoNumero";
import { Chip } from "../../ui/Chip";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { Toggle } from "../../ui/Segmentado";

/** Porta de abrirEditorExercicio (index.html:4216-4260) — cria ou edita um
 * item da biblioteca; "Excluir" só aparece editando um já existente. */
export function ExercicioEditorModal({
  ex,
  onClose,
  onSaved,
}: {
  ex: Exercicio | null;
  onClose: () => void;
  onSaved: (saved: Exercicio | null) => void;
}) {
  const upsertExercicio = useAppStore((s) => s.upsertExercicio);
  const deleteExercicio = useAppStore((s) => s.deleteExercicio);
  const [nome, setNome] = useState(ex?.nome || "");
  const [grupos, setGrupos] = useState<string[]>(ex?.grupos || []);
  const [peso, setPeso] = useState(ex?.pesoAtual || 0);
  const [composto, setComposto] = useState(ex?.composto !== false);

  function toggleGrupo(g: string) {
    setGrupos((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }
  function salvar() {
    const n = nome.trim();
    if (!n) return;
    const saved = upsertExercicio({ id: ex?.id, nome: n, grupos, pesoAtual: Math.max(0, peso || 0), composto });
    onSaved(saved);
  }
  function excluir() {
    if (!ex) return;
    deleteExercicio(ex.id);
    onSaved(null);
  }

  return (
    <Modal onFechar={onClose} className="text-left">
      <ModalTexto className="mb-2.5">{ex ? "Editar" : "Novo"} exercício</ModalTexto>
      <RotuloSecao className="my-1.5">Nome</RotuloSecao>
      <Campo
        variante="modelo"
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: Supino reto"
      />
      <RotuloSecao className="mt-3 mb-1.5">Grupos musculares (opcional)</RotuloSecao>
      <div className="flex flex-wrap gap-1.5">
        {GRUPOS_MUSCULARES.map((g) => (
          <Chip key={g} ativo={grupos.includes(g)} cor="var(--ink)" onClick={() => toggleGrupo(g)}>
            {g}
          </Chip>
        ))}
      </div>
      <RotuloSecao className="mt-3 mb-1.5">Tipo</RotuloSecao>
      {/* só muda o descanso entre séries: composto usa o descanso cheio da
          rotina, isolado usa 0,75x dele (lib/exercicios.ts) */}
      <Toggle
        options={[
          { key: "composto", label: "composto" },
          { key: "isolado", label: "isolado" },
        ]}
        active={composto ? "composto" : "isolado"}
        onSelect={(k) => setComposto(k === "composto")}
      />
      <RotuloSecao className="mt-3 mb-1.5">Carga atual (kg)</RotuloSecao>
      <CampoNumero
        className="w-[90px]"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={peso}
        onChange={(e) => setPeso(+e.target.value || 0)}
      />
      <ModalAcoes className="mt-[18px]">
        {ex && (
          <Botao variante="perigo" tamanho="modal" onClick={excluir}>
            Excluir
          </Botao>
        )}
        <Botao variante="neutro" tamanho="modal" onClick={onClose}>
          Cancelar
        </Botao>
        <Botao variante="solido" tamanho="modal" onClick={salvar}>
          Salvar
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}
