import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoutineEditor } from "./RoutineEditor";
import { useAppStore } from "../store/useAppStore";

function mockRect(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height, left: 0, right: 300, x: 0, y: top, width: 300, toJSON: () => ({}) }) as DOMRect;
}

beforeEach(() => {
  useAppStore.setState({
    editorDraft: {
      id: "r1",
      name: "Teste",
      steps: [
        { id: "s1", name: "Um", seconds: 60, type: "timer" },
        { id: "s2", name: "Dois", seconds: 60, type: "timer" },
        { id: "s3", name: "Três", seconds: 60, type: "timer" },
      ],
      schedule: { enabled: false, anchor: "start", time: "", days: [1, 2, 3, 4, 5] },
    } as any,
    routines: [],
  });
});

describe("RoutineEditor — reordenar etapas por arraste", () => {
  it("move a etapa arrastada pra nova posição ao soltar", () => {
    render(<RoutineEditor />);
    expect(screen.getByPlaceholderText("Nome da rotina")).toBeInTheDocument();

    const handles = document.querySelectorAll(".drag-handle");
    expect(handles).toHaveLength(3);
    const stepRows = document.querySelectorAll(".step-row");
    mockRect(stepRows[0] as HTMLElement, 0, 80);
    mockRect(stepRows[1] as HTMLElement, 80, 80);
    mockRect(stepRows[2] as HTMLElement, 160, 80);

    const handle = handles[0] as HTMLElement;
    handle.setPointerCapture = () => {};
    handle.releasePointerCapture = () => {};
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 10 });
    fireEvent(handle, new PointerEvent("pointermove", { pointerId: 1, clientX: 0, clientY: 210 }));
    fireEvent(handle, new PointerEvent("pointerup", { pointerId: 1 }));

    const names = Array.from(document.querySelectorAll(".step-fields input[type='text']")).map((i) => (i as HTMLInputElement).value);
    expect(names).toEqual(["Dois", "Três", "Um"]);
  });
});
