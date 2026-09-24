import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAppStore } from "../../store/useAppStore";
import { presetsPorGrupo } from "../../lib/exercicioPresets";
import type { Exercicio } from "../../lib/types";
import { BotaoIcone } from "../../ui/BotaoIcone";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalTexto } from "../../ui/Modal";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { PastaTile } from "../modelos/PastaTile";
import { ExercicioEditorModal } from "./ExercicioEditor";

/** Porta de abrirEscolhaExercicioEtapa (index.html:4109-4162) — lista a
 * biblioteca pra escolher o exercício de uma etapa; "editar" reabre o
 * picker depois de salvar, "+ Novo exercício" já seleciona o criado. */
export function ExercicioPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (ex: Exercicio) => void }) {
  const exercicios = useAppStore((s) => s.exercicios);
  const upsertExercicio = useAppStore((s) => s.upsertExercicio);
  const [editorFor, setEditorFor] = useState<{ ex: Exercicio | null } | null>(null);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const lista = [...exercicios].sort((a, b) => a.nome.localeCompare(b.nome));
  const nomesExistentes = new Set(exercicios.map((e) => e.nome.trim().toLowerCase()));
  const grupos = presetsPorGrupo();

  function adicionarSugestao(nome: string, grupo: string, composto: boolean) {
    const saved = upsertExercicio({ nome, grupos: [grupo], pesoAtual: 0, composto });
    onClose();
    onPick(saved);
  }

  if (editorFor) {
    return (
      <ExercicioEditorModal
        ex={editorFor.ex}
        onClose={() => setEditorFor(null)}
        onSaved={(saved) => {
          setEditorFor(null);
          if (saved) onPick(saved);
        }}
      />
    );
  }

  return (
    <Modal onFechar={onClose} className="max-h-[80vh] overflow-y-auto text-left">
      <div className="mb-2.5 flex items-center justify-between">
        <ModalTexto className="m-0">Escolher exercício</ModalTexto>
        <BotaoIcone rotulo="Fechar" onClick={onClose}>
          <Icon name="xmark" size={14} />
        </BotaoIcone>
      </div>
      {lista.length ? (
        <div className="flex max-h-[34vh] flex-col gap-1.5 overflow-y-auto">
          {lista.map((ex) => (
            <div
              key={ex.id}
              className="flex w-full flex-row items-center justify-between gap-1.5 rounded-app-sm border-[1.5px] border-line bg-card-2 px-[11px] py-[9px] text-left text-ink active:scale-[0.985] active:bg-card"
            >
              <button
                className="flex-1 overflow-hidden border-0 bg-transparent p-0 text-left text-ellipsis whitespace-nowrap [color:inherit] [font:inherit]"
                onClick={() => {
                  onClose();
                  onPick(ex);
                }}
              >
                <span className="text-base">{ex.nome}</span>
                {ex.grupos.length > 0 && <span className="text-sm text-sub"> · {ex.grupos.join(", ")}</span>}
              </button>
              <BotaoIcone rotulo="Editar" className="size-7 flex-none" onClick={() => setEditorFor({ ex })}>
                <Icon name="notes" size={12} />
              </BotaoIcone>
            </div>
          ))}
        </div>
      ) : (
        <Legenda className="mb-2.5">Nenhum exercício cadastrado ainda.</Legenda>
      )}
      <PastaTile
        icone="trophy"
        iconeTam={16}
        rotulo="+ Novo exercício"
        className="mt-3 aspect-auto w-full flex-row gap-2 p-3"
        onClick={() => setEditorFor({ ex: null })}
      />

      <RotuloSecao className="mt-3.5 mb-1.5 cursor-pointer" onClick={() => setSugestoesAbertas((v) => !v)}>
        Sugestões por grupo muscular {sugestoesAbertas ? "▲" : "▼"}
      </RotuloSecao>
      {sugestoesAbertas && (
        <div>
          {grupos.map(({ grupo, itens }) => (
            <div key={grupo} className="mb-2.5">
              <div className="mb-1 text-sm text-sub">{grupo}</div>
              {itens.map((it) => {
                const jaExiste = nomesExistentes.has(it.nome.trim().toLowerCase());
                return (
                  /* lista de leitura: sem moldura por item nem por botão —
                     são dezenas de linhas e a carga visual dominava */
                  <div
                    key={it.nome}
                    className="flex items-center justify-between gap-1.5 px-0.5 py-[7px] [&+&]:border-t [&+&]:border-line"
                  >
                    <span className="flex-1">{it.nome}</span>
                    {jaExiste ? (
                      <span className="text-sm text-sub">já na biblioteca</span>
                    ) : (
                      <BotaoIcone
                        rotulo="Adicionar"
                        semBorda
                        className="size-7 flex-none"
                        onClick={() => adicionarSugestao(it.nome, grupo, it.composto)}
                      >
                        <Icon name="plus" size={14} />
                      </BotaoIcone>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
