// Popup "Nova despesa" da pasta de gastos. Desde 02/10/2026 também lança
// receita (entrada) e compra parcelada: o valor digitado é o TOTAL da compra
// e cada parcela guarda total/N arredondado a centavos.
import { useState } from "react";
import { Botao } from "../../ui/Botao";
import { Campo, SelecaoLinha } from "../../ui/Campo";
import { Legenda } from "../../ui/Legenda";
import { Modal, ModalAcoes, ModalTexto } from "../../ui/Modal";
import { Toggle } from "../../ui/Segmentado";
import { Switch } from "../../ui/Switch";
import { brl, EXP_CATS, RECEITA_CATS } from "../../lib/expense";
import { localKey } from "../../lib/gamificacao";

type Campos = {
  desc: string;
  value: number;
  cat: string;
  date: string;
  time?: string;
  recorrente?: boolean;
  receita?: boolean;
  parcelas?: number;
};

export function NovaDespesa({ onCancel, onSalvar }: { onCancel: () => void; onSalvar: (f: Campos) => void }) {
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [date, setDate] = useState(localKey());
  const [time, setTime] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");

  const receita = tipo === "receita";
  const cats = receita ? RECEITA_CATS : EXP_CATS;
  const n = Math.max(2, Math.min(48, Math.round(+parcelas || 2)));
  const comParcelas = !receita && parcelado;

  function trocarTipo(t: "despesa" | "receita") {
    setTipo(t);
    setCat((t === "receita" ? RECEITA_CATS : EXP_CATS)[0]);
  }

  function salvar() {
    const v = +value;
    if (!desc.trim() || !v) return;
    onSalvar({
      desc: desc.trim(),
      value: comParcelas ? Math.round((v / n) * 100) / 100 : v,
      cat,
      date,
      time: time || undefined,
      ...(recorrente && !comParcelas ? { recorrente } : {}),
      ...(receita ? { receita } : {}),
      ...(comParcelas ? { parcelas: n } : {}),
    });
  }

  return (
    <Modal onFechar={onCancel} className="text-left">
      <ModalTexto className="mb-3">{receita ? "Nova receita" : "Nova despesa"}</ModalTexto>
      <Toggle
        larga
        className="mb-3"
        options={[
          { key: "despesa", label: "despesa" },
          { key: "receita", label: "receita" },
        ]}
        active={tipo}
        onSelect={trocarTipo}
      />
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
          placeholder={comParcelas ? "R$ total" : "R$"}
          className="min-w-0 flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <SelecaoLinha value={cat} onChange={(e) => setCat(e.target.value)}>
          {cats.map((c) => (
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
      {!comParcelas && (
        <Switch className="mt-3 text-base" checked={recorrente} onChange={setRecorrente}>
          Repetir todo mês neste dia
        </Switch>
      )}
      {!receita && !recorrente && (
        <Switch className="mt-3 text-base" checked={parcelado} onChange={setParcelado}>
          Compra parcelada
        </Switch>
      )}
      {comParcelas && (
        <div className="mt-2 flex items-center gap-2">
          <Campo
            variante="linha"
            type="number"
            inputMode="numeric"
            min={2}
            max={48}
            className="w-[70px] flex-none"
            aria-label="Número de parcelas"
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
          />
          <Legenda>
            parcelas{+value > 0 ? ` de ${brl(Math.round((+value / n) * 100) / 100)}` : ""}, uma por mês a partir desta
            data
          </Legenda>
        </div>
      )}
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
