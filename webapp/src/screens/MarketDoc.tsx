// Porta de renderMarketDoc (index.html:7148-7390) — lista de mercado
// agrupada por gôndola, com sugestão de gôndola por nome do item e modo
// compra. Sem chips de frequência (K_MKFREQ), reordenar gôndola nem
// compartilhar como texto — gaps documentados em CLAUDE.md > "webapp/".
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { GROCERY_DB, brl, guessAisle } from "../lib/templates";
import type { MarketDoc as MarketDocType } from "../lib/types";

type Item = MarketDocType["items"][number];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function itemRight(it: Item): string {
  const q = it.qty + (it.unit === "un" ? " un" : it.unit);
  return q + (it.price ? " · " + brl(it.price) : "");
}

const ALL_SUGGESTIONS = [...new Set(Object.values(GROCERY_DB).flat())];

export function MarketDoc({ doc }: { doc: MarketDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("un");
  const [price, setPrice] = useState("");
  const [aisle, setAisle] = useState(doc.aisleOrder[0] || "Outros");
  const [editId, setEditId] = useState<string | null>(null);

  function save(patch: Partial<MarketDocType>) {
    updateTemplateDoc({ ...doc, ...patch });
  }

  function addItem() {
    const n = name.trim();
    if (!n) return;
    const q = +qty || 1;
    const u = unit;
    const p = +price || 0;
    const a = aisle || guessAisle(n);
    const dup = doc.items.find((i) => i.name.toLowerCase() === n.toLowerCase() && i.unit === u);
    const items = dup
      ? doc.items.map((i) => (i === dup ? { ...i, qty: i.qty + q, price: p ? (i.price || 0) + p : i.price } : i))
      : [...doc.items, { id: uid(), name: n, qty: q, unit: u, price: p, aisle: a, checked: false }];
    save({ items });
    setName("");
    setQty("1");
    setPrice("");
  }

  const suggestions =
    name.trim().length >= 2 ? ALL_SUGGESTIONS.filter((s) => s.includes(name.trim().toLowerCase())).slice(0, 6) : [];

  const pending = doc.items.filter((i) => !i.checked);
  const listTotal = doc.items.reduce((a, i) => a + (i.price || 0), 0);
  const cartTotal = doc.items.filter((i) => i.checked).reduce((a, i) => a + (i.price || 0), 0);

  const byAisle: Record<string, Item[]> = {};
  doc.items.forEach((it) => {
    (byAisle[it.aisle || "Outros"] = byAisle[it.aisle || "Outros"] || []).push(it);
  });
  const order = doc.aisleOrder.concat(Object.keys(byAisle).filter((a) => !doc.aisleOrder.includes(a)));
  const hasAnyItem = doc.items.length > 0;

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => save({ title })} />
      <div className="topbar" style={{ borderTop: "none", justifyContent: "flex-end" }}>
        <button
          className={"icon-btn" + (doc.shopMode ? " pin-btn pinned" : "")}
          title="Modo compra"
          aria-label="Modo compra"
          onClick={() => save({ shopMode: !doc.shopMode })}
        >
          <Icon name="market" size={15} />
        </button>
        <button
          className="icon-btn"
          title="Recomprar (desmarcar tudo)"
          aria-label="Recomprar (desmarcar tudo)"
          onClick={() => {
            if (window.confirm("Desmarcar todos os itens para recomprar?")) {
              save({ items: doc.items.map((i) => ({ ...i, checked: false })) });
            }
          }}
        >
          <Icon name="arrowPath" size={15} />
        </button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
        {!doc.shopMode && (
          <div className="market-form">
            <input
              type="text"
              placeholder="Item"
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAisle(guessAisle(e.target.value));
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
                      setAisle(guessAisle(s));
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="market-form-row" style={{ marginBottom: 8 }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="qtd"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
                {["un", "g", "kg", "L", "ml"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="R$ (opc)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
            <div className="market-form-row">
              <select value={aisle} onChange={(e) => setAisle(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
                {doc.aisleOrder.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button className="btn-primary" style={{ flex: "0 0 auto", padding: "10px 24px" }} onClick={addItem}>
                +
              </button>
            </div>
          </div>
        )}

        {doc.shopMode && <div className="shop-counter">{pending.length}<span> restante(s)</span></div>}
        {listTotal > 0 ? (
          <div className="stat-foot" style={{ margin: "2px 0 8px" }}>
            carrinho {brl(cartTotal)} · lista {brl(listTotal)}
          </div>
        ) : !doc.shopMode ? (
          <div className="stat-foot" style={{ margin: "2px 0 8px" }}>
            {pending.length} pendente(s) de {doc.items.length}
          </div>
        ) : null}
        {doc.items.length === 0 && (
          <div className="empty-state" style={{ minHeight: "30vh" }}>
            <p>Adicione itens — eles serão agrupados por gôndola.</p>
          </div>
        )}

        {order.map((a) => {
          const items = byAisle[a] || [];
          let visible = doc.shopMode ? items.filter((i) => !i.checked) : items;
          if (doc.shopMode ? visible.length === 0 : visible.length === 0 && !hasAnyItem) return null;
          visible = [...visible].sort((x, y) => (x.checked ? 1 : 0) - (y.checked ? 1 : 0));
          return (
            <div key={a}>
              <div className="section-label">{a}</div>
              <div className="stat-card" style={{ padding: "10px 14px" }}>
                {visible.length === 0 ? (
                  <div className="dev-n" style={{ padding: "4px 2px", opacity: 0.6 }}>
                    — vazia —
                  </div>
                ) : (
                  visible.map((it) =>
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
                          {itemRight(it)}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          );
        })}

        {!doc.shopMode && doc.items.some((i) => i.checked) && (
          <button
            className="add-step-btn"
            style={{ width: "100%" }}
            onClick={() => {
              const n = doc.items.filter((i) => i.checked).length;
              if (window.confirm(`Remover ${n} item(ns) marcado(s)?`)) {
                save({ items: doc.items.filter((i) => !i.checked) });
              }
            }}
          >
            limpar itens marcados
          </button>
        )}
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
  const [qty, setQty] = useState(String(it.qty));
  const [unit, setUnit] = useState(it.unit);
  const [price, setPrice] = useState(it.price ? String(it.price) : "");
  const [aisle, setAisle] = useState(it.aisle);
  return (
    <div className="mk-edit">
      <input type="text" className="mk-e-name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="market-form-row">
        <input
          type="number"
          className="mk-e-qty"
          inputMode="decimal"
          min={0}
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <select className="mk-e-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
          {["un", "g", "kg", "L", "ml"].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <input
          type="number"
          className="mk-e-price"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="R$"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select className="mk-e-aisle" value={aisle} onChange={(e) => setAisle(e.target.value)}>
          {order.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="notice-actions">
        <button
          onClick={() =>
            onSave({
              name: name.trim() || it.name,
              qty: +qty || it.qty,
              unit,
              price: +price || 0,
              aisle,
            })
          }
        >
          ok
        </button>
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
