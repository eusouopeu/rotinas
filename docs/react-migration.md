# Migração React/Vite — estado e limites

`webapp/` é uma reescrita incremental; legado na raiz ainda é produção e os comandos APK/Electron o empacotam. Não tente concluir a migração numa tarefa. O corte só ocorre quando telas, lógica e pontes nativas tiverem paridade.

Vite usa `root:"webapp"`, `base:"./"`, saída `webapp-dist`; TypeScript é estrito. Scripts: `dev:react`, `build:react`, `test:react`, `typecheck:react`. Estado: store Zustand e storage compatível com os mesmos formatos/dados legados. O CSS é o `app.css` raiz importado por `main.tsx`; não há Tailwind/CSS Modules. Preserve `#app`.

Portados parcialmente: Home, Settings (incluindo Backup, Sincronização com nuvem e Integrações MCP), RoutineEditor/Detail, Player/Done, Metas, Diário (texto + agenda de time-blocking lida da nota), Notes/NoteEditor, pastas/documentos de modelo (scoreboard, thoughtrecord, proscons, mercado, matriz 2×2, kanban, viagem) e Despesas (`ExpenseFolder.tsx` — tela dedicada fora do molde genérico de doc, cada lançamento é a própria "nota"). Gamificação/scoring/metas têm lógica real e testes. Ainda faltam, entre outros, calendário externo (iCal), mini player, simulação de pontuação e consolidação do drag-and-drop. `templates` é passthrough genérico para não destruir documentos não tipados.

**Excluídos por decisão explícita (não portar):** PIN de bloqueio e atalhos de teclado globais. Não recriar.

Backup (`lib/backup.ts` + `components/BackupCard.tsx`): exportar/importar backup completo em JSON (mesclar ou substituir tudo), mesmas 9 coleções do legado — `load()`/`save()` leem/escrevem direto do storage as coleções sem estado no React (snoozes/diaKanban/exercicios/compromissos), então o backup fica completo mesmo para quem também usa o app legado no mesmo perfil. Fora do escopo: backup automático em arquivo (File System Access API), cópia automática nativa e import de item avulso ("rotina-share"/"modelo-share").

Drive e MCP (`lib/nativeBridge.ts` + `components/SyncCard.tsx`/`McpCard.tsx`): cards de UI portados fielmente, delegando tudo à mesma ponte que o legado usa (`window.electronBridge.sync`/`.mcp` no desktop, plugin Capacitor `DriveSync` no Android) — nenhuma lógica de OAuth, merge, criptografia ou protocolo MCP foi reimplementada. **Importante:** hoje o Electron carrega `www/index.html` (o legado), não `webapp-dist` — `window.electronBridge` não existe no runtime do React ainda, então esses dois cards estão prontos mas **inertes/não testados** até o dia em que o Electron passar a apontar para o build do React. Os handlers de tool do MCP (`list_routines`, `append_diario` etc., index.html:14520-14620) continuam fora do escopo — dependem de kanban do Diário e outras coleções ainda não portadas.

Despesas (`lib/expense.ts` + `screens/ExpenseFolder.tsx`): busca/filtro (texto, intervalo de datas, categoria), lista agrupada por mês com repartição por categoria, e gráficos (tendência por período + donut) — tudo com dados reais. Sem import/export CSV nem sugestão de categoria por histórico (`sugerirCategoriaDespesa`).

Agenda do Diário (`lib/agenda.ts`): parser de time-blocking (dia) e dos 3 formatos de lista (semana/mês/ano) só lê a nota Markdown — cartões do kanban do Diário, compromissos avulsos e eventos iCal (nenhum ainda no React) não entram na grade. Clique num bloco alterna feito/pendente; adiar por swipe/arrastar e o calendário mensal (`calendarioMesHtml`) ficaram de fora.

Modelos de mercado/viagem: sem chips de frequência (K_MKFREQ), sem reordenar gôndola/categoria e sem compartilhar como texto. Matriz: sem expandir quadrante nem editar rótulos dos eixos. Kanban de modelo: sem arrastar cartão (só mover com botões), sem PDF em nenhum dos quatro.

Riscos: live Markdown requer fase própria por causa da reconciliação React; DnD deve convergir em hook único, não seis cópias; MCP volta apenas com cobertura suficiente. Há bug upstream no sticky desktop do CSS compartilhado; não corrija incidentalmente durante port.
