import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface DragTarget {
  container: number;
  index: number;
}

/* Reordenar lista única (etapas): porta o cálculo de index.html:4515-4527.
   O pointer nunca "empurra" — só clampa o alvo conforme passa do ponto
   médio de cada item que ficou entre a origem e o pointer. */
export function computeStepDragTarget(rects: DOMRect[], from: number, pointerY: number): number {
  let target = from;
  rects.forEach((rect, j) => {
    if (j === from) return;
    const mid = rect.top + rect.height / 2;
    if (pointerY < mid && j < from) target = Math.min(target, j);
    if (pointerY > mid && j > from) target = Math.max(target, j);
  });
  return target;
}

/* Reordenar entre colunas (kanban): porta index.html:7745-7762. Primeiro
   acha a coluna (com 40px de margem vertical, igual ao legado), depois o
   índice na coluna alvo pelo ponto médio dos OUTROS itens (excluindo o
   cartão arrastado). */
export function computeKanbanDragTarget(
  columns: Array<{ containerIndex: number; rect: DOMRect }>,
  otherItemRects: (containerIndex: number) => DOMRect[],
  pointerX: number,
  pointerY: number,
  fallbackContainer: number,
): DragTarget {
  let container = fallbackContainer;
  for (const col of columns) {
    const inside =
      pointerX >= col.rect.left && pointerX <= col.rect.right && pointerY >= col.rect.top - 40 && pointerY <= col.rect.bottom + 40;
    if (inside) {
      container = col.containerIndex;
      break;
    }
  }
  const others = otherItemRects(container);
  let index = others.length;
  for (let j = 0; j < others.length; j++) {
    if (pointerY < others[j].top + others[j].height / 2) {
      index = j;
      break;
    }
  }
  return { container, index };
}

interface AttachDragHandleOptions {
  handle: HTMLElement;
  pointerId: number;
  from: DragTarget;
  computeTarget: (x: number, y: number) => DragTarget;
  onMove: (target: DragTarget) => void;
  onEnd: (finalTarget: DragTarget, committed: boolean) => void;
}

/* Ciclo de vida puro do pointer, sem React — porta setPointerCapture +
   onpointermove/up/cancel do legado (index.html:4507-4546 e 7737-7774).
   Comita só no pointerup; pointercancel desfaz sem commitar. */
export function attachDragHandle(opts: AttachDragHandleOptions): void {
  const { handle, pointerId, from, computeTarget, onMove, onEnd } = opts;
  try {
    handle.setPointerCapture(pointerId);
  } catch {
    /* jsdom/navegadores sem suporte: segue sem capture, igual ao legado */
  }
  let latest = from;
  const move = (ev: PointerEvent) => {
    latest = computeTarget(ev.clientX, ev.clientY);
    onMove(latest);
  };
  const cleanup = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", up);
    handle.removeEventListener("pointercancel", cancel);
    try {
      handle.releasePointerCapture(pointerId);
    } catch {
      /* idem */
    }
  };
  const up = () => {
    cleanup();
    onEnd(latest, true);
  };
  const cancel = () => {
    cleanup();
    onEnd(from, false);
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", cancel);
}

/* Hook único de reordenar-por-arraste. `computeTarget` é fornecido pelo
   consumidor (mede as próprias posições via refs) — o hook só cuida do
   ciclo de vida do pointer e do estado de highlight. */
export function useDragReorder(onDrop: (from: DragTarget, to: DragTarget) => void) {
  const [dragFrom, setDragFrom] = useState<DragTarget | null>(null);
  const [dragOver, setDragOver] = useState<DragTarget | null>(null);

  function dragHandleProps(from: DragTarget, computeTarget: (x: number, y: number) => DragTarget) {
    return {
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        e.preventDefault();
        setDragFrom(from);
        setDragOver(from);
        attachDragHandle({
          handle: e.currentTarget,
          pointerId: e.pointerId,
          from,
          computeTarget,
          onMove: setDragOver,
          onEnd: (finalTarget, committed) => {
            setDragFrom(null);
            setDragOver(null);
            const moved = finalTarget.container !== from.container || finalTarget.index !== from.index;
            if (committed && moved) onDrop(from, finalTarget);
          },
        });
      },
    };
  }

  return { dragFrom, dragOver, dragHandleProps };
}
