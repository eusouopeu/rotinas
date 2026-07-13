# CLAUDE.md

Guia de contexto do projeto **Brita** para o Claude Code. Objetivo: evitar que cada sessão precise re-explorar o repositório do zero — leia este arquivo primeiro, e use grep/busca direcionada no `index.html` (5838 linhas) em vez de carregá-lo inteiro sempre que possível.

## Localização

`/Users/pedro/Codigos/Apps/Brita`

## O que é

PWA (Progressive Web App) chamado "Rotinas" (nome interno do projeto: Brita): rotinas cronometradas, notas rápidas em markdown, modelos de lista/matriz, e gerenciador de tarefas de estudo — tudo local-first, sem backend.

## Stack e ambiente

- **Sem framework, sem bundler.** HTML + CSS + JavaScript vanilla, tudo em um único arquivo `index.html` (CSS em `<style>`, JS em um IIFE **async** no fim do body). Não introduzir React/Vue/bundlers a menos que explicitamente solicitado.
- **Persistência**: helpers síncronos `load(key, fallback)` / `save(key, val)` / `removeKey(key)` sobre um **espelho em memória** (`mem` Map), com gravação assíncrona enfileirada num backend: **IndexedDB** no navegador, **Capacitor Filesystem** (um JSON por chave em `Directory.Data/brita/`) no APK. Migração automática do localStorage legado na primeira execução. Nunca usar `localStorage` diretamente.
- **APK Android via Capacitor 8** (plugins: filesystem, local-notifications, share). `isNative` distingue os ambientes; código nativo fica em ramos `if(isNative)`. Compilar: `npm run apk` → `android/app/build/outputs/apk/debug/app-debug.apk`. Exige JDK 21 (baixado pelo Gradle via foojay; caminho fixado em `android/gradle.properties`) e SDK em `~/Library/Android/sdk` (`android/local.properties`). Assinatura: `android/brita.keystore` (gitignorado — repo público; senha `brita-rotinas`; **manter cópia fora do repo**, sem ele a assinatura muda e o Android exige reinstalar).
- **PWA**: `manifest.json` + `sw.js` (stale-while-revalidate; `CACHE_NAME` agora só limpa caches antigos, deploys chegam no reload seguinte sem bump manual).
- **Fontes locais** em `fonts/` (Fraunces títulos, Inter corpo, IBM Plex Mono dados — woff2 subset latin, sem rede).
- **Rodar localmente**: servir os arquivos estáticos (ex. `python3 -m http.server`). **Testar**: `npm test` (smoke test jsdom + fake-indexeddb: boot, migração, persistência — rodar após qualquer mudança no index.html).
- No APK, exports usam `nativeWriteExport()` → `Documentos/Rotinas/` (+ share sheet); blob/`<a download>`/`window.print()` não funcionam no WebView. Auto-backup nativo a cada 3 dias no mesmo lugar. Notificações de rotina são pré-agendadas como recorrentes do Android (`syncNativeSchedules`).

## Estrutura de arquivos

```
Brita/
  index.html        # app inteiro: CSS + HTML template strings + JS
  manifest.json      # metadata do PWA, ícones, atalhos (nova nota / iniciar rotina)
  sw.js               # service worker (cache offline stale-while-revalidate)
  fonts/              # woff2 locais + fonts.css
  test/smoke.cjs      # smoke test (npm test)
  package.json        # scripts: copy:www, sync, apk, test — deps só do Capacitor/testes
  capacitor.config.json
  android/            # projeto nativo gerado (build.gradle do app tem a assinatura)
  assets/             # fontes dos ícones p/ npx @capacitor/assets generate --android
  icon-192.png / icon-512.png / icon-512-maskable.png
```

Não há separação em componentes/arquivos — é intencional (app pequeno, single-file). Ao editar, localizar a seção certa por `grep -n` antes de abrir o arquivo inteiro.

## Padrão de arquitetura (importante — ler antes de editar)

- **Estado de navegação**: uma variável global `view = { tab, screen, id? }`. Trocar de tela = reatribuir `view` e chamar `render()`.
- **Dispatcher central**: a função `render()` (linha ~1021) lê `view.screen` e chama a função `renderX()` correspondente (`renderHome`, `renderTemplates`, `renderTarefas`, `renderRoutineDetail`, etc.). Para adicionar uma tela nova: criar `renderNovaTela()` e adicionar um `else if` no dispatcher.
- **Renderização**: cada `renderX()` monta um elemento via template string (`el.innerHTML = ...`) e registra os handlers (`.onclick`, `.oninput`) depois de inserir no DOM. Não há virtual DOM — é *replace* do conteúdo da tela a cada render.
- **Dados**: arrays globais carregados via `load()` no boot (`routines`, `notes`, `templates`, `tarefas`, `history`, etc.), com uma constante `K_*` por chave (`K_ROUTINES`, `K_TEMPLATES`, `K_TAREFAS`...). Qualquer alteração de dado é seguida de `save(K_X, x)` (ou o helper específico, ex. `saveTemplates(doc)`). O boot aguarda `storageBackend.getAll()` no topo do IIFE async antes de qualquer render.
- **IDs**: gerados com `uid()` (string aleatória base36), nunca incrementais.

## Convenções de nomenclatura

- Funções de renderização de tela: `renderNomeDaTela` (camelCase, prefixo `render`).
- Constantes de chave de storage: `K_NOMEMAIUSCULO`.
- Atributos `data-*` em botões para lookup de handler (ex.: `data-edit`, `data-tvdel`, `data-mxup`) — seguir esse padrão para novas ações em vez de IDs únicos por elemento quando o botão é repetido em lista.

## Design tokens (já definidos em `:root`, dark é o padrão)

```css
--bg: #1C1B1A;        --surface: #262422;    --surface-2: #2F2C29;
--line: #3A3632;      --text: #EDE7DD;       --muted: #8A8478;   /* cor "cinza escuro" dos ícones */
--accent: #E0619E;    --accent-2: #5B8DEF;   --grad: linear-gradient(135deg, #EC6AA8, #5B8DEF);
--good: #6B8F71;      --danger: #B25B4C;
```

Tema claro é um override via classe `body.light` (mesmas variáveis, valores diferentes) — nunca hardcodar cor; sempre usar a variável CSS correspondente, para que os dois temas continuem funcionando.

## Componentes de botão já padronizados — reutilizar, não recriar

- `.icon-btn` — 34x34px, border-radius:10px, fundo var(--surface), borda var(--line), icone na cor var(--muted), font-size:15px. Este ja e o padrao unico para botoes so-de-icone.
- `.btn-primary` — acao principal (gradiente var(--grad)).
- `.btn-cancel` — cancelar (fundo neutro var(--surface-2)).
- `.btn-confirm` — confirmar acao (geralmente em modais).
- `.btn-danger-outline` — acao destrutiva secundaria (outline vermelho).
- `.link-btn` — botao estilo link, sem fundo.

Icones sao caracteres Unicode via entidade HTML numerica (ex.: &#9998; = lapis, &#128465; = lixeira), nao sao SVGs nem arquivos de imagem, nem emoji digitado literalmente.

## Estado atual de features (para nao pedir de novo o que ja existe)

- OK Modelo "lista de mercado": gondolas sempre visiveis mesmo vazias ja implementado (comentario explicito no codigo, linhas ~3686-3687).
- OK Modelo "lista de viagem": ja reaproveita a estrutura da lista de mercado (comentario explicito, linha ~4607).
- OK Icone de editar por item de rotina: ja existe (data-stepedit, linha ~1219).
- OK Tarefas com bloco + tipo + conteudo + detalhes em bullets: ja implementado — tarefaDetalhesHtml() (linha ~2144) ja converte texto multilinha em lista com marcadores.
- OK Botoes de icone padronizados: classe .icon-btn ja unica e consistente em cor/tamanho/estilo.
- Se alguma dessas areas ainda tiver bugs visuais ou pontas soltas, pedir para o Pedro apontar a tela/funcao especifica em vez de re-implementar do zero.

## Regras gerais para o Claude Code neste projeto

- Buscar com grep -n a funcao/secao relevante antes de editar — nunca reler o index.html inteiro por padrao (5838 linhas).
- Reaproveitar classes CSS e funcoes helper ja existentes (icon-btn, confirmModal, wrapSwipeDelete, escapeHtml, uid, load/save) em vez de criar equivalentes novos.
- Manter a arquitetura single-file e sem build step, a menos que o Pedro peca explicitamente para migrar.
- Sempre usar variaveis CSS (var(--x)), nunca cor hardcoded, para preservar o tema claro/escuro.
- Ao terminar uma tarefa, resumir em bullets curtos o que mudou (arquivo + linhas aproximadas) — sem relatorio longo.
