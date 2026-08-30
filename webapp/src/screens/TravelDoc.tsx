// Porta de renderTravelDoc (index.html:9564-9660ish) — itens de mala
// agrupados por categoria, com sugestão de categoria por nome. Sem exportar
// PDF nem "desmarcar tudo" — gaps documentados em CLAUDE.md > "webapp/".
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { TRAVEL_DB, guessTravelCat } from "../lib/templates";
import type { TravelDoc as TravelDocType } from "../lib/types";

type Item = TravelDocType["items"][number];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ALL_SUGGESTIONS = [...new Set(Object.values(TRAVEL_DB).flat())];

export function TravelDoc({ doc }: { doc: TravelDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [cat, setCat] = useState(doc.catOrder[0] || "Outros");
  const [editId, setEditId] = useState<string | null>(null);

  function save(patch: Partial<TravelDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  function addItem() {
    const n = name.trim();
    if (!n) return;
    save({ items: [...doc.items, { id: uid(), name: n, cat: cat || "Outros", qty: +qty || 1, checked: false }] });
    setName("");
    setQty("1");
  }

  const suggestions =
    name.trim().length >= 2 ? ALL_SUGGESTIONS.filter((s) => s.includes(name.trim().toLowerCase())).slice(0, 6) : [];

  const pending = doc.items.filter((i) => !i.checked).length;
  const byCat: Record<string, Item[]> = {};
  doc.items.forEach((it) => {
    (byCat[it.cat || "Outros"] = byCat[it.cat || "Outros"] || []).push(it);
  });
  const order = doc.catOrder.concat(Object.keys(byCat).filter((c) => !doc.catOrder.includes(c)));
  const hasAnyItem = doc.items.length > 0;

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="topbar" style={{ borderTop: "none", justifyContent: "flex-end" }}>
        <button
          className="icon-btn"
          title="Desmarcar tudo (reusar)"
          aria-label="Desmarcar tudo (reusar)"
          onClick={() => {
            if (window.confirm("Desmarcar todos os itens para reusar a lista?")) {
              save({ items: doc.items.map((i) => ({ ...i, checked: false })) });
            }
          }}
        >
          <Icon name="arrowPath" size={15} />
        </button>
      </div>
      <div className="market-form">
        <input
          type="text"
          placeholder="Item"
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setCat(guessTravelCat(e.target.value));
          }}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        {suggestions.length > 0 && (
          <div className="mk-chips">
            {suggestions.map((s) => (
              <span
                key={s}
                className="tag-chip"
                onClick={() => {
                  setName(s);
                  setCat(guessTravelCat(s));
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="market-form-row">
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            {doc.catOrder.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ width: 64 }}
          />
          <button className="btn-primary" style={{ flex: "0 0 auto", padding: "10px 20px" }} onClick={addItem}>
            +
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        <div className="stat-foot" style={{ margin: "2px 0 8px" }}>
          {pending} pendente(s) de {doc.items.length}
        </div>
        {doc.items.length === 0 && (
          <div className="empty-state" style={{ minHeight: "25vh" }}>
            <p>Adicione itens — eles serão agrupados por categoria.</p>
          </div>
        )}
        {order.map((c) => {
          const items = byCat[c] || [];
          if (items.length === 0 && !hasAnyItem) return null;
          const sorted = [...items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0));
          return (
            <div key={c}>
              <div className="section-label">{c}</div>
              <div className="stat-card" style={{ padding: "10px 14px" }}>
                {sorted.length === 0 ? (
                  <div className="dev-n" style={{ padding: "4px 2px", opacity: 0.6 }}>
                    — vazia —
                  </div>
                ) : (
                  sorted.map((it) =>
                    editId === it.id ? (
                      <EditRow
                        key={it.id}
                        it={it}
                        order={order}
                        onCancel={() => setEditId(null)}
                        onSave={(patch) => {
                          save({ items: doc.items.map((x) => (x.id === it.id ? { ...x, ...patch } : x)) });
                          setEditId(null);
                        }}
                        onDelete={() => {
                          save({ items: doc.items.filter((x) => x.id !== it.id) });
                          setEditId(null);
                        }}
                      />
                    ) : (
                      <div className={"checklist-item mk-item" + (it.checked ? " checked" : "")} key={it.id}>
                        <span
                          className="checklist-box"
                          onClick={() =>
                            save({ items: doc.items.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)) })
                          }
                        >
                          {it.checked ? <Icon name="check" size={14} /> : null}
                        </span>
                        <span className="txt mk-name" onClick={() => setEditId(it.id)}>
                          {it.name}
                        </span>
                        <span className="mk-right" onClick={() => setEditId(it.id)}>
                          {it.qty && it.qty > 1 ? "×" + it.qty : ""}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditRow({
  it,
  order,
  onSave,
  onDelete,
  onCancel,
}: {
  it: Item;
  order: string[];
  onSave: (patch: Partial<Item>) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(it.name);
  const [cat, setCat] = useState(it.cat);
  const [qty, setQty] = useState(String(it.qty || 1));
  return (
    <div className="mk-edit">
      <input type="text" className="mk-e-name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="market-form-row">
        <select className="tv-e-cat" value={cat} onChange={(e) => setCat(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
          {order.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          className="tv-e-qty"
          inputMode="numeric"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ width: 64 }}
        />
      </div>
      <div className="notice-actions">
        <button onClick={() => onSave({ name: name.trim() || it.name, cat, qty: +qty || it.qty })}>ok</button>
        <button className="ghost" style={{ color: "var(--erro)" }} onClick={onDelete}>
          excluir
        </button>
        <button className="ghost" onClick={onCancel}>
          cancelar
        </button>
      </div>
    </div>
  );
}
