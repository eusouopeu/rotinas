# DnD Consolidado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar a lógica de arrastar-para-reordenar do legado (hoje duplicada em pointer-events ad-hoc) num hook único reutilizável, e usá-lo para dar drag-and-drop real às etapas de rotina (`RoutineEditor.tsx`, hoje sem nenhum reorder) e aos cartões do Kanban de modelo (`KanbanDoc.tsx`, hoje só com botões).

**Architecture:** `webapp/src/lib/dnd.ts` expõe duas funções puras de cálculo de alvo (`computeStepDragTarget` para lista única, `computeKanbanDragTarget` para múltiplas colunas), uma função de baixo nível `attachDragHandle` que faz o ciclo de vida do Pointer Event (capture/move/up/cancel) sem depender de React, e um hook `useDragReorder` que embrulha isso com `useState` pra expor classes de highlight aos componentes. Cada consumidor mede suas próprias posições via refs e passa uma função `computeTarget(x, y)` fechada sobre essas medições.

**Tech Stack:** React 18 + TypeScript estrito + Vitest + @testing-library/react (uso inédito neste repo — primeira suíte de teste em nível de componente). Sem bibliotecas de DnD de terceiros.

**Spec:** `docs/superpowers/specs/2026-08-30-dnd-consolidado-design.md`

## Global Constraints

- Sem Tailwind/CSS Modules — reaproveitar classes já existentes em `app.css`: `.step-row.dragging`/`.drop-above`/`.drop-below`, `.kb-card.dragging`, `.kb-col.kb-drop`, `.kb-drag`, `.drag-handle`.
- `persistência` exclusivamente via `load`/`save`/`removeKey` — não se aplica diretamente a esta fase (sem storage novo), mas o reorder final passa pelas actions existentes do store (`updateDraft`, `updateTemplateDoc`), nunca acesso direto.
- Preservar paridade exata com o legado: `RoutineEditor.tsx` não ganha nenhum botão de reordenar que o legado não tem (só arraste); `KanbanDoc.tsx` mantém os botões `‹ ›` existentes e só adiciona a alça de arraste por cima.
- `npm test` uma vez, no fim, antes do commit final (não a cada task).
- `tsc`/`typecheck:react` pode rodar à vontade durante o trabalho.

---

## File Structure

- **Create** `webapp/src/lib/dnd.ts` — toda a lógica de DnD: funções puras de cálculo de alvo + `attachDragHandle` + hook `useDragReorder`. Um arquivo só porque as três peças são pequenas e sempre mudam juntas (é a unidade "drag-and-drop consolidado" da spec).
- **Create** `webapp/src/lib/dnd.test.ts` — testes das funções puras e do `attachDragHandle` (sem precisar montar React).
- **Modify** `webapp/src/screens/RoutineEditor.tsx` — adiciona alça de arraste na lista de etapas.
- **Create** `webapp/src/screens/RoutineEditor.test.tsx` — primeiro teste de componente do projeto; cobre o reorder de etapas por arraste.
- **Modify** `webapp/src/screens/KanbanDoc.tsx` — adiciona alça de arraste nos cartões, mantendo os botões.
- **Create** `webapp/src/screens/KanbanDoc.test.tsx` — cobre o reorder de cartões por arraste (mesma coluna e entre colunas).
- **Modify** `docs/react-migration.md` — tira "consolidação do drag-and-drop" da lista de faltantes.

---

### Task 1: Funções puras de cálculo de alvo

**Files:**
- Create: `webapp/src/lib/dnd.ts`
- Test: `webapp/src/lib/dnd.test.ts`

**Interfaces:**
- Produces: `export interface DragTarget { container: number; index: number }`, `export function computeStepDragTarget(rects: DOMRect[], from: number, pointerY: number): number`, `export function computeKanbanDragTarget(columns: Array<{ containerIndex: number; rect: DOMRect }>, otherItemRects: (containerIndex: number) => DOMRect[], pointerX: number, pointerY: number, fallbackContainer: number): DragTarget`

- [ ] **Step 1: Write the failing tests**

```ts
// webapp/src/lib/dnd.test.ts
import { describe, expect, it } from "vitest";
import { computeKanbanDragTarget, computeStepDragTarget } from "./dnd";

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
    { containerIndex: 0, rect: rect(0, 500) },
    { containerIndex: 1, rect: rect(0, 500) },
  ];
  // colunas lado a lado: sobrescreve left/right pra simular grade horizontal
  columns[0].rect = { ...columns[0].rect, left: 0, right: 200 } as DOMRect;
  columns[1].rect = { ...columns[1].rect, left: 200, right: 400 } as DOMRect;

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:react -- dnd.test.ts`
Expected: FAIL — `Cannot find module './dnd'` (arquivo ainda não existe)

- [ ] **Step 3: Implement the pure functions**

```ts
// webapp/src/lib/dnd.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:react -- dnd.test.ts`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/dnd.ts webapp/src/lib/dnd.test.ts
git commit -m "webapp: funções puras de cálculo de alvo do drag-and-drop"
```

---

### Task 2: Ciclo de vida do pointer (`attachDragHandle`) e hook `useDragReorder`

**Files:**
- Modify: `webapp/src/lib/dnd.ts`
- Test: `webapp/src/lib/dnd.test.ts`

**Interfaces:**
- Consumes: `DragTarget` (Task 1)
- Produces: `export function attachDragHandle(opts: { handle: HTMLElement; pointerId: number; from: DragTarget; computeTarget: (x: number, y: number) => DragTarget; onMove: (target: DragTarget) => void; onEnd: (finalTarget: DragTarget, committed: boolean) => void }): void`, `export function useDragReorder(onDrop: (from: DragTarget, to: DragTarget) => void): { dragFrom: DragTarget | null; dragOver: DragTarget | null; dragHandleProps: (from: DragTarget, computeTarget: (x: number, y: number) => DragTarget) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void } }`

- [ ] **Step 1: Write the failing test for `attachDragHandle`**

```ts
// acrescentar em webapp/src/lib/dnd.test.ts
import { attachDragHandle } from "./dnd";

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
      computeTarget: (x, y) => ({ container: 0, index: y > 50 ? 1 : 0 }),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:react -- dnd.test.ts`
Expected: FAIL — `attachDragHandle is not a function`

- [ ] **Step 3: Implement `attachDragHandle` and `useDragReorder`**

```ts
// acrescentar em webapp/src/lib/dnd.ts
import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:react -- dnd.test.ts`
Expected: PASS (10 testes no total)

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/dnd.ts webapp/src/lib/dnd.test.ts
git commit -m "webapp: ciclo de vida do pointer e hook useDragReorder"
```

---

### Task 3: Arraste nas etapas de rotina (`RoutineEditor.tsx`)

**Files:**
- Modify: `webapp/src/screens/RoutineEditor.tsx`
- Test: `webapp/src/screens/RoutineEditor.test.tsx`

**Interfaces:**
- Consumes: `useDragReorder`, `computeStepDragTarget`, `DragTarget` de `../lib/dnd`

- [ ] **Step 1: Write the failing test**

```tsx
// webapp/src/screens/RoutineEditor.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { RoutineEditor } from "./RoutineEditor";
import { useAppStore } from "../store/useAppStore";

function mockRect(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = () => ({ top, height, bottom: top + height, left: 0, right: 300, x: 0, y: top, width: 300, toJSON: () => ({}) }) as DOMRect;
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
    const rows = screen.getAllByRole("textbox", { name: "" }).length; // sanity: renderizou
    expect(rows).toBeGreaterThan(0);

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
    fireEvent(handle, new PointerEvent("pointermove", { pointerId: 1, clientX: 0, clientY: 200 }));
    fireEvent(handle, new PointerEvent("pointerup", { pointerId: 1 }));

    const names = Array.from(document.querySelectorAll(".step-fields input[type='text']")).map((i) => (i as HTMLInputElement).value);
    expect(names).toEqual(["Dois", "Três", "Um"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:react -- RoutineEditor.test.tsx`
Expected: FAIL — não existe `.drag-handle` em `RoutineEditor.tsx` ainda

- [ ] **Step 3: Wire the drag handle**

```tsx
// webapp/src/screens/RoutineEditor.tsx — no topo, junto dos outros imports
import { computeStepDragTarget, useDragReorder } from "../lib/dnd";
import { useRef } from "react";
```

```tsx
// dentro de export function RoutineEditor(), depois de removeStep/toggleDia
const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

function reorderSteps(fromIndex: number, toIndex: number) {
  const steps = [...draft!.steps];
  const [moved] = steps.splice(fromIndex, 1);
  steps.splice(toIndex, 0, moved);
  updateDraft({ steps });
}

const { dragFrom, dragOver, dragHandleProps } = useDragReorder((from, to) => reorderSteps(from.index, to.index));
```

```tsx
// substituir o map de etapas (dentro de .steps-list) por:
{draft.steps.map((s, i) => (
  <div
    className={
      "step-row" +
      (dragFrom?.index === i ? " dragging" : "") +
      (dragOver && dragFrom && dragOver.index === i && dragOver.index !== dragFrom.index
        ? dragOver.index < dragFrom.index
          ? " drop-above"
          : " drop-below"
        : "")
    }
    key={s.id}
    ref={(el) => {
      stepRefs.current[i] = el;
    }}
  >
    <span
      className="drag-handle"
      {...dragHandleProps({ container: 0, index: i }, (_x, y) => ({
        container: 0,
        index: computeStepDragTarget(
          stepRefs.current.map((el) => el!.getBoundingClientRect()),
          i,
          y,
        ),
      }))}
    >
      <Icon name="bars3" size={15} />
    </span>
    <div className="step-num">{i + 1}</div>
    <div className="step-fields">
      {/* ...conteúdo existente sem mudança... */}
```

(o restante do bloco — inputs de nome/duração e o botão de excluir — continua igual, só o wrapper e a alça são novos).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:react -- RoutineEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add webapp/src/screens/RoutineEditor.tsx webapp/src/screens/RoutineEditor.test.tsx
git commit -m "webapp: arraste pra reordenar etapas em RoutineEditor"
```

---

### Task 4: Arraste nos cartões do Kanban de modelo (`KanbanDoc.tsx`)

**Files:**
- Modify: `webapp/src/screens/KanbanDoc.tsx`
- Test: `webapp/src/screens/KanbanDoc.test.tsx`

**Interfaces:**
- Consumes: `useDragReorder`, `computeKanbanDragTarget`, `DragTarget` de `../lib/dnd`

- [ ] **Step 1: Write the failing test**

```tsx
// webapp/src/screens/KanbanDoc.test.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { KanbanDoc } from "./KanbanDoc";
import { useAppStore } from "../store/useAppStore";
import type { KanbanDoc as KanbanDocType } from "../lib/types";

function mockRect(el: HTMLElement, opts: { top: number; height?: number; left: number; right: number }) {
  const height = opts.height ?? 40;
  el.getBoundingClientRect = () =>
    ({ top: opts.top, height, bottom: opts.top + height, left: opts.left, right: opts.right, x: opts.left, y: opts.top, width: opts.right - opts.left, toJSON: () => ({}) }) as DOMRect;
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:react -- KanbanDoc.test.tsx`
Expected: FAIL — não existe `.kb-drag` em `KanbanDoc.tsx` ainda

- [ ] **Step 3: Wire the drag handle**

```tsx
// webapp/src/screens/KanbanDoc.tsx — imports
import { useRef } from "react";
import { computeKanbanDragTarget, useDragReorder } from "../lib/dnd";
```

```tsx
// dentro de export function KanbanDoc({ doc }: ...), depois de moveCard
const colRefs = useRef<Array<HTMLDivElement | null>>([]);
const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

function moveCardTo(fromCol: number, fromIndex: number, toCol: number, toIndex: number) {
  const cols = doc.cols.map((c) => ({ ...c, items: [...c.items] }));
  const [it] = cols[fromCol].items.splice(fromIndex, 1);
  cols[toCol].items.splice(Math.min(toIndex, cols[toCol].items.length), 0, it);
  save(cols);
}

const { dragFrom, dragOver, dragHandleProps } = useDragReorder((from, to) => moveCardTo(from.container, from.index, to.container, to.index));
```

```tsx
// dentro do map de doc.cols, no <div className="kb-col" key={ci}> — adicionar ref:
<div
  className={"kb-col" + (dragOver?.container === ci ? " kb-drop" : "")}
  key={ci}
  ref={(el) => {
    colRefs.current[ci] = el;
  }}
>
```

```tsx
// dentro do map de items (branch "não editando"), no <div className="kb-card" key={it.id}> — adicionar ref e alça:
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
        const columns = doc.cols.map((_, i) => ({ containerIndex: i, rect: colRefs.current[i]!.getBoundingClientRect() }));
        const draggedId = it.id;
        return computeKanbanDragTarget(
          columns,
          (containerIndex) =>
            doc.cols[containerIndex].items
              .filter((x) => x.id !== draggedId)
              .map((x) => cardRefs.current.get(x.id))
              .filter((el): el is HTMLDivElement => el !== null && el !== undefined)
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
  {/* .kb-card-bot com os botões existentes continua igual */}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:react -- KanbanDoc.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add webapp/src/screens/KanbanDoc.tsx webapp/src/screens/KanbanDoc.test.tsx
git commit -m "webapp: arraste pra mover cartões em KanbanDoc"
```

---

### Task 5: Fechar a fase — typecheck, suíte completa e docs

**Files:**
- Modify: `docs/react-migration.md`

- [ ] **Step 1: Rodar typecheck**

Run: `npm run typecheck:react`
Expected: sem erros

- [ ] **Step 2: Rodar a suíte completa uma vez**

Run: `npm test`
Expected: todos os testes (legado + React) passam

- [ ] **Step 3: Atualizar `docs/react-migration.md`**

Tirar "consolidação do drag-and-drop" da lista "Ainda faltam" (linha 7) e do parágrafo de riscos (linha ~19), registrando que `lib/dnd.ts` cobre reordenar etapas e cartões do Kanban de modelo.

- [ ] **Step 4: Commit final**

```bash
git add docs/react-migration.md
git commit -m "docs: marca DnD consolidado como concluído em react-migration.md"
```

---

## Validação manual (fora do automatizado)

Depois da Task 5, abrir `npm run dev:react`, comparar visualmente com o legado (`index.html` no navegador):
1. Arrastar uma etapa em RoutineEditor pra cima e pra baixo — nome/duração acompanham, ordem final bate com onde foi solto.
2. Arrastar um cartão do Kanban de modelo dentro da mesma coluna e para outra coluna — cartão aparece na posição certa, botões `‹ ›` continuam funcionando depois.
3. Soltar um cartão/etapa fora de qualquer área válida — nada muda (mesmo comportamento do legado).
