import { describe, expect, it } from "vitest";
import { attachDragHandle, computeKanbanDragTarget, computeStepDragTarget, type DragTarget } from "./dnd";

function rect(top: number, height: number): DOMRect {
  return { top, height, bottom: top + height, left: 0, right: 100, x: 0, y: top, width: 100, toJSON: () => ({}) } as DOMRect;
}

describe("computeStepDragTarget", () => {
  it("mantém o índice de origem se o pointer não passou do meio de nenhum outro item", () => {
    const rects = [rect(0, 40), rect(40, 40), rect(80, 40)];
    expect(computeStepDragTarget(rects, 1, 60)).toBe(1);
  });

  it("move pra cima quando o pointer passa do meio de um item anterior", () => {
    const rects = [rect(0, 40), rect(40, 40), rect(80, 40)];
    expect(computeStepDragTarget(rects, 2, 10)).toBe(0);
  });

  it("move pra baixo quando o pointer passa do meio de um item posterior", () => {
    const rects = [rect(0, 40), rect(40, 40), rect(80, 40)];
    expect(computeStepDragTarget(rects, 0, 110)).toBe(2);
  });
});

describe("computeKanbanDragTarget", () => {
  const columns = [
    { containerIndex: 0, rect: { ...rect(0, 500), left: 0, right: 200 } as DOMRect },
    { containerIndex: 1, rect: { ...rect(0, 500), left: 200, right: 400 } as DOMRect },
  ];

  it("fica na coluna de origem quando o pointer está fora de qualquer coluna", () => {
    const result = computeKanbanDragTarget(columns, () => [], 9999, 9999, 0);
    expect(result.container).toBe(0);
  });

  it("muda de coluna quando o pointer entra na área de outra coluna", () => {
    const others = () => [rect(0, 40), rect(40, 40)];
    const result = computeKanbanDragTarget(columns, others, 300, 10, 0);
    expect(result.container).toBe(1);
  });

  it("calcula o índice pelo ponto médio dos outros itens na coluna alvo", () => {
    const others = (ci: number) => (ci === 0 ? [rect(0, 40), rect(40, 40)] : []);
    const result = computeKanbanDragTarget(columns, others, 50, 10, 0);
    expect(result).toEqual({ container: 0, index: 0 });
  });

  it("cai no fim da coluna quando o pointer está abaixo de todos os outros itens", () => {
    const others = (ci: number) => (ci === 0 ? [rect(0, 40), rect(40, 40)] : []);
    const result = computeKanbanDragTarget(columns, others, 50, 200, 0);
    expect(result).toEqual({ container: 0, index: 2 });
  });
});

describe("attachDragHandle", () => {
  function firePointer(el: HTMLElement, type: string, clientX = 0, clientY = 0) {
    el.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX, clientY, bubbles: true }));
  }

  it("chama onMove a cada pointermove com o alvo calculado", () => {
    const handle = document.createElement("div");
    handle.setPointerCapture = () => {};
    handle.releasePointerCapture = () => {};
    const moves: DragTarget[] = [];
    attachDragHandle({
      handle,
      pointerId: 1,
      from: { container: 0, index: 0 },
      computeTarget: (_x, y) => ({ container: 0, index: y > 50 ? 1 : 0 }),
      onMove: (t) => moves.push(t),
      onEnd: () => {},
    });
    firePointer(handle, "pointermove", 0, 100);
    expect(moves).toEqual([{ container: 0, index: 1 }]);
  });

  it("chama onEnd com committed=true no pointerup, usando o último alvo calculado", () => {
    const handle = document.createElement("div");
    handle.setPointerCapture = () => {};
    handle.releasePointerCapture = () => {};
    let ended: [DragTarget, boolean] | null = null;
    attachDragHandle({
      handle,
      pointerId: 1,
      from: { container: 0, index: 0 },
      computeTarget: () => ({ container: 0, index: 2 }),
      onMove: () => {},
      onEnd: (target, committed) => {
        ended = [target, committed];
      },
    });
    firePointer(handle, "pointermove", 0, 999);
    firePointer(handle, "pointerup");
    expect(ended).toEqual([{ container: 0, index: 2 }, true]);
  });

  it("chama onEnd com committed=false e o alvo de origem no pointercancel", () => {
    const handle = document.createElement("div");
    handle.setPointerCapture = () => {};
    handle.releasePointerCapture = () => {};
    let ended: [DragTarget, boolean] | null = null;
    attachDragHandle({
      handle,
      pointerId: 1,
      from: { container: 0, index: 0 },
      computeTarget: () => ({ container: 1, index: 3 }),
      onMove: () => {},
      onEnd: (target, committed) => {
        ended = [target, committed];
      },
    });
    firePointer(handle, "pointermove", 0, 999);
    firePointer(handle, "pointercancel");
    expect(ended).toEqual([{ container: 0, index: 0 }, false]);
  });
});
