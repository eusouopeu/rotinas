# Plano — Brita Desktop (Electron + MCP + Sync automático)

Documento de arquitetura para uma versão desktop do Brita (app "Rotinas"), reaproveitando ao máximo o `index.html` único que já existe. Escrito após leitura do código atual (`index.html`, ~12.200 linhas; `capacitor.config.json`; `package.json`) — não é um roteiro genérico, referencia os pontos exatos do app onde cada peça se encaixa.

## 1. Objetivo

Empacotar o Brita como app desktop (macOS prioritário, Windows/Linux como bônus do mesmo build) com dois recursos novos que o PWA/APK não têm:

1. **Servidor MCP embutido**, para o Claude (Desktop ou Code) ler e escrever rotinas, tarefas, notas, diário e metas do Pedro diretamente.
2. **Sincronização automática de dados com o celular**, via Google Drive ou Dropbox, a cada 10 minutos, no espírito do plugin Remotely Save do Obsidian — sem precisar de export/import manual.

Não é reescrita: o desktop é uma terceira casca em cima do mesmo `index.html`, do mesmo jeito que o Capacitor hoje é a casca Android.

## 2. O que já existe e vai ser reaproveitado sem mudar

Isto já está pronto no código e o plano depende disso:

- **`storageBackend`** (`index.html:1327-1385`): abstração `{getAll, set, del}` com duas implementações hoje — Capacitor Filesystem (nativo) e IndexedDB (navegador), escolhidas por `isNative`. É o ponto de extensão certo: basta um terceiro backend, não uma reescrita da persistência.
- **`load()`/`save()`/`removeKey()`** (`index.html:1406-1419`): API síncrona usada pelo app inteiro, com fila de gravação assíncrona por trás (`persistQueue`). O desktop não precisa tocar em nenhuma chamada de `save()` espalhada pelo app — só no backend.
- **`backupData()`** (`index.html:9624-9627`, hoje v5): já serializa tudo que importa — `routines, notes, history, templates, snoozes, tarefas, tarefasHist, diario, diaKanban` — num único objeto JSON. É a base natural do payload de sincronização.
- **Os dois handlers de import (substituir e mesclar)**: já existe lógica de merge de backup no app (perto do `backupData`, aba Dados). É o ponto de partida do merge de sync — reaproveitar em vez de escrever um merge novo do zero.
- **`K_PREFIX = "rotinas_v2_"`** e a lista de `K_*` (`index.html:1263-1288` e mais adiante): dá para enumerar programaticamente todas as chaves persistidas sem manter uma lista paralela.
- **CLAUDE.md do projeto** já avisa: toda coleção nova de dados tem que entrar em `backupData()` e nos dois handlers de import, senão o restore perde dado. A mesma regra vale para o sync — qualquer `K_*` fora do `backupData()` fica fora do sync também, a menos que o desktop trate por fora (não recomendado: duas fontes de verdade do que sincroniza).

## 3. Arquitetura do app desktop

### 3.1 Por que continua sendo um único HTML

A regra do projeto ("sem framework, sem bundler, tudo em `index.html`") se mantém. O Electron não muda o app, só troca a casca:

- **Main process** (`electron/main.js`): cria a `BrowserWindow`, carrega `www/index.html` (o mesmo build gerado por `npm run copy:www`), sobe o servidor MCP como processo interno, roda o motor de sync em background, gerencia tray icon.
- **Preload script** (`electron/preload.js`): expõe via `contextBridge` uma API mínima (`window.electronBridge`) para leitura/escrita de arquivos locais (o novo storage backend) e para status do sync/MCP aparecerem na tela de Configurações. Não expor `ipcRenderer` bruto nem Node ao renderer — `contextIsolation: true`, `nodeIntegration: false`.
- **Renderer**: o próprio `index.html`, sem mudança de lógica de UI. Só o branch de storage e um novo bloco em Configurações mudam.

### 3.2 Novo backend de storage (`storageBackend` desktop)

Hoje `isNative` decide entre Capacitor e IndexedDB. Proposta: trocar a checagem por uma detecção de três vias —

```js
const isNative  = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isDesktop = !!(window.electronBridge);
```

E um terceiro branch em `storageBackend`, espelhando o padrão já usado no branch nativo (um JSON por chave, não um blob único) — mesmo formato de arquivo do Capacitor (`brita/<key>.json`), só que gravado via `fs` no processo main (chamado pelo preload) em vez de `Capacitor.Plugins.Filesystem`. Isso não é acidental: se o formato em disco for idêntico ao do celular, o motor de sync (seção 5) não precisa converter nada — copia o arquivo como está.

Local em disco: `app.getPath("userData")/brita/<key>.json` (no macOS, `~/Library/Application Support/Brita/brita/`).

`isNative && (...)` em `save()` (linha 1410, que dispara `queueNativeSchedSync`) continua só para Capacitor — o desktop não tem widget de launcher nem notificação agendada do SO da mesma forma, então essa chamada fica de fora do branch desktop por ora (ver seção 9 sobre notificações desktop).

### 3.3 Empacotamento

- **electron-builder**, alvo `dmg`/`zip` para macOS (arm64 + x64), `nsis` para Windows, `AppImage`/`deb` para Linux — todos a partir do mesmo `www/`.
- Ícone: reaproveitar `icon-512.png`/`icon-512-maskable.png` já existentes, gerar `.icns`/`.ico` a partir deles (`electron-icon-builder` ou similar).
- Assinatura/notarização no macOS: necessária para o Electron rodar sem Gatekeeper bloquear — decisão em aberto (seção 9), porque exige conta Apple Developer paga.
- Auto-update: `electron-updater` lendo de GitHub Releases (o repo já é público, mencionado no CLAUDE.md a propósito do keystore) — permite empurrar update sem o Pedro reinstalar manualmente, parecido com o cuidado que já existe hoje com `versionCode` no Android.
- Script novo em `package.json`: `"desktop:build": "npm run copy:www && electron-builder"`, seguindo o padrão de `npm run apk` que já existe.

## 4. Servidor MCP embutido

### 4.1 Transporte

SDK oficial: `@modelcontextprotocol/sdk` (pacote npm, TypeScript/Node, spec 2026-07-28 na versão v2 estável). Dois transportes fazem sentido aqui e não são excludentes:

- **stdio**: para o Claude Desktop, que inicia o servidor como processo filho via `claude_desktop_config.json`. Simples, mas exige apontar para um binário/script Node instalado — mais atrito se o servidor mora *dentro* do bundle do Electron.
- **HTTP local (Streamable HTTP)** em `127.0.0.1:<porta configurável>`: o Electron sobe o servidor MCP sozinho quando o app abre (processo interno, não filho do Claude), e o Claude Code (ou outro cliente MCP) aponta para essa URL. Esse é o caminho recomendado aqui, porque o app já roda em background com tray icon (seção 5.5) — o servidor MCP sobe junto, sem o usuário precisar configurar caminho de binário. A porta fica em Configurações → Integrações, com um botão "copiar config MCP" que já gera o trecho JSON pronto para colar no cliente.
- Manter as duas opções no `mcp-server/` interno (mesma lógica de tools, dois transportes) é barato e cobre tanto quem usa Claude Desktop quanto quem usa Claude Code — decisão final na seção 9.

Segurança: como é `127.0.0.1` e loopback, sem exposição de rede, o risco principal é outro processo local acessando os dados — mitigar com um token simples gerado no primeiro boot (guardado em Configurações, exigido em cada request) em vez de deixar a porta totalmente aberta.

### 4.2 Ferramentas (tools) propostas

Desenhadas em cima das estruturas de dado que já existem (`routines`, `tarefas`, `notes`, `diario`, `templates` tipo `countdown` = Metas, `diaKanban`), sem inventar conceito novo:

**Leitura**
- `list_routines` — lista rotinas, com filtro por dia da semana (usa `rotinaOcorreHoje`/`schedule.days`).
- `get_today_agenda` — junta rotinas agendadas hoje + blocos do Diário (`agendaHtml`) + kanban do dia, como já é montado na tela.
- `list_tasks` / `get_task` — tarefas (`tarefas`), com bloco/tipo/detalhes.
- `list_metas` — metas (`countdown` docs), com progresso e pontos.
- `read_note` / `search_notes` — notas de `K_NOTES`.
- `read_diario` — texto do diário por escopo (dia/semana/mês/ano), via `diarioChave`.
- `get_gamificacao_status` — boletim da semana atual (`semanaAtual`, pontos por área se a roda da vida estiver ativa).

**Escrita** (atrás de uma flag "permitir escrita" em Configurações, desligada por padrão — ver seção 4.3)
- `create_task` / `complete_task` / `update_task`.
- `append_diario` — acrescenta uma linha ao diário do dia (ex.: Claude registrando algo por pedido do Pedro em outra conversa).
- `add_kanban_card` — cria cartão em "A fazer" do dia.
- `create_note` / `append_note`.

Cada tool de escrita passa pelas mesmas funções que a UI já usa (ex. `sincronizarPontosCartao`, `registrarConclusao`) para não duplicar as regras de pontuação/gamificação documentadas no CLAUDE.md — o servidor MCP roda dentro do mesmo processo Electron e pode chamar essas funções JS diretamente via IPC para o renderer, em vez de reimplementar a lógica de negócio em Node.

### 4.3 Escopo e permissão

- Toggle único em Configurações: **MCP desligado / somente leitura / leitura e escrita** — padrão "somente leitura" na primeira instalação.
- Log simples (últimas N chamadas de tool, com timestamp) visível em Configurações, para o Pedro auditar o que o Claude leu ou alterou.

### 4.4 Como conectar

Documentar dois casos de uso reais:
- **Claude Desktop**: entrada em `claude_desktop_config.json` apontando para a URL HTTP local com o token.
- **Claude Code / Cowork**: comando `claude mcp add` (ou configuração equivalente) apontando para a mesma URL — cobre justamente o tipo de sessão em que este documento está sendo escrito.

## 5. Sincronização automática (Google Drive / Dropbox)

### 5.1 Referência: como o Remotely Save funciona

O Remotely Save compara arquivo local × arquivo remoto pelo horário de modificação e o mais recente vence ("last modified time wins"); não faz diff de conteúdo — na versão gratuita, quando os dois lados mudaram, ele avisa e pede para o usuário escolher manter o mais novo ou o maior; a versão paga (Smart Conflict) tenta mesclar arquivos markdown pequenos e duplica os demais. Roda automaticamente só enquanto o Obsidian está aberto.

Isso importa aqui porque estabelece a régua realista: mesmo a referência que o Pedro citou não faz merge de conteúdo por padrão — faz timestamp-wins com fallback de conflito visível. O plano abaixo segue a mesma régua, adaptada à unidade de dado do Brita (chaves JSON, não arquivos de texto livre).

### 5.2 Unidade de sincronização

O Brita não tem "arquivos" soltos como o vault do Obsidian — tem um conjunto fechado de chaves `K_*`, cada uma um documento JSON. A unidade de sync proposta é **por chave**, não o backup inteiro de uma vez, para que editar rotinas no celular não sobrescreva um diário editado no desktop no mesmo intervalo de 10 minutos:

- Pasta remota: `brita-sync/` na raiz do Drive/Dropbox conectado.
- Um arquivo por chave: `brita-sync/<K_KEY>.json`, mais um `brita-sync/manifest.json` com `{ chave: { updatedAt, hash, device } }` — o manifest evita ter que baixar todo arquivo remoto só para comparar timestamp.
- Cada chamada de `save()` já teria que passar a carimbar `updatedAt` (hoje o app não guarda isso por chave, só por item em alguns casos como `createdAt`/`updatedAt` de nota). Esse é o único ajuste que toca o core do app fora do storage backend — adicionar um `updatedAtPorChave` gravado junto de cada `save()`, análogo ao que já existe para notas individuais.

### 5.3 Algoritmo, em duas fases

**Fase 1 — MVP, mesma régua do Remotely Save (last-write-wins por chave):**
1. A cada 10 minutos (app aberto — ver 5.5), para cada `K_*` presente em `backupData()`: comparar `updatedAt` local vs. `manifest.json` remoto.
2. Se só um lado mudou desde o último sync bem-sucedido: copiar o mais novo por cima do mais velho (upload ou download).
3. Se os dois mudaram desde o último sync (conflito real): **não sobrescrever nada automaticamente**. Salvar a versão remota como `brita-sync/<K_KEY>.conflict-<timestamp>.json`, notificar o Pedro (banner, mesmo padrão de `showAlertBanner` já usado no app) e deixar a resolução manual pela tela de Dados — reaproveitando o import "mesclar" que já existe.
4. Registrar `lastSyncAt` por chave, para a próxima rodada saber o que é "desde o último sync".

**Fase 2 — merge granular (evolução, não bloqueia o MVP):**
Para as coleções que são arrays de itens com `id` próprio (`routines`, `tarefas`, `notes`, `templates`, `diaKanban`) — que é a maioria — dá para ir além de "a chave inteira perde": mesclar por item usando o `updatedAt` de cada item individualmente (criar quando não existir, manter o mais novo por id quando existir dos dois lados), e só cair em conflito de verdade quando o *mesmo item* foi editado nos dois lados. Isso cobre o caso comum (editar uma rotina no celular enquanto cria uma tarefa no desktop) sem esperar por um merge de texto sofisticado. O diário (`K_DIARIO`, texto markdown livre por período) é o caso que mais se parece com o Obsidian de fato — para esse, aplicar a régua da Fase 1 mesmo na Fase 2 (arquivo de texto livre não dá para mesclar automaticamente sem risco).

### 5.4 Autenticação

- **Google Drive**: fluxo OAuth "loopback" (`localhost`/`127.0.0.1` com porta), que é o caminho recomendado pelo Google para apps desktop — o Electron sobe um servidor HTTP temporário só durante o login, abre o navegador padrão do sistema (nunca uma webview embutida, por segurança) e recebe o código de autorização de volta. Escopo mínimo: `drive.file` (o app só enxerga arquivos que ele mesmo criou, não o Drive inteiro do Pedro).
- **Dropbox**: fluxo OAuth 2.0 com PKCE, recomendado pela própria Dropbox para apps client-side/desktop que não conseguem guardar `client_secret` com segurança — o SDK oficial (`dropbox` no npm) já implementa PKCE pronto.
- Token de refresh guardado com `safeStorage` do Electron (criptografia ligada ao keychain do SO), não em texto puro — nunca usar `keytar` isolado hoje em dia, já foi descontinuado; `safeStorage` é a API atual do próprio Electron para isso.
- Configuração em Configurações → Backup (a mesma tela que já tem "backup automático em arquivo" hoje) — adicionar uma seção nova "Sincronização com nuvem", com escolha Google Drive / Dropbox / desligado, botão de conectar, e status do último sync (sucesso, conflito pendente, erro).

### 5.5 Agendamento

- `setInterval` de 10 minutos no main process (não precisa de `node-cron` para um intervalo fixo simples).
- Só roda com o app aberto — mesma limitação que o Remotely Save tem hoje ("auto sync só funciona com o Obsidian aberto"). Para sync mesmo com o app fechado seria necessário um processo separado registrado no `launchd` (macOS) — fica como possibilidade de fase avançada, não faz parte do MVP.
- Tray icon com o app minimizado (`app.dock.hide()` opcional) para o sync continuar rodando em segundo plano sem uma janela visível ocupando espaço — sensato dado que o app já teve o cuidado de rodar bolha/overlay em segundo plano no Android.
- Sync manual sob demanda: botão "sincronizar agora" na mesma tela, para não esperar os 10 minutos ao testar.

### 5.6 Reaproveitar o merge de import já existente

Os dois handlers de import de backup (substituir / mesclar, perto de `backupData()` na aba Dados) já resolvem boa parte do problema de "dado vindo de outro dispositivo entra sem duplicar". O motor de sync deveria chamar essa mesma lógica internamente para aplicar um `K_KEY.json` baixado da nuvem, em vez de escrever um segundo caminho de merge só para sync — reduz a chance dos dois ficarem divergentes com o tempo (o mesmo cuidado que o CLAUDE.md já pede para `backupData()` e os handlers de import).

## 6. Fluxo ponta a ponta (celular ↔ nuvem ↔ desktop)

1. Celular grava `save()` → grava no Filesystem nativo (Capacitor) → nada muda aqui, é o app de hoje.
2. **Novo**: no celular, o auto-backup nativo que já roda a cada 3 dias (`autoBackupNative`, `index.html:9639`) passa a ter um companheiro — um upload incremental por chave para a mesma pasta `brita-sync/` a cada alteração relevante (ou também em intervalo, para não gastar bateria/dados a cada tecla digitada). Isso é trabalho novo no APK, fora do escopo deste documento sobre o desktop, mas precisa existir dos dois lados para o sync fechar o ciclo — registrar como dependência.
3. Desktop lê `brita-sync/` a cada 10 minutos, aplica fase 1 ou 2 do algoritmo (seção 5.3).
4. Desktop grava local → próximo ciclo de sync sobe para a nuvem → celular baixa na próxima janela dele.

Importante deixar explícito: **este documento cobre a parte desktop**. A parte celular (subir para `brita-sync/` de forma incremental, não só a cada 3 dias) é um projeto irmão no APK, e sem ela o sync automatizado fica só "desktop ⇄ nuvem" — o celular continuaria dependendo do export/import manual até esse trabalho ser feito.

## 7. Plano de implementação faseado

1. **Casca Electron mínima** — `main.js`/`preload.js`, carrega `www/index.html`, novo backend de storage (fs local, formato idêntico ao Capacitor). Critério de pronto: app abre, dados persistem entre reinícios, `npm test` continua passando (o smoke test não deveria precisar mudar, já que testa o app, não a casca).
2. **Empacotamento** — electron-builder para macOS (dmg), ícone, script `npm run desktop:build`. Sem assinatura/notarização ainda (rodar localmente primeiro).
3. **Import inicial dos dados do celular** — tela simples: "importar backup do celular" usando o export manual que já existe (`exportBackup`), para o desktop não nascer vazio enquanto o sync automático não está pronto.
4. **Servidor MCP, somente leitura** — tools de leitura (seção 4.2), transporte HTTP local, token simples, tela de Configurações → Integrações.
5. **Servidor MCP, leitura e escrita** — tools de escrita, log de chamadas.
6. **Sync engine MVP (Fase 1, seção 5.3)** — Google Drive primeiro (só ele, para não duplicar o trabalho de auth em paralelo), last-write-wins por chave, detecção e sinalização de conflito, sem merge automático ainda.
7. **Dropbox** como segunda opção de nuvem, reaproveitando o mesmo motor de sync (só troca o cliente de storage remoto).
8. **Merge granular (Fase 2)** por item com `id`, para as coleções em array.
9. **Trabalho irmão no APK** (fora deste repo/documento, mas necessário para o ciclo fechar): upload incremental para `brita-sync/` no celular.
10. **Polimento** — auto-update, tray icon com status de sync, atalho global, assinatura/notarização macOS se decidido.

## 8. Estrutura de pastas proposta

```
Brita/
  index.html, manifest.json, sw.js, ...   # inalterados
  electron/
    main.js                # janela, tray, boot do MCP e do sync
    preload.js              # contextBridge: storage + status MCP/sync
    storage-desktop.js      # backend fs, análogo ao branch isNative de storageBackend
  mcp-server/
    server.js               # transporte stdio + HTTP, registro das tools
    tools/
      routines.js, tasks.js, notes.js, diario.js, metas.js
  sync/
    engine.js               # algoritmo da seção 5.3, comum aos dois provedores
    google-drive.js          # auth loopback + upload/download
    dropbox.js                # auth PKCE + upload/download
    manifest.js               # leitura/escrita do brita-sync/manifest.json
  electron-builder.json (ou config em package.json)
```

## 9. Decisões em aberto para o Pedro

- **MCP: HTTP local sempre ligado ao abrir o app, ou processo à parte iniciado pelo próprio Claude via stdio?** Este documento recomenda HTTP local (app já roda em background para o sync), mas stdio é mais simples de auditar por sessão.
- **Nuvem: Google Drive primeiro, Dropbox depois — confirma a ordem?** (assumido acima porque o Pedro mencionou os dois com "ou").
- **Assinatura/notarização do macOS**: exige conta Apple Developer (paga). Sem isso, o Gatekeeper vai barrar o app na primeira abertura e exigir clique manual em "Abrir mesmo assim" toda atualização não assinada — aceitável para uso pessoal, mas vale confirmar.
- **Windows/Linux fazem parte do escopo real ou é só macOS por enquanto?** Muda o que compensa configurar no electron-builder desde já.
- **Notificações desktop**: o app hoje agenda notificações nativas no Android via `LocalNotifications`. No desktop, notificação de rotina exigiria reimplementar o "próximo horário" com `node-notifier`/API nativa do Electron — incluir no escopo ou deixar o desktop só para consulta/edição + MCP + sync, sem replicar alarmes?
- **Nome/ícone do app desktop**: manter "Brita"/"Rotinas" e os ícones já existentes, ou um novo?

## 10. Referências

- [MCP TypeScript SDK — npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [MCP TypeScript SDK v2 — docs](https://ts.sdk.modelcontextprotocol.io/v2/)
- [GitHub — modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Remotely Save — Obsidian Plugin](https://community.obsidian.md/plugins/remotely-save)
- [Remotely Save — GitHub](https://github.com/remotely-save/remotely-save)
- [Google — OAuth 2.0 for iOS & Desktop Apps (loopback flow)](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google — Loopback IP Address flow Migration Guide](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration)
- [Dropbox — OAuth Guide](https://developers.dropbox.com/oauth-guide)
- [Dropbox — PKCE: What and Why?](https://dropbox.tech/developers/pkce--what-and-why-)
