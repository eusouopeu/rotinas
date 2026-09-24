// Uma coluna de prós e contras: título colorido com a soma dos pesos, os
// argumentos (texto editável ao tocar, peso de 1 a 5, apagar) e o campo de novo.
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Botao } from "../../ui/Botao";
import { BotaoApagar } from "../../ui/BotaoApagar";
import { AreaTexto } from "../../ui/Campo";
import { CampoNovoItem } from "../../ui/CampoNovoItem";
import { Cartao } from "../../ui/Cartao";
import { Legenda } from "../../ui/Legenda";
import { LinhaTabela } from "../../ui/LinhaTabela";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { cn } from "../../lib/cn";

type Item = { id: string; text: string; w: number };

/** `tom`: classes de cor do lado (ex.: "text-ok" e "bg-ok"). */
type Props = {
  label: string;
  tom: { texto: string; fundo: string };
  items: Item[];
  onAdd: (text: string) => void;
  onSetWeight: (id: string, w: number) => void;
  onDelete: (id: string) => void;
  onEditText: (id: string, text: string) => void;
};

export function ColunaArgumentos({ label, tom, items, onAdd, onSetWeight, onDelete, onEditText }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const soma = items.reduce((a, i) => a + i.w, 0);

  return (
    <>
      <RotuloSecao className={tom.texto}>
        {label} · soma {soma}
      </RotuloSecao>
      <Cartao className="mb-1.5">
        {items.length === 0 ? (
          <Legenda>vazio</Legenda>
        ) : (
          items.map((i) =>
            editingId === i.id ? (
              <LinhaTabela key={i.id}>
                <AreaTexto
                  rows={1}
                  className="mb-0 flex-1"
                  defaultValue={i.text}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const v = (e.target as HTMLTextAreaElement).value.trim();
                    if (v) onEditText(i.id, v);
                    setEditingId(null);
                  }}
                  id={`pc-edit-${i.id}`}
                />
                <Botao
                  className="flex-1 px-3.5 py-2"
                  onClick={() => {
                    const ta = document.getElementById(`pc-edit-${i.id}`) as HTMLTextAreaElement | null;
                    const v = ta?.value.trim();
                    if (v) onEditText(i.id, v);
                    setEditingId(null);
                  }}
                >
                  <Icon name="check" size={14} />
                </Botao>
              </LinhaTabela>
            ) : (
              <LinhaTabela key={i.id}>
                <span
                  className="min-w-0 flex-1 cursor-pointer break-words"
                  title="Tocar para editar"
                  onClick={() => setEditingId(i.id)}
                >
                  {i.text}
                </span>
                <span className="flex shrink-0 gap-[3px]">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <span
                      key={w}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-[6px] border-[1.5px] border-line font-sans text-sm text-sub",
                        i.w === w && cn(tom.fundo, "border-transparent text-on-caneta")
                      )}
                      onClick={() => onSetWeight(i.id, w)}
                    >
                      {w}
                    </span>
                  ))}
                </span>
                <BotaoApagar onClick={() => onDelete(i.id)} />
              </LinhaTabela>
            )
          )
        )}
        <div>
          <CampoNovoItem
            placeholder="+ argumento (Enter, peso 3 padrão)"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = (e.target as HTMLInputElement).value.trim();
              if (!v) return;
              onAdd(v);
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </div>
      </Cartao>
    </>
  );
}
