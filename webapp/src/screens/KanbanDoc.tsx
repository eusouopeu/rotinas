// Porta de renderKanbanDoc + pintarKanban sem opts (index.html:7877-7893,
// 7624-7876) — 3 colunas fixas, cartão só com texto, exportar PDF. Arrastar
// (useDragReorder, ver webapp/src/lib/dnd.ts) e os botões ‹ › convivem,
// igual ao legado. Sem horário/peso/abas — exclusivos do kanban do Diário,
// removido (ver docs/react-migration.md).
import { useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { CabecalhoDoc } from "../features/modelos/CabecalhoDoc";
import { computeKanbanDragTarget, useDragReorder } from "../lib/dnd";
import { BarraPdf } from "../features/modelos/BarraPdf";
import { CartaoKanban, EdicaoCartao } from "../features/modelos/CartaoKanban";
import { CampoNovoItem } from "../ui/CampoNovoItem";
import { cn } from "../lib/cn";
import { exportPdfView } from "../lib/exportFile";
import { kanbanPdfHtml } from "../lib/pdfExport";
import type { KanbanDoc as KanbanDocType } from "../lib/types";
import { tela } from "../ui/Tela";

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
    moveCardTo(from.container, from.index, to.container, to.index)
  );

  return (
    <div {...tela({})}>
      <CabecalhoDoc doc={doc} onTitleChange={(title) => updateTemplateDoc({ ...doc, title })} />
      <BarraPdf exportar={() => exportPdfView(doc.title, kanbanPdfHtml(doc), "Kanbans")} />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3.5 paisagem:flex-row paisagem:items-stretch paisagem:gap-2">
        {doc.cols.map((c, ci) => (
          <div
            className={cn(
              "flex max-h-[min(46vh,360px)] min-h-0 w-full flex-none flex-col rounded-[14px] border-[1.5px] border-line bg-card p-2.5 paisagem:max-h-none paisagem:w-auto paisagem:min-w-0 paisagem:flex-[1_1_0]",
              dragOver?.container === ci && "border-caneta-2"
            )}
            key={ci}
            data-coluna-kanban
            ref={(el) => {
              colRefs.current[ci] = el;
            }}
          >
            <div className="mb-2 flex items-center justify-between font-titulo text-lg font-semibold">
              {c.title} <span className="font-sans text-sm text-sub">{c.items.length}</span>
            </div>
            <div className="min-h-[60px] flex-1 overflow-y-auto">
              {c.items.map((it, ii) =>
                editing && editing.ci === ci && editing.ii === ii ? (
                  <EdicaoCartao
                    key={it.id}
                    texto={it.text}
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
                  <CartaoKanban
                    key={it.id}
                    texto={it.text}
                    arrastando={dragFrom?.container === ci && dragFrom.index === ii}
                    cartaoRef={(el) => {
                      cardRefs.current.set(it.id, el);
                    }}
                    alcaProps={dragHandleProps({ container: ci, index: ii }, (x, y) => {
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
                        ci
                      );
                    })}
                    podeVoltar={ci > 0}
                    podeAvancar={ci < doc.cols.length - 1}
                    paraFeito={ci === doc.cols.length - 2}
                    onEditar={() => setEditing({ ci, ii })}
                    onVoltar={() => moveCard(ci, ii, -1)}
                    onAvancar={() => moveCard(ci, ii, 1)}
                  />
                )
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
              <CampoNovoItem tamanho="cartao" placeholder="+ item (Enter)" enterKeyHint="done" />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
