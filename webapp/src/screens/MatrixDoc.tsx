// Porta de renderMatrixDoc (index.html:7421-7587) — grade de 4 quadrantes
// com cor, modo (check/lista/numerada), itens com indentação simples (1
// nível), expandir quadrante e edição dos rótulos dos eixos. Sem exportar
// PDF — gap documentado em CLAUDE.md > "webapp/".
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { MATRIX_COLORS } from "../lib/templates";
import type { MatrixDoc as MatrixDocType } from "../lib/types";

type Quadrant = MatrixDocType["quadrants"][number];
type QItem = Quadrant["items"][number];

export function MatrixDoc({ doc }: { doc: MatrixDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [editing, setEditing] = useState<{ qi: number; ii: number } | null>(null);
  const [showAxes, setShowAxes] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  function save(patch: Partial<MatrixDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }
  function saveQuadrants(quadrants: Quadrant[]) {
    save({ quadrants });
  }
  function patchQuad(qi: number, patch: Partial<Quadrant>) {
    saveQuadrants(doc.quadrants.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  const renderQuad = (q: Quadrant, qi: number, big: boolean) => (
    <div className="matrix-quad" key={qi} style={{ borderColor: q.color, background: q.color + "14" }}>
              <input
                type="text"
                className="mx-title"
                value={q.title}
                style={{ color: q.color, fontSize: big ? 17 : 14 }}
                onChange={(e) => patchQuad(qi, { title: e.target.value })}
              />
              <span className="dev-n" style={{ fontSize: 10.5 }}>
                {q.items.length} item(ns)
              </span>
              <div className="mx-tools">
                <div className="mx-colors">
                  {MATRIX_COLORS.map((c) => (
                    <span
                      key={c}
                      className={"color-chip mx-chip" + (q.color === c ? " sel" : "")}
                      style={{ background: c, width: 16, height: 16 }}
                      onClick={() => patchQuad(qi, { color: c })}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <div className="type-toggle" style={{ fontSize: 10 }}>
                    {(["check", "ul", "ol"] as const).map((m) => (
                      <span key={m} className={q.mode === m ? "active" : ""} onClick={() => patchQuad(qi, { mode: m })}>
                        {m === "check" ? <Icon name="check" size={13} /> : m === "ul" ? "•" : "1."}
                      </span>
                    ))}
                  </div>
                  <button
                    className="order-btn"
                    title={big ? "Voltar à grade" : "Expandir"}
                    aria-label={big ? "Voltar à grade" : "Expandir"}
                    onClick={() => {
                      setExpanded(expanded === qi ? null : qi);
                      setEditing(null);
                    }}
                  >
                    <Icon name={big ? "arrowsPointingIn" : "arrowsPointingOut"} size={15} />
                  </button>
                </div>
              </div>
              <div className="mx-items">
                {q.items.map((it, ii) =>
                  editing && editing.qi === qi && editing.ii === ii ? (
                    <ItemEdit
                      key={ii}
                      doc={doc}
                      qi={qi}
                      ii={ii}
                      it={it}
                      onDone={() => setEditing(null)}
                      onSave={(quadrants) => saveQuadrants(quadrants)}
                    />
                  ) : (
                    <QItemRow key={ii} q={q} it={it} ii={ii} big={big} onEdit={() => setEditing({ qi, ii })} onToggle={() => {
                      const items = q.items.map((x, i) => (i === ii ? { ...x, checked: !x.checked } : x));
                      patchQuad(qi, { items });
                    }} />
                  ),
                )}
              </div>
              <form
                className="mx-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  const inp = e.currentTarget.querySelector("input") as HTMLInputElement;
                  const val = inp.value.trim();
                  if (!val) return;
                  patchQuad(qi, { items: [...q.items, { text: val, checked: false, indent: 0 }] });
                  inp.value = "";
                }}
              >
                <input type="text" placeholder="+ item (Enter)" />
              </form>
            </div>
  );

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="topbar" style={{ borderTop: "none", justifyContent: "flex-end" }}>
        <button className="icon-btn" title="Rótulos dos eixos" aria-label="Rótulos dos eixos" onClick={() => setShowAxes(!showAxes)}>
          <Icon name="tag" size={15} />
        </button>
      </div>
      {showAxes && (
        <div className="mx-axes" style={{ display: "flex" }}>
          <input type="text" placeholder="eixo horizontal" value={doc.axisX || ""} onChange={(e) => save({ axisX: e.target.value })} />
          <input type="text" placeholder="eixo vertical" value={doc.axisY || ""} onChange={(e) => save({ axisY: e.target.value })} />
        </div>
      )}
      {doc.axisX && !showAxes && <div className="mx-axis-x">&larr; {doc.axisX} &rarr;</div>}
      <div style={{ flex: 1, display: "flex", minHeight: 0, gap: 6, overflow: "hidden" }}>
        {doc.axisY && !showAxes && expanded === null && <div className="mx-axis-y">{doc.axisY}</div>}
        {expanded !== null ? (
          <div className="matrix-single" style={{ overflowY: "auto" }}>{renderQuad(doc.quadrants[expanded], expanded, true)}</div>
        ) : (
          <div className="matrix-grid" style={{ overflowY: "auto" }}>{doc.quadrants.map((q, qi) => renderQuad(q, qi, false))}</div>
        )}
      </div>
    </div>
  );
}

function QItemRow({
  q,
  it,
  ii,
  big,
  onEdit,
  onToggle,
}: {
  q: Quadrant;
  it: QItem;
  ii: number;
  big: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const indStyle = it.indent ? { marginLeft: 16 } : undefined;
  const fontSize = big ? 15 : 13.5;
  if (q.mode === "check") {
    return (
      <div className={"checklist-item" + (it.checked ? " checked" : "")} style={{ margin: "3px 0", fontSize, ...indStyle }}>
        <span
          className="checklist-box mx-box"
          style={{ width: 16, height: 16, borderColor: q.color, background: it.checked ? q.color : undefined }}
          onClick={onToggle}
        >
          {it.checked ? <Icon name="check" size={14} /> : null}
        </span>
        <span className="txt" style={{ flex: 1 }} onClick={onEdit}>
          {it.text}
        </span>
      </div>
    );
  }
  const marker = q.mode === "ol" ? q.items.slice(0, ii).filter((x) => !x.indent).length + (it.indent ? 0 : 1) + "." : "•";
  return (
    <div className="live-line li-line" style={{ fontSize, display: "flex", alignItems: "flex-start", ...indStyle }}>
      <span className="li-marker" style={{ color: q.color }}>
        {it.indent ? "◦" : marker}
      </span>
      <span style={{ flex: 1 }} onClick={onEdit}>
        {it.text}
      </span>
    </div>
  );
}

function ItemEdit({
  doc,
  qi,
  ii,
  it,
  onSave,
  onDone,
}: {
  doc: MatrixDocType;
  qi: number;
  ii: number;
  it: QItem;
  onSave: (quadrants: Quadrant[]) => void;
  onDone: () => void;
}) {
  const [text, setText] = useState(it.text);
  const [targetQ, setTargetQ] = useState(qi);

  function commit(patch: Partial<QItem>) {
    const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
    quadrants[qi].items[ii] = { ...quadrants[qi].items[ii], ...patch };
    onSave(quadrants);
  }
  function ok() {
    const trimmed = text.trim() || it.text;
    if (targetQ !== qi) {
      const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
      const [moved] = quadrants[qi].items.splice(ii, 1);
      quadrants[targetQ].items.push({ ...moved, text: trimmed });
      onSave(quadrants);
    } else {
      commit({ text: trimmed });
    }
    onDone();
  }
  function del() {
    const quadrants = doc.quadrants.map((q) => ({ ...q, items: [...q.items] }));
    quadrants[qi].items.splice(ii, 1);
    onSave(quadrants);
    onDone();
  }
  function move(delta: number) {
    const target = ii + delta;
    const q = doc.quadrants[qi];
    if (target < 0 || target >= q.items.length) return;
    const quadrants = doc.quadrants.map((x) => ({ ...x, items: [...x.items] }));
    [quadrants[qi].items[ii], quadrants[qi].items[target]] = [quadrants[qi].items[target], quadrants[qi].items[ii]];
    onSave(quadrants);
    onDone();
  }

  return (
    <div className="mx-editbox">
      <textarea
        className="mx-e-text"
        rows={1}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ok();
          }
        }}
      />
      <div className="mx-e-tools">
        <select className="mx-e-quad" value={targetQ} onChange={(e) => setTargetQ(+e.target.value)}>
          {doc.quadrants.map((qq, qqi) => (
            <option key={qqi} value={qqi}>
              {qq.title.slice(0, 18)}
            </option>
          ))}
        </select>
        <button className="order-btn" title="Indentar" onClick={() => commit({ indent: 1 })}>
          <Icon name="chevronDoubleRight" size={14} />
        </button>
        <button className="order-btn" title="Remover indentação" onClick={() => commit({ indent: 0 })}>
          <Icon name="chevronDoubleLeft" size={14} />
        </button>
        <button className="order-btn" disabled={ii === 0} onClick={() => move(-1)}>
          <Icon name="arrowUp" size={14} />
        </button>
        <button className="order-btn" disabled={ii === doc.quadrants[qi].items.length - 1} onClick={() => move(1)}>
          <Icon name="arrowDown" size={14} />
        </button>
      </div>
      <div className="notice-actions">
        <button onClick={ok}>ok</button>
        <button className="ghost" style={{ color: "var(--erro)" }} onClick={del}>
          excluir
        </button>
      </div>
    </div>
  );
}
