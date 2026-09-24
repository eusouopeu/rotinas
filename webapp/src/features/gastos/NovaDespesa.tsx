// Popup "Nova despesa" da pasta de gastos.
import { useState } from "react";
import { Botao } from "../../ui/Botao";
import { Campo, SelecaoLinha } from "../../ui/Campo";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { EXP_CATS } from "../../lib/expense";

type Campos = { desc: string; value: number; cat: string; date: string; time?: string };

export function NovaDespesa({ onCancel, onSalvar }: { onCancel: () => void; onSalvar: (f: Campos) => void }) {
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");

  function salvar() {
    const v = +value;
    if (!desc.trim() || !v) return;
    onSalvar({ desc: desc.trim(), value: v, cat, date, time: time || undefined });
  }

  return (
    <Modal onFechar={onCancel} className="text-left">
      <ModalTexto className="mb-3">Nova despesa</ModalTexto>
      <Campo
        variante="modelo"
        type="text"
        placeholder="Descrição"
        autoFocus
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="mb-2 flex gap-2">
        <Campo
          variante="linha"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="R$"
          className="min-w-0 flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <SelecaoLinha value={cat} onChange={(e) => setCat(e.target.value)}>
          {EXP_CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelecaoLinha>
      </div>
      <div className="flex gap-2">
        <Campo
          variante="linha"
          type="date"
          className="min-w-0 flex-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Campo
          variante="linha"
          type="time"
          className="w-[110px] flex-none"
          title="Hora (opcional)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <ModalAcoes className="mt-[18px]">
        <Botao variante="neutro" tamanho="modal" onClick={onCancel}>
          Cancelar
        </Botao>
        <Botao variante="solido" tamanho="modal" onClick={salvar}>
          Adicionar
        </Botao>
      </ModalAcoes>
    </Modal>
  );
}
