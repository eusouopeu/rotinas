// Lista dos gastos agrupada por mês: barras por categoria e as linhas (tocar
// para editar, ✕ para apagar).
import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Botao } from "../../ui/Botao";
import { BotaoApagar } from "../../ui/BotaoApagar";
import { Campo, SelecaoLinha } from "../../ui/Campo";
import { Cartao } from "../../ui/Cartao";
import { EstadoVazio } from "../../ui/EstadoVazio";
import { CelNegrito, CelNota, LinhaTabela } from "../../ui/LinhaTabela";
import { LinhaBarra } from "../../ui/LinhaBarra";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { EXP_CATS, agruparPorMes, brl, catColor } from "../../lib/expense";
import type { ExpenseDoc } from "../../lib/types";

function EdicaoGasto({
  e,
  onSave,
  onCancel,
}: {
  e: ExpenseDoc;
  onSave: (patch: Partial<ExpenseDoc>) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState(e.desc);
  const [value, setValue] = useState(String(e.value));
  const [cat, setCat] = useState(e.cat);
  const [date, setDate] = useState(e.date);
  const [time, setTime] = useState(e.time || "");
  return (
    <LinhaTabela className="flex-wrap gap-1.5">
      <Campo variante="modelo" type="text" value={desc} onChange={(ev) => setDesc(ev.target.value)} />
      <Campo
        variante="linha"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="w-[90px]"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
      />
      <SelecaoLinha value={cat} onChange={(ev) => setCat(ev.target.value)}>
        {EXP_CATS.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </SelecaoLinha>
      <Campo
        variante="linha"
        type="date"
        className="w-[130px]"
        value={date}
        onChange={(ev) => setDate(ev.target.value)}
      />
      <Campo
        variante="linha"
        type="time"
        className="w-[100px]"
        value={time}
        onChange={(ev) => setTime(ev.target.value)}
      />
      <Botao
        className="flex-1 px-3.5 py-2"
        onClick={() => {
          const v = +value;
          if (!desc.trim() || !v) return;
          onSave({ desc: desc.trim(), value: v, cat, date, time: time || undefined });
        }}
      >
        <Icon name="check" size={14} />
      </Botao>
      <BotaoApagar onClick={onCancel} />
    </LinhaTabela>
  );
}

type Props = {
  docs: ExpenseDoc[];
  onDelete: (id: string) => void;
  onSave: (id: string, patch: Partial<ExpenseDoc>) => void;
};

export function ListaGastos({ docs, onDelete, onSave }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const grupos = agruparPorMes(docs);
  if (docs.length === 0)
    return <EstadoVazio className="min-h-[25vh]" texto="Registre um gasto pelo botão + no canto da tela." />;
  return (
    <>
      {grupos.map((g) => (
        <div key={g.chave}>
          <RotuloSecao>
            {g.chave.slice(5, 7)}/{g.chave.slice(0, 4)} — total {brl(g.total)}
          </RotuloSecao>
          <Cartao className="mb-1.5">
            {g.porCategoria.map((c) => (
              <LinhaBarra
                key={c.cat}
                rotulo={c.cat}
                valor={brl(c.valor)}
                pct={Math.max(3, c.pct)}
                cor={catColor(c.cat)}
              />
            ))}
          </Cartao>
          <Cartao className="mt-1.5 mb-1.5">
            {g.itens.map((e) =>
              editId === e.id ? (
                <EdicaoGasto
                  key={e.id}
                  e={e}
                  onCancel={() => setEditId(null)}
                  onSave={(patch) => {
                    onSave(e.id, patch);
                    setEditId(null);
                  }}
                />
              ) : (
                <LinhaTabela key={e.id}>
                  <CelNota className="w-11">
                    {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
                  </CelNota>
                  <span className="flex-1 cursor-pointer" title="Tocar para editar" onClick={() => setEditId(e.id)}>
                    {e.desc}
                    <br />
                    <span className="font-sans text-sm text-sub">
                      {e.cat}
                      {e.time ? " · " + e.time : ""}
                    </span>
                  </span>
                  <CelNegrito status="pontual">{brl(e.value)}</CelNegrito>
                  <BotaoApagar onClick={() => onDelete(e.id)} />
                </LinhaTabela>
              )
            )}
          </Cartao>
        </div>
      ))}
    </>
  );
}
