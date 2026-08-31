# Fase de risco 1 — Consolidação de drag-and-drop

Data: 2026-08-30
Contexto: `docs/superpowers/specs/2026-08-30-migracao-react-restante-design.md` (plano geral), item "DnD consolidado".

## Escopo

Um hook único de reordenar-por-arraste, cobrindo só a família "reordenar" (produz mudança de posição num array) — não inclui swipe-to-reveal nem swipe de navegação de página, que são um padrão de interação diferente e ficam fora desta fase.

Consumidores (os dois já documentados como bloqueados no React, esperando este hook):
1. **Etapas** — `RoutineEditor.tsx` (criar/editar rotina) e, por extensão, o mesmo padrão em `RoutineDetail.tsx` quando ganhar edição inline.
2. **Cartões do Kanban de modelo** — `KanbanDoc.tsx`, hoje só com botões `‹ ›` (`kb-move-btn`).

Kanban do Diário fica fora: a aba Diário foi removida do legado (ver `docs/react-migration.md`), então não há esse consumidor.

## Referência no legado

Pointer Events puro (`setPointerCapture`/`onpointermove`/`onpointerup`), não HTML5 drag/drop nativo:
- Etapas: index.html:4506-4547 (alça `data-drag`, container único, cálculo de índice-alvo por ponto médio vertical).
- Kanban: index.html:7735-7775 (alça `data-kbdrag`, multi-coluna, cálculo de coluna-alvo por `getBoundingClientRect` + índice-alvo por ponto médio).

Os dois padrões são idênticos na essência: capturar o pointer na alça, medir posições a cada `pointermove`, e só commitar no `pointerup`. A diferença é single-container (etapas) vs. multi-container (kanban).

## Arquitetura

Hook `useDragReorder` em `webapp/src/lib/dnd.ts` (lógica pura + um hook React, sem JSX — arquivo `.ts`).

```ts
type Point = { x: number; y: number };

interface ContainerSnapshot {
  containerIndex: number;
  itemRects: DOMRect[]; // uma por item, na ordem atual do container
}

interface UseDragReorderOptions {
  getContainers: () => ContainerSnapshot[];
  onDrop: (from: { container: number; index: number }, to: { container: number; index: number }) => void;
}

function useDragReorder(opts: UseDragReorderOptions): {
  dragHandleProps: (container: number, index: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
  };
  dragState: { container: number; index: number; overContainer: number; overIndex: number } | null;
};
```

- `getContainers()` é chamado no `pointerdown` e a cada `pointermove` — devolve um snapshot fresco das posições (os consumidores medem `getBoundingClientRect()` dos elementos via refs que eles próprios mantêm; o hook não faz query de DOM).
- Caso de container único (etapas): `getContainers()` sempre devolve um array com 1 `ContainerSnapshot`.
- Caso multi-container (Kanban): um `ContainerSnapshot` por coluna.
- O hook calcula o container-alvo (ponto dentro do `boundingRect` da coluna, com margem de 40px como no legado) e o índice-alvo (ponto médio de cada item, excluindo o item arrastado) — mesma lógica do legado, só parametrizada.
- `dragState` é exposto pro consumidor aplicar classes de highlight (`dragging` no item de origem, `drop-above`/`drop-below` no item mais próximo, `kb-drop` no container-alvo) — são classes já existentes em `app.css`, reaproveitadas.
- `onDrop` só dispara no `pointerup`, com a posição final. O consumidor decide o reorder real no estado (Zustand `updateRoutine`/`updateTemplateDoc`) — o hook não muta dados, só calcula from/to.
- `pointercancel` (ex: notificação do SO interrompe o gesto) reseta `dragState` sem chamar `onDrop` — mesmo comportamento do legado.
- Fallback por botão continua existindo onde já existe hoje: `kb-move-btn` (`‹ ›`) no Kanban. **Correção pós-checagem do legado:** o editor de etapas (index.html:4506-4547) nunca teve botão subir/descer — só arraste — então `RoutineEditor.tsx` replica isso fielmente (arraste como única forma de reordenar etapas, igual ao legado); não inventar um botão que a versão de produção não tem.

## Consumidores — mudanças

**`RoutineEditor.tsx`**: hoje não tem lista de etapas reordenável (por isso o comentário "fica pra quando o hook existir"). Esta fase adiciona a alça de arraste na lista de etapas, sem botão subir/descer (o legado nunca teve esse botão ali — só arraste), usando `useDragReorder` em modo single-container.

**`KanbanDoc.tsx`**: `moveCard(ci, ii, dir)` já existe para os botões. Esta fase adiciona a alça de arraste (`kb-drag`, ícone `bars3` já em `Icon.tsx`) chamando `useDragReorder` em modo multi-container, com `onDrop` fazendo o mesmo splice/insert que os botões já fazem.

## Testes

- `webapp/src/lib/dnd.test.ts`: testa a lógica pura de cálculo de alvo (dado um snapshot de containers/rects e uma sequência de posições de pointer, confere o `to` calculado) — sem precisar montar componente React, chamando as funções internas exportadas para teste (cálculo de índice-alvo e de container-alvo separados do hook em si).
- Teste de integração leve em `KanbanDoc.tsx`/`RoutineEditor.tsx`: simula a sequência de eventos de pointer (via `fireEvent.pointerDown/pointerMove/pointerUp` do Testing Library) e confere que o array final bate.
- Validação manual no navegador comparando com o comportamento do legado antes de fechar a fase.

## Fora de escopo

- Swipe-to-reveal e swipe de navegação de página (família de gesto diferente).
- Reordenar áreas da Roda (não documentado como bloqueado por este hook; fica pra quando/se for pedido).
- Drag entre Kanban do Diário (não existe mais).
