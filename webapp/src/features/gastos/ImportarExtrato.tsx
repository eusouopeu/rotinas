// Porta de paintImport (index.html:9126-9171) — conferência de colunas do
// extrato com prévia antes de importar.
import { useState } from "react";
import { Botao } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { SelecaoLinha } from "../../ui/Campo";
import { Legenda } from "../../ui/Legenda";
import { CelNegrito, CelNota, LinhaTabela } from "../../ui/LinhaTabela";
import { RotuloSecao } from "../../ui/RotuloSecao";
import { brl, computeImportPreview, type ImportSign, type ImportState } from "../../lib/expense";

type Props = { initial: ImportState; onCancel: () => void; onConfirm: (st: ImportState) => void };

function Linha({ rotulo, className, children }: { rotulo: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className ? `flex gap-2 ${className}` : "flex gap-2"}>
      <span className="w-20 text-md text-sub">{rotulo}</span>
      {children}
    </div>
  );
}

export function ImportarExtrato({ initial, onCancel, onConfirm }: Props) {
  const [st, setSt] = useState(initial);
  const g = st.guess;
  const { parsed, skipped } = computeImportPreview(st);
  const totalPrev = parsed.reduce((a, e) => a + e.value, 0);
  const coluna = (value: number, onChange: (i: number) => void) => (
    <SelecaoLinha value={value} onChange={(ev) => onChange(+ev.target.value)}>
      {Array.from({ length: g.ncol }, (_, i) => (
        <option key={i} value={i}>
          coluna {i + 1}
          {g.header && g.header[i] ? " · " + g.header[i].slice(0, 16) : ""}
        </option>
      ))}
    </SelecaoLinha>
  );
  return (
    <>
      <RotuloSecao>Importar extrato — conferir colunas</RotuloSecao>
      <Cartao className="mb-1.5">
        <Linha rotulo="Data" className="mb-2">
          {coluna(st.map.date, (i) => setSt({ ...st, map: { ...st.map, date: i } }))}
        </Linha>
        <Linha rotulo="Descrição" className="mb-2">
          {coluna(st.map.desc, (i) => setSt({ ...st, map: { ...st.map, desc: i } }))}
        </Linha>
        <Linha rotulo="Valor" className="mb-2">
          {coluna(st.map.val, (i) => setSt({ ...st, map: { ...st.map, val: i } }))}
        </Linha>
        <Linha rotulo="Importar">
          <SelecaoLinha value={st.sign} onChange={(ev) => setSt({ ...st, sign: ev.target.value as ImportSign })}>
            <option value="neg">Só saídas (valores negativos)</option>
            <option value="pos">Só entradas (valores positivos)</option>
            <option value="abs">Tudo (valor absoluto)</option>
          </SelecaoLinha>
        </Linha>
      </Cartao>
      <RotuloSecao>
        Prévia — {parsed.length} lançamento(s) · total {brl(totalPrev)}
        {skipped ? ` · ${skipped} linha(s) ignorada(s)` : ""}
      </RotuloSecao>
      <Cartao className="mb-1.5">
        {parsed.length === 0 ? (
          <Legenda>Nenhum lançamento reconhecido com esse mapeamento.</Legenda>
        ) : (
          parsed.slice(0, 5).map((e, i) => (
            <LinhaTabela key={i}>
              <CelNota className="w-11">
                {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
              </CelNota>
              <span className="flex-1">{e.desc.slice(0, 40)}</span>
              <CelNegrito status="pontual">{brl(e.value)}</CelNegrito>
            </LinhaTabela>
          ))
        )}
      </Cartao>
      <div className="flex gap-2.5 pt-3.5">
        <Botao variante="neutro" onClick={onCancel}>
          Cancelar
        </Botao>
        <Botao className="flex-1" disabled={!parsed.length} onClick={() => onConfirm(st)}>
          Importar {parsed.length}
        </Botao>
      </div>
    </>
  );
}
