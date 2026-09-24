// Porta de renderExpenseFolder (index.html:8875-9203) — pasta única de
// despesas (cada lançamento é a própria "nota"), com busca/filtro, lista
// agrupada por mês, gráficos (tendência + donut por categoria) e
// import/export de extrato CSV (mapeamento de colunas com prévia).
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoTela } from "../ui/CabecalhoTela";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import { GraficosGastos } from "../features/gastos/GraficosGastos";
import { ImportarExtrato } from "../features/gastos/ImportarExtrato";
import { ListaGastos } from "../features/gastos/ListaGastos";
import { NovaDespesa } from "../features/gastos/NovaDespesa";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Campo, SelecaoLinha } from "../ui/Campo";
import { Fab } from "../ui/Fab";
import { Legenda } from "../ui/Legenda";
import { Toggle } from "../ui/Segmentado";
import {
  EXP_CATS,
  computeImportPreview,
  despesasCsv,
  filtrarDespesas,
  guessExpenseColumns,
  parseBRNumber,
  parseCsvText,
  sugerirCategoriaDespesa,
  type ImportState,
} from "../lib/expense";
import type { ExpenseDoc } from "../lib/types";
import { rolavel, tela } from "../ui/Tela";

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExpenseFolder() {
  const templates = useAppStore((s) => s.templates);
  const goTo = useAppStore((s) => s.goTo);
  const addExpense = useAppStore((s) => s.addExpense);
  const addExpenses = useAppStore((s) => s.addExpenses);
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const deleteTemplateDoc = useAppStore((s) => s.deleteTemplateDoc);

  const [view, setView] = useState<"lista" | "graficos">("lista");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("");
  const [novo, setNovo] = useState(false);
  const [importState, setImportState] = useState<ImportState | null>(null);
  const [aviso, setAviso] = useState("");
  const csvFileRef = useRef<HTMLInputElement>(null);

  const allDocs = templates.filter((t): t is ExpenseDoc => t.type === "expense");
  const docs = filtrarDespesas(allDocs, { query, from, to, cat });

  function onCsvFile(file: File) {
    setAviso("");
    const reader = new FileReader();
    reader.onload = () => {
      const { rows } = parseCsvText(String(reader.result));
      if (!rows.length) {
        setAviso("CSV vazio ou ilegível");
        return;
      }
      const g = guessExpenseColumns(rows);
      if (g.dateCol < 0 || g.valCol < 0) {
        setAviso("Não reconheci colunas de data e valor — confira o arquivo");
        return;
      }
      const anyNeg = g.dataRows.some((r) => parseBRNumber(r[g.valCol]) < 0);
      setImportState({
        dataRows: g.dataRows,
        guess: g,
        map: { date: g.dateCol, val: g.valCol, desc: g.descCol >= 0 ? g.descCol : 0 },
        sign: anyNeg ? "neg" : "abs",
      });
    };
    reader.readAsText(file, "utf-8");
  }

  function confirmarImport(st: ImportState) {
    const res = computeImportPreview(st);
    addExpenses(
      res.parsed.map((e) => ({
        desc: e.desc,
        value: +e.value.toFixed(2),
        cat: sugerirCategoriaDespesa(e.desc, allDocs) || "Outros",
        date: e.date,
      }))
    );
    setImportState(null);
    setAviso(res.parsed.length + " lançamento(s) importado(s) ✓");
  }

  function exportarCsv() {
    downloadText("despesas.csv", despesasCsv(allDocs), "text/csv;charset=utf-8");
    setAviso("CSV exportado ✓");
  }

  return (
    <div {...tela({ comAbas: true })}>
      <div {...rolavel()}>
        <CabecalhoTela
          titulo={
            <>
              <span
                className="cursor-pointer text-4xl text-sub"
                onClick={() => goTo({ tab: "templates", screen: "templateFolders" })}
              >
                <Icon name="chevronLeft" size={18} />
              </span>{" "}
              <Icon name="expense" size={18} /> Despesas
            </>
          }
          tituloClassName="text-4xl paisagem:text-4xl"
        >
          <div className="flex gap-1.5">
            <BotaoIcone rotulo="Importar extrato CSV" tamanho="sm" onClick={() => csvFileRef.current?.click()}>
              <Icon name="arrowUpTray" size={14} />
            </BotaoIcone>
            <BotaoIcone rotulo="Exportar CSV" tamanho="sm" onClick={exportarCsv}>
              CSV
            </BotaoIcone>
          </div>
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onCsvFile(f);
            }}
          />
        </CabecalhoTela>

        {aviso && <Legenda className="mb-2">{aviso}</Legenda>}

        {importState ? (
          <ImportarExtrato initial={importState} onCancel={() => setImportState(null)} onConfirm={confirmarImport} />
        ) : (
          <>
            <div className="mb-3">
              <Campo
                variante="item"
                type="text"
                placeholder="Buscar por descrição ou categoria"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Campo
                  variante="linha"
                  type="date"
                  className="min-w-0 flex-1"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label="De"
                />
                <Campo
                  variante="linha"
                  type="date"
                  className="min-w-0 flex-1"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label="Até"
                />
                <SelecaoLinha value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Todas categorias</option>
                  {EXP_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelecaoLinha>
              </div>
            </div>

            <Toggle
              className="mb-3"
              options={[
                { key: "lista", label: "lista" },
                { key: "graficos", label: "gráficos" },
              ]}
              active={view}
              onSelect={setView}
            />

            {view === "lista" ? (
              <ListaGastos
                docs={docs}
                onDelete={(id) => deleteTemplateDoc(id)}
                onSave={(id, patch) =>
                  updateTemplateDoc({ ...(allDocs.find((d) => d.id === id) as ExpenseDoc), ...patch })
                }
              />
            ) : (
              <GraficosGastos docs={docs} />
            )}
          </>
        )}
      </div>

      {novo && (
        <NovaDespesa
          onCancel={() => setNovo(false)}
          onSalvar={(fields) => {
            addExpense(fields);
            setNovo(false);
          }}
        />
      )}

      {!importState && <Fab rotulo="Nova despesa" onClick={() => setNovo(true)} />}
      <Tabbar />
    </div>
  );
}
