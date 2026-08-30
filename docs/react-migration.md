# Migração React/Vite — estado e limites

`webapp/` é uma reescrita incremental; legado na raiz ainda é produção e os comandos APK/Electron o empacotam. Não tente concluir a migração numa tarefa. O corte só ocorre quando telas, lógica e pontes nativas tiverem paridade.

Vite usa `root:"webapp"`, `base:"./"`, saída `webapp-dist`; TypeScript é estrito. Scripts: `dev:react`, `build:react`, `test:react`, `typecheck:react`. Estado: store Zustand e storage compatível com os mesmos formatos/dados legados. O CSS é o `app.css` raiz importado por `main.tsx`; não há Tailwind/CSS Modules. Preserve `#app`.

Portados parcialmente: Home, Settings, RoutineEditor/Detail, Player/Done, Metas, Diário (texto + agenda de time-blocking lida da nota), Notes/NoteEditor, pastas/documentos de modelo (scoreboard, thoughtrecord, proscons, mercado, matriz 2×2, kanban, viagem) e Despesas (`ExpenseFolder.tsx` — tela dedicada fora do molde genérico de doc, cada lançamento é a própria "nota"). Gamificação/scoring/metas têm lógica real e testes. Ainda faltam, entre outros, backup/import, Drive, MCP, PIN, atalhos globais e consolidação do drag-and-drop. `templates` é passthrough genérico para não destruir documentos não tipados.

Despesas (`lib/expense.ts` + `screens/ExpenseFolder.tsx`): busca/filtro (texto, intervalo de datas, categoria), lista agrupada por mês com repartição por categoria, e gráficos (tendência por período + donut) — tudo com dados reais. Sem import/export CSV nem sugestão de categoria por histórico (`sugerirCategoriaDespesa`).

Agenda do Diário (`lib/agenda.ts`): parser de time-blocking (dia) e dos 3 formatos de lista (semana/mês/ano) só lê a nota Markdown — cartões do kanban do Diário, compromissos avulsos e eventos iCal (nenhum ainda no React) não entram na grade. Clique num bloco alterna feito/pendente; adiar por swipe/arrastar e o calendário mensal (`calendarioMesHtml`) ficaram de fora.

Modelos de mercado/viagem: sem chips de frequência (K_MKFREQ), sem reordenar gôndola/categoria e sem compartilhar como texto. Matriz: sem expandir quadrante nem editar rótulos dos eixos. Kanban de modelo: sem arrastar cartão (só mover com botões), sem PDF em nenhum dos quatro.

Riscos: live Markdown requer fase própria por causa da reconciliação React; DnD deve convergir em hook único, não seis cópias; MCP volta apenas com cobertura suficiente. Há bug upstream no sticky desktop do CSS compartilhado; não corrija incidentalmente durante port.
