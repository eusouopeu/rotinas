# Plano de ação — restante da migração React (sem Tailwind)

Data: 2026-08-30
Escopo: fechar a migração de `index.html`/`app.css` (legado, produção) para `webapp/` (React + TypeScript + Vite + Zustand), até o corte final de produção. Sem Tailwind — mantém `app.css`/tokens CSS existentes, conforme regra vigente do `CLAUDE.md`.

## Decisões já tomadas (não reabrir sem novo pedido explícito)

- **Sem Tailwind.** Nenhuma tela, nova ou já portada, migra para Tailwind. `app.css` continua sendo o único sistema visual.
- **Meta final é o corte de produção**, não só continuar portando: o plano cobre também as condições para Electron/Android apontarem para `webapp-dist` em vez do legado.
- **Exclusões mantidas:** PIN de bloqueio e atalhos de teclado globais não são recriados no React (decisão já registrada em `docs/react-migration.md`).
- **Processo proporcional ao risco (abordagem B):** processo pesado (brainstorming → spec → writing-plans → gsd-execute-phase) reservado às duas fases estruturais de risco já identificadas em `docs/react-migration.md` — consolidação de drag-and-drop e reconciliação do editor Markdown live. Todo o resto usa `gsd-quick`/`gsd-fast` com plano curto inline. `context-mode` (`ctx_batch_execute`/`ctx_execute_file`) é usado em toda fase para explorar `index.html` (14,7k linhas) e `webapp/src` sem carregar os arquivos brutos na conversa.

## O que falta portar (base: `docs/react-migration.md`)

1. Consolidação de drag-and-drop (hoje seis cópias divergentes no legado) — **fase de risco**.
2. Editor Markdown live — reconciliação própria por causa do modelo de render do React — **fase de risco**.
3. Agenda inline em Rotinas (dia/semana, hoje reaproveitando `lib/agenda.ts`/`lib/diario.ts` já portados mas sem UI): calendário mensal (`calendarioMesHtml`), compromissos avulsos, eventos iCal, adiar bloco por swipe/arrastar. **Correção 30/08/2026:** não existe mais aba "Diário" — foi removida do legado (commit `c627f33`); a agenda mora dentro de Rotinas. `screens/Diario.tsx`, portado por engano como tela própria, foi removido; ver `docs/react-migration.md`.
4. Mini player.
5. Simulação de pontuação.
6. MCP: handlers de tool (`list_routines`, `append_diario` etc.) — depende do kanban do dia (K_DIAKANBAN) e de outras coleções ainda não portadas.
7. Gaps pontuais de doc-types já portados: CSV import/export e sugestão de categoria em Despesas; chips de frequência/reordenar gôndola/compartilhar texto em Mercado; expandir quadrante/editar eixos na Matriz; drag e PDF nos quatro tipos de doc de Modelos.
8. Bug upstream do sticky desktop no CSS compartilhado — **não corrigir incidentalmente**, só se virar bloqueio de alguma fase.
9. Corte final: paridade completa validada, Electron passa a carregar `webapp-dist` em vez de `www/index.html`, Android/Capacitor idem, verificação de que `window.electronBridge`/plugin `DriveSync` funcionam de fato no runtime React (hoje os cards de Sync/MCP estão portados mas inertes).

## Sequenciamento proposto

Ordem por dependência técnica e risco, não por prioridade de produto:

1. **Drag-and-drop consolidado** (fase de risco) — bloqueia qualquer DnD nas fases 3, 4 e 7 (Modelos/Kanban).
2. **Editor Markdown live** (fase de risco) — bloqueia trabalho futuro em qualquer tela com edição de nota livre; isolado dos demais itens.
3. **Agenda inline em Rotinas** (calendário mensal, compromissos avulsos, iCal, adiar bloco) — depende do DnD consolidado para adiar por arrastar.
4. **Mini player** e **simulação de pontuação** — independentes entre si, podem entrar em paralelo depois das fases de risco.
5. **Gaps de doc-types** (Despesas CSV, Mercado, Matriz, Modelos DnD/PDF) — depende do DnD consolidado para os itens de arrastar; o resto é independente.
6. **MCP (handlers de tool)** — depende do kanban do dia; entra só quando a Agenda (fase 3) tiver paridade suficiente.
7. **Corte final** — última fase; depende de todas as anteriores mais a validação de que os cards de Sync/MCP funcionam com Electron apontando para `webapp-dist`.

## Mapeamento de skills por fase

| Fase | Skill/processo |
|---|---|
| DnD consolidado | `superpowers:brainstorming` → spec em `docs/superpowers/specs/` → `superpowers:writing-plans` → `gsd-execute-phase` |
| Editor Markdown live | idem — `superpowers:brainstorming` → spec → `superpowers:writing-plans` → `gsd-execute-phase` |
| Agenda inline em Rotinas | `gsd-quick` com plano curto inline; `react-migration` (skill do projeto) para o procedimento de port; `context-mode` para explorar `agenda.ts`/trechos do legado sem `Read` bruto |
| Mini player | `gsd-fast` ou `gsd-quick` (conforme tamanho real ao chegar na fase) |
| Simulação de pontuação | `gsd-quick`; consulta obrigatória a `docs/gamification.md` antes de mexer em score |
| Gaps de doc-types | `gsd-quick` por doc-type (não agrupar em uma fase única — cada gap é independente) |
| MCP handlers | `gsd-quick`; leitura pontual de `index.html:14520-14620` via `context-mode`/`ctx_execute_file`, não `Read` do arquivo inteiro |
| Corte final | `gsd-quick` para o swap de build, mas com checklist manual de `docs/release.md` e `docs/sync.md` antes de qualquer entrega de APK |

Em toda fase: `context-mode` (`ctx_batch_execute`/`ctx_search`/`ctx_execute_file`) substitui `grep`/`Read` bruto ao explorar `index.html` e `app.css`; testes Vitest antes de portar lógica pura (regra já vigente do `react-migration` skill); `npm test` uma vez por tarefa, antes do commit (memória `feedback_test_frequency`); `tsc`/typecheck à vontade durante o trabalho.

## Testes e validação

- Cada fase de doc-type/lógica: Vitest cobrindo a lógica pura portada, antes da UI.
- Fases de risco (DnD, editor live): plano de testes específico definido na spec de cada uma — inclui teste manual de paridade visual/comportamental contra o legado, não só unitário.
- Corte final: checklist completo de `docs/release.md` (versões, `BUILD_STAMP`, validação) antes de qualquer build de APK/Electron apontando para `webapp-dist`.
- `docs/react-migration.md` e `docs/feature-status.md` são atualizados ao fim de cada fase, conforme regra do projeto.

## Riscos e ressalvas

- Reconciliação do editor Markdown live é o item de maior incerteza técnica; se a spec revelar complexidade maior que o esperado, a fase pode precisar de sub-decomposição (o processo de brainstorming já cobre esse caso).
- MCP handlers dependem de coleções ainda não portadas (kanban do dia) — a ordem no sequenciamento assume que essa dependência é resolvida na fase de Agenda; se não for, MCP fica bloqueado e a fase de corte final adia.
- O corte final é a única fase que toca produção real (Electron/Android) — qualquer decisão de fazer isso precisa de aprovação explícita antes de rodar, mesmo com o plano aprovado (regra de ações de alto impacto).
- Nenhum agente concorrente edita o IIFE do legado (`index.html`) — regra inviolável do projeto; investigação isolada sem sobreposição de edição é permitida.

## Fora de escopo (não incluído neste plano)

- Tailwind, CSS Modules ou qualquer sistema visual paralelo a `app.css`.
- PIN de bloqueio e atalhos de teclado globais.
- Correção incidental do bug upstream do sticky desktop, fora de uma fase que dependa dele.
