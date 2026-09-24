// Porta de renderTravelDoc (index.html:9564-9683) — itens de mala agrupados
// por categoria, com sugestão de categoria por nome, "desmarcar tudo" e
// exportar PDF.
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { BarraPdf } from "../features/modelos/BarraPdf";
import { ChipsSugestao, EdicaoItem, LinhaItem, SecaoItens } from "../features/modelos/ItensLista";
import { Botao } from "../ui/Botao";
import { BotaoIcone } from "../ui/BotaoIcone";
import { Campo, SelecaoLinha } from "../ui/Campo";
import { EstadoVazio } from "../ui/EstadoVazio";
import { Legenda } from "../ui/Legenda";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { TRAVEL_DB, guessTravelCat } from "../lib/templates";
import { exportPdfView } from "../lib/exportFile";
import { travelPdfHtml } from "../lib/pdfExport";
import type { TravelDoc as TravelDocType } from "../lib/types";
import { tela } from "../ui/Tela";

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
    <div {...tela({})}>
      <CabecalhoDoc doc={doc} onTitleChange={(title) => save({ title })} />
      <BarraPdf
        antes={
          <BotaoIcone
            rotulo="Desmarcar tudo (reusar)"
            onClick={() => {
              if (window.confirm("Desmarcar todos os itens para reusar a lista?")) {
                save({ items: doc.items.map((i) => ({ ...i, checked: false })) });
              }
            }}
          >
            <Icon name="arrowPath" size={15} />
          </BotaoIcone>
        }
        exportar={() => exportPdfView(doc.title, travelPdfHtml(doc), "Listas de viagem")}
      />
      <div className="mb-3.5">
        <Campo
          variante="item"
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
          <ChipsSugestao
            itens={suggestions}
            onEscolher={(s) => {
              setName(s);
              setCat(guessTravelCat(s));
            }}
          />
        )}
        <div className="flex gap-2">
          <SelecaoLinha value={cat} onChange={(e) => setCat(e.target.value)}>
            {doc.catOrder.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelecaoLinha>
          <Campo
            variante="linha"
            type="number"
            inputMode="numeric"
            min={1}
            className="w-16"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <Botao className="flex-none px-5 py-2.5" onClick={addItem}>
            +
          </Botao>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-5">
        <Legenda className="mt-0.5 mb-2">
          {pending} pendente(s) de {doc.items.length}
        </Legenda>
        {doc.items.length === 0 && (
          <EstadoVazio className="min-h-[25vh]" texto="Adicione itens — eles serão agrupados por categoria." />
        )}
        {order.map((c) => {
          const items = byCat[c] || [];
          if (items.length === 0 && !hasAnyItem) return null;
          const sorted = [...items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0));
          return (
            <SecaoItens key={c} titulo={c} vazia={sorted.length === 0}>
              {sorted.map((it) =>
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
                  <LinhaItem
                    key={it.id}
                    marcado={it.checked}
                    nome={it.name}
                    direita={it.qty && it.qty > 1 ? "×" + it.qty : ""}
                    onMarcar={() =>
                      save({ items: doc.items.map((x) => (x.id === it.id ? { ...x, checked: !x.checked } : x)) })
                    }
                    onEditar={() => setEditId(it.id)}
                  />
                )
              )}
            </SecaoItens>
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
    <EdicaoItem
      nome={name}
      onNome={setName}
      onOk={() => onSave({ name: name.trim() || it.name, cat, qty: +qty || it.qty })}
      onExcluir={onDelete}
      onCancelar={onCancel}
    >
      <SelecaoLinha value={cat} onChange={(e) => setCat(e.target.value)}>
        {order.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </SelecaoLinha>
      <Campo
        variante="linha"
        type="number"
        inputMode="numeric"
        min={1}
        className="w-16"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
    </EdicaoItem>
  );
}
