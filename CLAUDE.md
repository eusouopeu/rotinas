# Brita — instruções permanentes

Leia somente os documentos pertinentes à tarefa; não carregue documentação ou arquivos grandes por padrão. Use busca direcionada antes de abrir `index.html`.

## Escopo e fonte de verdade

- Brita (nome exibido: Rotinas) é um PWA local-first de rotinas cronometradas, notas Markdown, modelos e organização pessoal; não há backend.
- Desde 05/09/2026, por pedido explícito do Pedro (aceitando os gaps conhecidos), Android (Capacitor) e Electron carregam o build React (`webapp-dist`), não mais o legado — ver `docs/react-migration.md` para o corte e os gaps aceitos. O legado na raiz (`index.html`) continua como fonte de leitura/referência para lógica ainda não portada e pode seguir servindo como PWA de navegador à parte; nunca reverta o corte nem empacote um no lugar do outro de novo sem pedido explícito.
- Antes de atuar na área correspondente, leia: arquitetura (`docs/architecture.md`), migração (`docs/react-migration.md`), gamificação (`docs/gamification.md`), sync/backup (`docs/sync.md`), nativo/release (`docs/native.md`, `docs/release.md`), UI (`docs/design-system.md`) ou estado de funcionalidades (`docs/feature-status.md`).

## Stack por área — resolução de contradições

### Produção legado (raiz)

- `index.html` + JavaScript vanilla em IIFE async + `app.css`; sem framework, bundler, componentes, TypeScript, Tailwind ou Lucide.
- Preserve IIFE único, escopo léxico, ordem de declarações e arquitetura single-file. Separar scripts é refatoração explícita.
- Ícones existentes são entidades HTML/`ICON_D`; reutilize-as. Não troque por Lucide sem migração explícita.
- Todo novo asset estático precisa entrar no cache PWA (`sw.js`); `www/`/`copy:www` não alimenta mais Android/Electron (ver corte acima), só sobra como bundle avulso do legado se precisar.
- Ramos `isNative`/`isDesktop` do legado continuam existindo e devem seguir compatíveis, mas Android/Electron não os exercitam mais em produção — quem roda ali hoje é o React (mesmos ramos, em `webapp/src/lib/storage.ts`).

### Migração (`webapp/`)

- React + TypeScript estrito + Vite + Zustand. Preserve `<div id="app">`, nunca o padrão `#root`.
- O React importa e reutiliza o `app.css` legado. Tailwind não está instalado/nem autorizado nesta fase; não introduzir Tailwind, CSS Modules ou design paralelo sem pedido explícito.
- Lucide só é preferência futura. Hoje os componentes reutilizam `Icon.tsx`/`ICON_D`. Montserrat continua no corpo; Lato continua nos títulos onde já aplicado.
- A migração usa o mesmo formato de dados do legado. Não crie storage alternativo, nem transformação que descarte documentos desconhecidos.
- O app React já é o que roda em Android/Electron (corte de 05/09/2026, decisão explícita apesar de gaps conhecidos — ver `docs/react-migration.md`); trate mudanças em `webapp/` como release nativa de verdade, não mais como protótipo isolado.

## Regras invioláveis

- Persistência: use exclusivamente `load`, `save` e `removeKey`; nunca `localStorage` direto.
- Reutilize helpers, classes e lógica de negócio. Não duplique pontuação, agenda, kanban, parser Markdown, storage ou ponte nativa.
- Toda nova coleção deve obedecer ao checklist de backup/import/sync em `docs/sync.md` e ao teste de paridade.
- Não altere sem entender as invariantes de gamificação, semana, áreas, hábitos, metas e kanban em `docs/gamification.md`.
- Preserve o editor Markdown live: uma instância, digitação nativa, cursor/foco e `liveAplicar`; leia `docs/architecture.md` antes de mexer nele.
- Para mudanças visuais: apenas tokens CSS `var(--x)`, ação primária sólida `--caneta`, bordas em vez de sombra decorativa; leia `docs/design-system.md`.
- Não recrie funcionalidades removidas ou já concluídas; consulte `docs/feature-status.md`.
- Nunca leia `node_modules/`, `dist/`, `build/`, vendor ou artefatos gerados para contexto.
- Em testes jsdom, proteja uso de APIs de navegador ausentes, especialmente `matchMedia`.

## Contratos de interface sensíveis

- O dispatcher, a agenda e o Kanban possuem fontes únicas de verdade; estenda-as, não crie caminhos paralelos.
- Fim de horário ausente em time-block significa uma hora, nunca “até o próximo item”.
- Teclas globais precisam respeitar edição em `contenteditable` e modificadores.
- Ação de excluir em editor só exclui quando a UI explicitamente a apresenta como lixeira; fechar/cancelar não persiste rascunhos.
- Em desktop, ajuste responsividade prioritariamente em CSS; não espalhe verificações de largura em JavaScript.
- Preserve IDs estáveis e formatos de chaves persistidos; não os torne incrementais ou dependentes da posição visual.

## Segurança e dados

- Não exponha, versione, mova ou substitua segredos, tokens, keystore ou dados de usuário. A keystore deve ter cópia fora do repositório.
- Conflito real de sync requer decisão manual; não sobrescreva local/remoto automaticamente.
- No APK, use os caminhos e APIs nativas documentados; blob, `<a download>` e `window.print()` não funcionam no WebView.
- Não altere o local da store nativa que o widget lê; a pasta configurável de export é outra coisa.
- Para OAuth, mantenha browser externo, PKCE, tokens cifrados e estado local fora do Drive.

## Fluxo de trabalho

- Faça a menor alteração completa; não faça limpeza/refactor não relacionado.
- Busque primeiro a função/seção. Reuse o padrão local e mantenha compatibilidade PWA, Electron e Android quando aplicável.
- Planeje antes os 2–3 testes essenciais e rode os testes da área; `npm test` continua obrigatório após mudança em `index.html` e quando a regra do projeto o exigir.
- Depois de mudar código do app: atualize documentação relevante; faça commit e push; e, quando for entregar APK ao Pedro, siga integralmente `docs/release.md` (versões, `BUILD_STAMP`, validação e build).
- Resposta final: curta, arquivos alterados, testes e ressalvas materiais. Para comunicação ultracurta, use a skill Caveman conforme `.claude/skills/caveman/SKILL.md`; clareza e avisos de segurança prevalecem.
- Não faça release, push ou APK por uma mudança exclusivamente documental, salvo pedido explícito.
- Não use agentes concorrentes para alterar o IIFE do legado; podem investigar tarefas isoladas sem sobreposição de edição.

## Atualização desta documentação

- Atualize o `CLAUDE.md` somente quando uma regra realmente global mudar.
- Atualize o documento temático quando mudar um detalhe de domínio, runtime ou implementação.
- Atualize `feature-status.md` ao concluir, remover ou substituir uma funcionalidade visível.
- Atualize `react-migration.md` ao portar telas, reduzir riscos ou alterar a estratégia de corte.
- Preserve este escopo: histórico narrativo pertence ao documento temático, não às instruções permanentes.

## Navegação documental

- Arquitetura, Markdown, Diário, Kanban e Agenda: `docs/architecture.md`
- Pontuação, semana, metas, roda, hábitos, vagas: `docs/gamification.md`
- Backup, import, Drive, OAuth, conflitos e paridade: `docs/sync.md`
- Capacitor, Electron, MCP, notificações e Android: `docs/native.md`
- Estado, limites e riscos da reescrita: `docs/react-migration.md`
- Tokens, layout, botões, responsividade e ícones: `docs/design-system.md`
- Inventário de recursos existentes/removidos: `docs/feature-status.md`
- Testes, commit/push, APK e checklist de entrega: `docs/release.md`
