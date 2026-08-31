// Porta de renderExpenseFolder (index.html:8875-9203) — pasta única de
// despesas (cada lançamento é a própria "nota"), com busca/filtro, lista
// agrupada por mês, gráficos (tendência + donut por categoria) e
// import/export de extrato CSV (mapeamento de colunas com prévia).
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { Tabbar } from "../components/Tabbar";
import {
  EXP_CATS,
  agruparPorMes,
  brl,
  catColor,
  chartsPeriodUnit,
  computeDonutArcs,
  computeImportPreview,
  despesasCsv,
  filtrarDespesas,
  guessExpenseColumns,
  parseBRNumber,
  parseCsvText,
  resumoPorPeriodo,
  sugerirCategoriaDespesa,
  type ChartsPeriod,
  type ImportSign,
  type ImportState,
} from "../lib/expense";
import type { ExpenseDoc } from "../lib/types";

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

/* Porta de paintImport (index.html:9126-9171) — conferência de colunas do
   extrato com prévia antes de importar. */
function ImportView({ initial, onCancel, onConfirm }: { initial: ImportState; onCancel: () => void; onConfirm: (st: ImportState) => void }) {
  const [st, setSt] = useState(initial);
  const g = st.guess;
  const { parsed, skipped } = computeImportPreview(st);
  const totalPrev = parsed.reduce((a, e) => a + e.value, 0);
  const colSelect = (value: number, onChange: (i: number) => void) => (
    <select style={{ flex: 1 }} value={value} onChange={(ev) => onChange(+ev.target.value)}>
      {Array.from({ length: g.ncol }, (_, i) => (
        <option key={i} value={i}>
          coluna {i + 1}
          {g.header && g.header[i] ? " · " + g.header[i].slice(0, 16) : ""}
        </option>
      ))}
    </select>
  );
  const rotulo = (t: string) => <span style={{ width: 80, color: "var(--sub)", fontSize: 13 }}>{t}</span>;
  return (
    <>
      <div className="section-label">Importar extrato — conferir colunas</div>
      <div className="stat-card">
        <div className="market-form-row" style={{ marginBottom: 8 }}>
          {rotulo("Data")}
          {colSelect(st.map.date, (i) => setSt({ ...st, map: { ...st.map, date: i } }))}
        </div>
        <div className="market-form-row" style={{ marginBottom: 8 }}>
          {rotulo("Descrição")}
          {colSelect(st.map.desc, (i) => setSt({ ...st, map: { ...st.map, desc: i } }))}
        </div>
        <div className="market-form-row" style={{ marginBottom: 8 }}>
          {rotulo("Valor")}
          {colSelect(st.map.val, (i) => setSt({ ...st, map: { ...st.map, val: i } }))}
        </div>
        <div className="market-form-row">
          {rotulo("Importar")}
          <select style={{ flex: 1 }} value={st.sign} onChange={(ev) => setSt({ ...st, sign: ev.target.value as ImportSign })}>
            <option value="neg">Só saídas (valores negativos)</option>
            <option value="pos">Só entradas (valores positivos)</option>
            <option value="abs">Tudo (valor absoluto)</option>
          </select>
        </div>
      </div>
      <div className="section-label">
        Prévia — {parsed.length} lançamento(s) · total {brl(totalPrev)}
        {skipped ? ` · ${skipped} linha(s) ignorada(s)` : ""}
      </div>
      <div className="stat-card">
        {parsed.length === 0 ? (
          <div className="dev-n">Nenhum lançamento reconhecido com esse mapeamento.</div>
        ) : (
          parsed.slice(0, 5).map((e, i) => (
            <div className="dev-row" key={i}>
              <span className="dev-n" style={{ width: 44 }}>
                {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
              </span>
              <span style={{ flex: 1 }}>{e.desc.slice(0, 40)}</span>
              <b className="ontime">{brl(e.value)}</b>
            </div>
          ))
        )}
      </div>
      <div className="bottom-actions" style={{ position: "static", background: "none", padding: "14px 0 0" }}>
        <button className="btn-cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={!parsed.length} onClick={() => onConfirm(st)}>
          Importar {parsed.length}
        </button>
      </div>
    </>
  );
}

function Donut({ segs, total }: { segs: Array<{ label: string; valor: number; color: string }>; total: number }) {
  const arcs = computeDonutArcs(
    segs.map((s) => ({ value: s.valor, color: s.color })),
    total,
  );
  return (
    <svg viewBox="0 0 128 128" width={118} height={118} style={{ flex: "0 0 auto" }}>
      {arcs.map((a, i) => (
        <circle
          key={i}
          cx={64}
          cy={64}
          r={52}
          fill="none"
          stroke={a.color}
          strokeWidth={22}
          strokeDasharray={a.dashArray}
          strokeDashoffset={a.dashOffset}
          transform="rotate(-90 64 64)"
        />
      ))}
      <circle cx={64} cy={64} r={52 - 11 - 1} fill="var(--card)" />
    </svg>
  );
}

function Graficos({ docs }: { docs: ExpenseDoc[] }) {
  const [period, setPeriod] = useState<ChartsPeriod>("mes");
  if (docs.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: "25vh" }}>
        <p>Sem dados para visualizar ainda.</p>
      </div>
    );
  }
  const r = resumoPorPeriodo(docs, period);
  const maxB = Math.max(...r.buckets.map((b) => b.valor), 1);
  const periodLabel = chartsPeriodUnit(period) + " atual";
  return (
    <>
      <div className="type-toggle" style={{ marginBottom: 12 }}>
        {(["semana", "mes", "trimestre", "ano"] as ChartsPeriod[]).map((p) => (
          <span key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
            {chartsPeriodUnit(p)}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <div className="dev-n">média por {chartsPeriodUnit(period)}</div>
          <b style={{ fontSize: 17 }}>{brl(r.mediaPorBucket)}</b>
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <div className="dev-n">total {periodLabel}</div>
          <b style={{ fontSize: 17 }}>{brl(r.totalPeriodoAtual)}</b>
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <div className="dev-n">maior categoria ({periodLabel})</div>
          <b style={{ fontSize: 14 }}>
            {r.categoriaTopoPeriodoAtual ? `${r.categoriaTopoPeriodoAtual.cat} · ${brl(r.categoriaTopoPeriodoAtual.valor)}` : "—"}
          </b>
        </div>
        <div className="stat-card" style={{ textAlign: "center" }}>
          <div className="dev-n">lançamentos ({periodLabel})</div>
          <b style={{ fontSize: 17 }}>{r.lancamentosPeriodoAtual}</b>
        </div>
      </div>
      <div className="section-label">Total por {chartsPeriodUnit(period)}</div>
      <div className="stat-card">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minHeight: 90 }}>
          {r.buckets.length === 0 ? (
            <div className="dev-n">sem dados</div>
          ) : (
            r.buckets.map((b) => (
              <div key={b.chave} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                <div className="bar-val" style={{ width: "auto", fontSize: 10 }}>
                  {brl(b.valor).replace("R$ ", "")}
                </div>
                <div className="trend-bar ontime" style={{ height: Math.max(4, Math.round((b.valor / maxB) * 60)), width: "60%" }} />
                <div className="dev-n" style={{ fontSize: 10 }}>
                  {b.label}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="section-label">Por categoria</div>
      <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <Donut segs={r.segmentos} total={r.total} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--sub)" }}>total</div>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13 }}>{brl(r.total)}</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          {r.segmentos.length === 0 ? (
            <div className="dev-n">sem dados</div>
          ) : (
            r.segmentos.map((s) => (
              <div className="bar-row" style={{ margin: "5px 0" }} key={s.label}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "0 0 auto" }} />
                <div className="bar-name" style={{ width: "auto", flex: 1 }}>
                  {s.label}
                </div>
                <div className="bar-val">{brl(s.valor)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function EditRow({ e, onSave, onCancel }: { e: ExpenseDoc; onSave: (patch: Partial<ExpenseDoc>) => void; onCancel: () => void }) {
  const [desc, setDesc] = useState(e.desc);
  const [value, setValue] = useState(String(e.value));
  const [cat, setCat] = useState(e.cat);
  const [date, setDate] = useState(e.date);
  const [time, setTime] = useState(e.time || "");
  return (
    <div className="dev-row" style={{ flexWrap: "wrap", gap: 6 }}>
      <input type="text" className="mk-e-name" style={{ width: "100%" }} value={desc} onChange={(ev) => setDesc(ev.target.value)} />
      <input type="number" inputMode="decimal" min={0} step="0.01" style={{ width: 90 }} value={value} onChange={(ev) => setValue(ev.target.value)} />
      <select style={{ flex: 1 }} value={cat} onChange={(ev) => setCat(ev.target.value)}>
        {EXP_CATS.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input type="date" style={{ width: 130 }} value={date} onChange={(ev) => setDate(ev.target.value)} />
      <input type="time" style={{ width: 100 }} value={time} onChange={(ev) => setTime(ev.target.value)} />
      <button
        className="btn-primary"
        style={{ padding: "8px 14px" }}
        onClick={() => {
          const v = +value;
          if (!desc.trim() || !v) return;
          onSave({ desc: desc.trim(), value: v, cat, date, time: time || undefined });
        }}
      >
        <Icon name="check" size={14} />
      </button>
      <button className="del-exec" onClick={onCancel}>
        <Icon name="xmark" size={14} />
      </button>
    </div>
  );
}

function Lista({ docs, onDelete, onSave }: { docs: ExpenseDoc[]; onDelete: (id: string) => void; onSave: (id: string, patch: Partial<ExpenseDoc>) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const grupos = agruparPorMes(docs);
  if (docs.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: "25vh" }}>
        <p>Registre um gasto pelo botão + no canto da tela.</p>
      </div>
    );
  }
  return (
    <>
      {grupos.map((g) => (
        <div key={g.chave}>
          <div className="section-label">
            {g.chave.slice(5, 7)}/{g.chave.slice(0, 4)} — total {brl(g.total)}
          </div>
          <div className="stat-card">
            {g.porCategoria.map((c) => (
              <div className="bar-row" key={c.cat}>
                <div className="bar-name">{c.cat}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: Math.max(3, c.pct) + "%", background: catColor(c.cat) }} />
                </div>
                <div className="bar-val">{brl(c.valor)}</div>
              </div>
            ))}
          </div>
          <div className="stat-card" style={{ marginTop: 6 }}>
            {g.itens.map((e) =>
              editId === e.id ? (
                <EditRow
                  key={e.id}
                  e={e}
                  onCancel={() => setEditId(null)}
                  onSave={(patch) => {
                    onSave(e.id, patch);
                    setEditId(null);
                  }}
                />
              ) : (
                <div className="dev-row" key={e.id}>
                  <span className="dev-n" style={{ width: 44 }}>
                    {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
                  </span>
                  <span style={{ flex: 1, cursor: "pointer" }} title="Tocar para editar" onClick={() => setEditId(e.id)}>
                    {e.desc}
                    <br />
                    <span className="dev-n">
                      {e.cat}
                      {e.time ? " · " + e.time : ""}
                    </span>
                  </span>
                  <b className="ontime">{brl(e.value)}</b>
                  <button className="del-exec" onClick={() => onDelete(e.id)}>
                    <Icon name="xmark" size={14} />
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </>
  );
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
      if (!rows.length) { setAviso("CSV vazio ou ilegível"); return; }
      const g = guessExpenseColumns(rows);
      if (g.dateCol < 0 || g.valCol < 0) { setAviso("Não reconheci colunas de data e valor — confira o arquivo"); return; }
      const anyNeg = g.dataRows.some((r) => parseBRNumber(r[g.valCol]) < 0);
      setImportState({ dataRows: g.dataRows, guess: g, map: { date: g.dateCol, val: g.valCol, desc: g.descCol >= 0 ? g.descCol : 0 }, sign: anyNeg ? "neg" : "abs" });
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
      })),
    );
    setImportState(null);
    setAviso(res.parsed.length + " lançamento(s) importado(s) ✓");
  }

  function exportarCsv() {
    downloadText("despesas.csv", despesasCsv(allDocs), "text/csv;charset=utf-8");
    setAviso("CSV exportado ✓");
  }

  return (
    <div className="screen with-tabbar">
      <div className="tab-scroll">
        <div className="home-header">
          <h1 style={{ fontSize: 22 }}>
            <span style={{ cursor: "pointer", color: "var(--sub)", fontSize: 22 }} onClick={() => goTo({ tab: "templates", screen: "templateFolders" })}>
              <Icon name="chevronLeft" size={18} />
            </span>{" "}
            <Icon name="expense" size={18} /> Despesas
          </h1>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="bell-btn" title="Importar extrato CSV" aria-label="Importar extrato CSV" onClick={() => csvFileRef.current?.click()}>
              <Icon name="arrowUpTray" size={14} />
            </button>
            <button className="bell-btn" title="Exportar CSV" aria-label="Exportar CSV" onClick={exportarCsv}>
              CSV
            </button>
          </div>
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onCsvFile(f);
            }}
          />
        </div>

        {aviso && <div className="stat-foot" style={{ marginBottom: 8 }}>{aviso}</div>}

        {importState ? (
          <ImportView initial={importState} onCancel={() => setImportState(null)} onConfirm={confirmarImport} />
        ) : (
          <>
            <div className="market-form" style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Buscar por descrição ou categoria" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="market-form-row" style={{ marginTop: 8 }}>
                <input type="date" style={{ flex: 1, minWidth: 0 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
                <input type="date" style={{ flex: 1, minWidth: 0 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
                <select style={{ flex: 1, minWidth: 0 }} value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Todas categorias</option>
                  {EXP_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="type-toggle" style={{ marginBottom: 12 }}>
              <span className={view === "lista" ? "active" : ""} onClick={() => setView("lista")}>
                lista
              </span>
              <span className={view === "graficos" ? "active" : ""} onClick={() => setView("graficos")}>
                gráficos
              </span>
            </div>

            {view === "lista" ? (
              <Lista docs={docs} onDelete={(id) => deleteTemplateDoc(id)} onSave={(id, patch) => updateTemplateDoc({ ...(allDocs.find((d) => d.id === id) as ExpenseDoc), ...patch })} />
            ) : (
              <Graficos docs={docs} />
            )}
          </>
        )}
      </div>

      {novo && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setNovo(false)}>
          <NovaDespesaForm onCancel={() => setNovo(false)} onSalvar={(fields) => { addExpense(fields); setNovo(false); }} />
        </div>
      )}

      {!importState && (
        <button className="fab" title="Nova despesa" onClick={() => setNovo(true)}>
          +
        </button>
      )}
      <Tabbar />
    </div>
  );
}

function NovaDespesaForm({ onCancel, onSalvar }: { onCancel: () => void; onSalvar: (f: { desc: string; value: number; cat: string; date: string; time?: string }) => void }) {
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
    <div className="confirm-box" style={{ textAlign: "left" }}>
      <p style={{ marginBottom: 12 }}>Nova despesa</p>
      <input
        type="text"
        placeholder="Descrição"
        className="mk-e-name"
        style={{ width: "100%", marginBottom: 8 }}
        autoFocus
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="market-form-row" style={{ marginBottom: 8 }}>
        <input type="number" inputMode="decimal" min={0} step="0.01" placeholder="R$" style={{ flex: 1, minWidth: 0 }} value={value} onChange={(e) => setValue(e.target.value)} />
        <select style={{ flex: 1, minWidth: 0 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          {EXP_CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="market-form-row">
        <input type="date" style={{ flex: 1, minWidth: 0 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" style={{ flex: "0 0 auto", width: 110 }} title="Hora (opcional)" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="confirm-actions" style={{ marginTop: 18 }}>
        <button className="btn-cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-confirm" style={{ background: "var(--caneta)" }} onClick={salvar}>
          Adicionar
        </button>
      </div>
    </div>
  );
}
