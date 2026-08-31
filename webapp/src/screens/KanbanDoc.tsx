// Porta de renderKanbanDoc + pintarKanban sem opts (index.html:7877-7893,
// 7624-7876) — 3 colunas fixas, cartão só com texto. Arrastar (useDragReorder,
// ver webapp/src/lib/dnd.ts) e os botões ‹ › convivem, igual ao legado. Sem
// horário/peso/abas (exclusivos do kanban do Diário, removido — ver
// docs/react-migration.md) nem exportar PDF — gaps documentados em
// CLAUDE.md > "webapp/".
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../components/Icon";
import { TmplDocHeader } from "../components/TmplDocHeader";
import { computeKanbanDragTarget, useDragReorder } from "../lib/dnd";
import type { KanbanDoc as KanbanDocType } from "../lib/types";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function KanbanDoc({ doc }: { doc: KanbanDocType }) {
  const updateTemplateDoc = useAppStore((s) => s.updateTemplateDoc);
  const [editing, setEditing] = useState<{ ci: number; ii: number } | null>(null);

  function save(cols: KanbanDocType["cols"]) {
    updateTemplateDoc({ ...doc, cols });
  }

  function moveCard(ci: number, ii: number, dir: -1 | 1) {
    const target = ci + dir;
    if (target < 0 || target >= doc.cols.length) return;
    const cols = doc.cols.map((c) => ({ ...c, items: [...c.items] }));
    const [it] = cols[ci].items.splice(ii, 1);
    cols[target].items.push(it);
    save(cols);
  }

  const colRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  function moveCardTo(fromCol: number, fromIndex: number, toCol: number, toIndex: number) {
    const cols = doc.cols.map((c) => ({ ...c, items: [...c.items] }));
    const [it] = cols[fromCol].items.splice(fromIndex, 1);
    cols[toCol].items.splice(Math.min(toIndex, cols[toCol].items.length), 0, it);
    save(cols);
  }

  const { dragFrom, dragOver, dragHandleProps } = useDragReorder((from, to) =>
    moveCardTo(from.container, from.index, to.container, to.index),
  );

  return (
    <div className="screen">
      <TmplDocHeader doc={doc} onTitleChange={(title) => updateTemplateDoc({ ...doc, title })} />
      <div className="kb-board">
        {doc.cols.map((c, ci) => (
          <div
            className={"kb-col" + (dragOver?.container === ci ? " kb-drop" : "")}
            key={ci}
            ref={(el) => {
              colRefs.current[ci] = el;
            }}
          >
            <div className="kb-head">
              {c.title} <span className="dev-n">{c.items.length}</span>
            </div>
            <div className="kb-cards">
              {c.items.map((it, ii) =>
                editing && editing.ci === ci && editing.ii === ii ? (
                  <CardEdit
                    key={it.id}
                    text={it.text}
                    onCancel={() => setEditing(null)}
                    onDelete={() => {
                      const cols = doc.cols.map((x) => ({ ...x, items: [...x.items] }));
                      cols[ci].items.splice(ii, 1);
                      save(cols);
                      setEditing(null);
                    }}
                    onSave={(text) => {
                      const cols = doc.cols.map((x) => ({ ...x, items: [...x.items] }));
                      cols[ci].items[ii] = { ...cols[ci].items[ii], text };
                      save(cols);
                      setEditing(null);
                    }}
                  />
                ) : (
                  <div
                    className={"kb-card" + (dragFrom?.container === ci && dragFrom.index === ii ? " dragging" : "")}
                    key={it.id}
                    ref={(el) => {
                      cardRefs.current.set(it.id, el);
                    }}
                  >
                    <div className="kb-card-top">
                      <span
                        className="kb-drag"
                        {...dragHandleProps({ container: ci, index: ii }, (x, y) => {
                          const columns = doc.cols.map((_, i) => ({
                            containerIndex: i,
                            rect: colRefs.current[i]!.getBoundingClientRect(),
                          }));
                          const draggedId = it.id;
                          return computeKanbanDragTarget(
                            columns,
                            (containerIndex) =>
                              doc.cols[containerIndex].items
                                .filter((x2) => x2.id !== draggedId)
                                .map((x2) => cardRefs.current.get(x2.id))
                                .filter((el): el is HTMLDivElement => el != null)
                                .map((el) => el.getBoundingClientRect()),
                            x,
                            y,
                            ci,
                          );
                        })}
                      >
                        <Icon name="bars3" size={15} />
                      </span>
                      <span className="kb-text" onClick={() => setEditing({ ci, ii })}>
                        {it.text}
                      </span>
                    </div>
                    <div className="kb-card-bot">
                      <div className="kb-moves">
                        <button className="kb-move-btn" disabled={ci === 0} onClick={() => moveCard(ci, ii, -1)}>
                          &lsaquo;
                        </button>
                        <button
                          className={"kb-move-btn" + (ci === doc.cols.length - 2 ? " para-feito" : "")}
                          disabled={ci === doc.cols.length - 1}
                          onClick={() => moveCard(ci, ii, 1)}
                        >
                          {ci === doc.cols.length - 2 ? <Icon name="check" size={14} /> : "›"}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const inp = e.currentTarget.querySelector("input") as HTMLInputElement;
                const val = inp.value.trim();
                if (!val) return;
                const cols = doc.cols.map((x) => ({ ...x, items: [...x.items] }));
                cols[ci].items.push({ id: uid(), text: val });
                save(cols);
                inp.value = "";
              }}
            >
              <input type="text" className="kb-add" placeholder="+ item (Enter)" enterKeyHint="done" />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardEdit({
  text,
  onSave,
  onDelete,
  onCancel,
}: {
  text: string;
  onSave: (text: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(text);
  return (
    <div className="kb-card kb-editing">
      <input
        type="text"
        className="kb-e-text"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave(val.trim() || text)}
      />
      <div className="notice-actions kb-e-acoes" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <button className="ghost" style={{ color: "var(--erro)" }} onClick={onDelete}>
          <Icon name="trash" size={15} />
        </button>
        <button onClick={() => onSave(val.trim() || text)}>Salvar</button>
      </div>
      <button className="ghost" style={{ marginTop: 6 }} onClick={onCancel}>
        cancelar
      </button>
    </div>
  );
}
