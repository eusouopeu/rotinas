// Seleção de várias opções com a folha do próprio app, no lugar do <select>
// nativo (no Android abre o popup cinza e quadrado do sistema — pedido do
// Pedro, 03/10/2026, no filtro de categorias de Despesas). O gatilho tem o
// mesmo desenho do campo "linha"; a lista abre num Modal com uma linha por
// opção (círculo marcado = escolhida) e "Limpar" / "Pronto".
import { useState } from "react";
import { Icon } from "../components/Icon";
import { cn } from "../lib/cn";
import { Botao } from "./Botao";
import { Modal } from "./Modal";

type Props = {
  titulo: string;
  opcoes: readonly string[];
  valor: string[];
  onChange: (v: string[]) => void;
  /** Texto com nada escolhido (= todas). */
  vazio: string;
  className?: string;
};

export function MultiSelecao({ titulo, opcoes, valor, onChange, vazio, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const resumo = !valor.length ? vazio : valor.length <= 2 ? valor.join(", ") : `${valor.length} categorias`;
  const alternar = (o: string) => onChange(valor.includes(o) ? valor.filter((v) => v !== o) : [...valor, o]);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className={cn(
          "flex min-w-0 items-center justify-between gap-2 rounded-md border border-line bg-card px-2.5 py-[9px] text-left text-base text-ink",
          className
        )}
        onClick={() => setAberto(true)}
      >
        <span className={cn("truncate", !valor.length && "text-sub")}>{resumo}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {aberto && (
        <Modal onFechar={() => setAberto(false)}>
          <h3 className="mb-2 text-xl">{titulo}</h3>
          <div role="listbox" aria-multiselectable className="flex max-h-[55vh] flex-col overflow-y-auto">
            {opcoes.map((o) => {
              const sel = valor.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className="flex items-center gap-3 rounded-app-sm border-0 bg-transparent px-2 py-3 text-left text-lg text-ink active:bg-chip-neutro desktop:hover:bg-chip-neutro"
                  onClick={() => alternar(o)}
                >
                  <span
                    className={cn(
                      "flex size-6 flex-none items-center justify-center rounded-full border-2",
                      sel ? "border-caneta bg-caneta text-on-caneta" : "border-line-forte"
                    )}
                  >
                    {sel && <Icon name="check" size={14} />}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Botao variante="neutro" tamanho="modal" onClick={() => onChange([])}>
              Limpar
            </Botao>
            <Botao tamanho="modal" onClick={() => setAberto(false)}>
              Pronto
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}
