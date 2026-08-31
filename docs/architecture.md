# Arquitetura, Markdown, Diário, Kanban e Agenda

## Estrutura e legado

Produção: `index.html` contém templates HTML e IIFE async; `app.css`, `manifest.json`, `sw.js`, fontes locais, `android/`, `electron/`, `mcp-server/`, `sync/` e testes CJS. O dispatcher lê `view={tab,screen,id?}`; tela nova exige `renderNovaTela()` e ramo no dispatcher. Renderizações substituem HTML e religam handlers; dados são arrays globais, chaves `K_*`, IDs por `uid()`. O boot aguarda `storageBackend.getAll()`.

`app.css` é link estático, não build step. Novo asset ao lado entra em `sw.js:ASSETS` e `package.json:copy:www`. PWA usa `manifest.json` e `sw.js` stale-while-revalidate. Fontes locais: Lato em títulos/cabeçalhos, Montserrat no restante; máximo duas famílias.

## Persistência, backup e nomenclatura

`load/save/removeKey` usam `mem` e backend assíncrono: IndexedDB web, Filesystem em `Directory.Data/brita/` nativo, IPC no Electron. Há migração do localStorage legado, mas código novo nunca o usa. Variáveis globais referenciadas no boot/backup devem ser declaradas no topo do IIFE (TDZ).

Convenções: renderizadores `renderNomeDaTela`; storage `K_NOMEMAIUSCULO`; ações em listas por `data-*`, não IDs únicos. Não separar o IIFE nem duplicar helpers (`confirmModal`, `wrapSwipeDelete`, `escapeHtml`, `uid`, `load/save`).

## Markdown e editor live

`renderMdBlock(texto,chave,msgVazio)` é o único parser/renderizador de leitura. O live preview é `renderLiveEditor()`: um `#liveEditor` contenteditable, texto como verdade, linha sob cursor crua e demais formatadas. Digitação comum é nativa; `input` relê a linha. Edições estruturais passam por `liveAplicar` em `keydown` e `beforeinput`. Após redesenho, `liveColocarCursor()` recupera foco no mesmo ciclo. Só existe um `liveCtx` ativo (`noteLiveCtx` ou `diarioLiveCtx`); journaling e nota anexada usam textarea. Não introduza caixas/realces que alterem tipografia/posição da linha crua, nem spans internos: ela deve ser um nó de texto. Toolbar usa `pointerdown`, não `click`; indentação é 2 espaços e precisa sobreviver a lista/título. Teste: `test/editor.cjs`.

## Diário e agenda

`K_DIARIO` usa `dia:<ISO>`, `semana:<inicio ISO>`, `mes:AAAA-MM`, `ano:AAAA`. Agenda está em todos os quatro escopos; itens vêm de Markdown, sem botão “+ bloco”. No dia, checklist com horário vira grade por minuto; fim omitido = uma hora; sobreposições são distribuídas em colunas. Semana/mês/ano agrupam lista por seus regex. `agendaHtmlPara` despacha e a interação compartilhada usa `data-agline`; swipe à direita adia. Respeite `ordemDiasSemana()`.

No desktop o Diário tem três painéis (agenda, anotação, kanban); no celular, agenda alterna com anotação. Repaint apenas `#diAgendaPane` por `agendarRepinturaDaAgenda`/`repintarAgendaDoDiario`, nunca o editor inteiro. `matchMedia` é guardado para jsdom.

## Kanban, modelos e navegação

Kanban do Diário (`K_DIAKANBAN`) abrange os quatro escopos; `per` é a chave de período. Use `pintarKanban`, `gravarKanban` e `sincronizarPontosCartao`, nunca cópia de drag/score. Cartões concluídos têm crédito estável, alteração de peso/área estorna antes de recrédito, e o “X” do editor cancela; lixeira exclui. A agenda reutiliza `agendaGradeHtml`; `itensAgendaDoDia` é a fonte única para a agenda inline da Home. Não duplique a grade ou `abrirPopupTarefa`.

Modelos exigem pontos coordenados em `TMPL_TYPES`, `newTemplateDoc`, `renderTemplateDoc`, `tmplMeta`, `docToMarkdown` e `mdTypeLabel`. Notas/documentos têm `createdAt` imutável; `nomeAutoDoc` usa `AA-MM-DD-HHHH`. A tabbar é Rotinas, Metas, Diário, Modelos, Configurações; Dados é subtela de Rotinas. Atalhos 1–5, `/` e Esc só agem após `digitandoAgora()` e sem modificadores.
