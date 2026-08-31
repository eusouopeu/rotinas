import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { KanbanDoc } from "./KanbanDoc";
import { useAppStore } from "../store/useAppStore";
import type { KanbanDoc as KanbanDocType } from "../lib/types";

function mockRect(el: HTMLElement, opts: { top: number; height?: number; left: number; right: number }) {
  const height = opts.height ?? 40;
  el.getBoundingClientRect = () =>
    ({
      top: opts.top,
      height,
      bottom: opts.top + height,
      left: opts.left,
      right: opts.right,
      x: opts.left,
      y: opts.top,
      width: opts.right - opts.left,
      toJSON: () => ({}),
    }) as DOMRect;
}

function baseDoc(): KanbanDocType {
  return {
    id: "k1",
    kind: "kanban",
    title: "Teste",
    cols: [
      { title: "A fazer", items: [{ id: "i1", text: "Um" }, { id: "i2", text: "Dois" }] },
      { title: "Fazendo", items: [] },
      { title: "Feito", items: [] },
    ],
  } as any;
}

beforeEach(() => {
  useAppStore.setState({ templates: [baseDoc()] as any });
});

describe("KanbanDoc — reordenar cartões por arraste", () => {
  it("move o cartão pra outra coluna ao soltar lá dentro", () => {
    const doc = baseDoc();
    render(<KanbanDoc doc={doc} />);

    const cols = document.querySelectorAll(".kb-col");
    mockRect(cols[0] as HTMLElement, { top: 0, height: 500, left: 0, right: 200 });
    mockRect(cols[1] as HTMLElement, { top: 0, height: 500, left: 200, right: 400 });
    mockRect(cols[2] as HTMLElement, { top: 0, height: 500, left: 400, right: 600 });

    const handles = document.querySelectorAll(".kb-drag");
    expect(handles).toHaveLength(2);
    const handle = handles[0] as HTMLElement;
    handle.setPointerCapture = () => {};
    handle.releasePointerCapture = () => {};

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent(handle, new PointerEvent("pointermove", { pointerId: 1, clientX: 250, clientY: 10 }));
    fireEvent(handle, new PointerEvent("pointerup", { pointerId: 1 }));

    const updated = useAppStore.getState().templates[0] as KanbanDocType;
    expect(updated.cols[0].items.map((i) => i.text)).toEqual(["Dois"]);
    expect(updated.cols[1].items.map((i) => i.text)).toEqual(["Um"]);
  });
});
