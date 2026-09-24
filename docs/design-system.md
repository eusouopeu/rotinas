# Sistema visual e layout

Use tokens CSS, nunca cor hardcoded. Tema claro é padrão; escuro é `body.dark`. Primário é `var(--caneta)` sólido, sem gradiente. Superfícies usam borda 1.5px `var(--line)`, sem sombra decorativa; exceções: indicador de DnD e janelas always-on-top. Ao mudar tema, sincronize `theme-color`, manifest e Electron.

Formulários de meta (prazo e recorrente, React): usam `.meta-form` no `.confirm-box` — linhas `.mf-row` de ícone (`.mf-ico`) + controle, sem rótulos empilhados. Peso é uma fileira `.type-toggle.mf-wide` (nenhum/baixo/médio/alto) na linha do ícone de ticket; negativa, pontua e lembrete viram `.mf-toggle-btn` (menos/check); a área nova é digitada dentro da própria caixa de chips (`.mf-area-nova`).

Resumo da Roda da Vida (React, `RodaVidaResumo`): cabeçalho `.roda-head` retrátil (estado em `K_RODARESUMOABERTO`; seta para baixo = aberto, para cima = recolhido), áreas paginadas de duas em duas em `.roda-pager` com `.roda-seta` nas laterais e rodapé `.roda-boletim` de fatos `.rc-fact` (nota da semana colorida pelo ritmo, Σ de itens concluídos, dias restantes). O card inteiro continua levando ao Boletim — cabeçalho e setas param a propagação do clique.

Cards de meta (React): mesma anatomia do card de rotina — bolinha da área + nome (`.meta-card-title`, clique abre o editor), linha de fatos `.routine-meta-line`/`.rc-fact` (peso, frequência ou dias, prazo, ritmo) e contador `.cd-topics` com `.meta-count`. O card de verdade é `.meta-card-inner`; `.meta-card` é só a faixa do `SwipeItem` (arrastar para excluir/duplicar). Em meta negativa o `+` fica à esquerda e o número vai a `var(--erro)` no limite. Reaproveite essas classes em vez de criar variantes.

Componentes: `.icon-btn` é o padrão 34px; `.icon-btn.borderless` só remove aparência, não alvo; `.btn-primary`, `.btn-cancel`, `.btn-confirm`, `.btn-danger-outline`, `.link-btn` já existem. Reutilize-os. No legado ícones são entidades HTML, não emoji literal/SVG. Priorize ícone quando a semântica estiver clara, mas não sacrifique acessibilidade.

Layout: cabeçalhos de aba não são fixos no mobile; respeite nós de rolagem irmãos para não derrubar handlers. Tabelas `.dev-row` dão sobra à primeira coluna, números têm largura mínima, alinhamento à direita e tabular nums. No mobile a tabbar é flutuante e vítrea, dividida em duas pílulas (`.tabbar-pill`): abas de conteúdo numa, Ajustes na outra; só ícone (o `.tab-label` existe no DOM mas fica `display:none`), com a aba ativa em `var(--caneta)` sobre `var(--caneta-soft)`. O container `.tabbar` não tem fundo e usa `pointer-events:none` para o vão entre as pílulas não bloquear o toque. A aba Ajustes é uma pilha de seções retráteis (`SecaoAjuste`) filtrada por busca, com tema e tamanho do texto sempre à vista. Botões: `.btn-cancel`/`.btn-confirm` e `.link-btn` já trazem a própria geometria — não dependa de `.confirm-actions` para dar padding/raio. Data, hora e área da roda são digitadas (`components/CamposTexto.tsx`), nunca seletor nativo. O editor de nota simples usa o formato Apple Notes (`.note-ap*`): barras flutuantes em pílula no topo e no rodapé, título grande, corpo sem moldura. Voltar é navegação, não ação: fica solto, sem moldura (`.note-ap-pill.sem-moldura`). Os botões do rodapé têm 40px (36px abaixo de 420px) — alvo de toque, não densidade. Desktop começa a 900px: tabbar vira sidebar (as pílulas viram `display:contents` e o `.tab-label` reaparece), FAB exige `title`, hover só em `any-hover`. Paisagem curta tem media query própria. Ajuste desktop em CSS; `ehDesktop` fica restrito ao Diário.

Rotina/agenda: preserve marcadores, colunas de horário/lápis com largura fixa, card de streak como `.streak-tag`, e ação de toque por `transform:scale`. Não reintroduza layouts/removidos listados em `feature-status.md`.

Cards de Dados (React, `Stats.tsx`): título e explicação ficam dentro do card (`.stat-card.com-titulo` > `.stat-card-title` + `.stat-card-desc` + `.stat-card-body`), nunca `section-label` solto acima. Números de destaque em trio usam `.resumo-grid.kpi3` com `.resumo-v.bom`/`.ruim`/`.destaque` (`--ok`/`--erro`/`--caneta`). Grupos bom/abaixo usam `.faixa-ok`/`.faixa-baixo` sobre `--ok-soft`/`--erro-soft`; meta em barra é `.meta-tracejada` em `.bar-track.com-meta`; linha de percentual é `GraficoLinhaPct` (cores por classe `.lp-*`, só tokens).

## Folga lateral em aba com rolagem vertical

Container de rolagem vertical (`.tab-scroll`, `.settings-scroll`) leva `overflow-x:hidden`. Não é firula: `overflow-y:auto` com `overflow-x:visible` faz o CSS computar o x como `auto`, e aí qualquer sobra horizontal vira rolagem lateral de verdade. A sobra existe por construção — a área de toque ampliada dos botões-ícone (`.icon-btn::after`/`.bell-btn::after`, `inset:-5px`) é invisível mas conta como conteúdo, e o botão encostado na borda direita sobra 5px. Medido em 22/09/2026 nas abas Rotinas e Dados: `scrollWidth` 339 contra `clientWidth` 335, o bastante para a tela "deslizar" ao arrastar. Clipar no container preserva o alvo de toque ampliado de todos os botões que não encostam na borda. Ao criar uma tela nova com rolagem própria, use a classe `.tab-scroll` em vez de repetir `overflowY:auto` inline.

Seletor de visão (React, desde 24/09/2026): um só componente, `components/SegPill.tsx` (`.type-toggle.seg-pill`), com o visual da pill Notas/Outros de Modelos — borda 1.5px, fundo `--card-blur`, respiro vertical. Usado em Rotinas (Semana/Dia/Lista), Metas (Recorrentes/Prazos — as duas podem ficar ligadas juntas), Notas/Outros e Dados (Semanal/Mensal/Anual); em linha cheia leva `.view-toggle`. Não crie outro seletor de abas; o `.type-toggle` sem `.seg-pill` fica para escolhas pequenas dentro de formulários (peso, tipo de etapa).

Campos de duração (React): `.dur-field` envolve o `.dur-input` numa caixa com a unidade abreviada dentro (`m`, `s`); `.dur-fields` alinha vários lado a lado. Interruptores: todo `input[type=checkbox]` dentro de `.switch-row` é desenhado como switch (trilho `--card-2` → `--caneta`), no React e no legado.

## Tailwind (React, desde 24/09/2026)

O React usa Tailwind v4 (`@tailwindcss/vite`), configurado em `webapp/src/styles/tailwind.css`. O legado (`index.html`) continua só com `app.css`.

- **Tokens:** os valores vivem em `tokens.css` (raiz, compartilhado com o legado; `body.dark` troca as variáveis). `tailwind.css` só dá NOMES a eles em `@theme inline`: `bg-card`, `bg-card-2`, `text-ink`, `text-sub`, `bg-caneta`, `text-on-caneta`, `border-line`, `text-erro`, `bg-ok-soft`, `rounded-app`/`rounded-app-sm`/`rounded-pill`, `font-titulo`. Como o utilitário usa `var(--x)`, o tema escuro funciona sozinho — não use `dark:` para cor. Mudou uma cor? Só em `tokens.css`.
- **Paleta travada:** cores, sombras e famílias de fonte padrão do Tailwind foram removidas (`bg-red-500`, `shadow-md` não compilam). Elevação é borda. Precisa de um token novo? Crie em `tokens.css` (os dois temas) e mapeie em `tailwind.css`.
- **Camadas:** `theme < base < legacy < components < utilities`. O `app.css` é importado dentro de `legacy`, então um utilitário sempre vence uma regra antiga (sem `!important`). O preflight (reset do Tailwind) está desligado até a última tela migrar; ao migrar, o reset atual do `app.css` continua valendo.
- **Repetição vira componente:** o padrão é `webapp/src/ui/` (primitivos) e `webapp/src/features/<área>/` (peças da tela), com variantes em `cva` e `className` sempre aceito via `cn()` (`lib/cn.ts`). Não use `@apply`, classe CSS nova para esconder utilitários nem `style={{}}` para valor fixo (só valor calculado em tempo de execução; cor de área: `style={{"--chip": cor}}` + `bg-(--chip)`).
- **CSS que sobra** (não expressável em utilitário): editor Markdown ao vivo, grade da agenda, animações — em arquivo `.css` ao lado da própria área, nunca no `app.css`.
- **Formatação:** `.prettierrc.json` (largura 120) + `prettier-plugin-tailwindcss` ordena as classes sozinho. Formate só o arquivo que você está migrando (`npm run format -- webapp/src/screens/Metas.tsx`); o código antigo não tem formatação uniforme e formatar tudo geraria diffs enormes.

### Primitivos (`webapp/src/ui/`)

Peças genéricas, sem regra de negócio; toda tela nova/migrada as usa em vez de repetir classes. Todas aceitam `className` (passa por `cn()`, então o último utilitário ganha). Os nomes são em português, como o resto do código.

| Componente | Substitui | Notas |
|---|---|---|
| `Botao` (`variante` primario/neutro/perigo, `tamanho` padrao/modal) | `.btn-primary/.btn-cancel/.btn-danger-outline` | não traz `flex-1`: use `className="flex-1"` na fileira |
| `BotaoIcone` (`rotulo` obrigatório, `ligado`, `semBorda`, `tamanho` md/sm) | `.icon-btn`, `.bell-btn` | rotulo vira title + aria-label; área de toque +5px |
| `Fab` (`rotulo`) | `.fab` | círculo no celular, pílula rotulada no desktop |
| `Chip` (`ativo`, `cor`) | `.area-chip` | cor da área via `--chip` |
| `SegPill` (`cheia`) / `Toggle` (`larga`, `quebra`, `grande`) | `.type-toggle` + `.seg-pill`/`.view-toggle` | pílula = trocar visão; Toggle = escolha pequena em formulário; `active` aceita lista |
| `Switch` | `.switch-row` + checkbox | continua checkbox nativo, desenhado como interruptor |
| `Campo`, `CampoDuracao` | inputs com caixa, `.dur-field` | número + unidade dentro da caixa |
| `Cartao` (`raio` app/lg) | `.stat-card`, `.schedule-box` | |
| `Modal`, `ModalTexto`, `ModalAcoes` | `.confirm-overlay/.confirm-box/.confirm-actions` | clique no fundo chama `onFechar` |
| `EstadoVazio`, `RotuloSecao`, `CabecalhoTela` | `.empty-state`, `.section-label`, `.home-header` | `CabecalhoTela` só tem a base de celular: o desktop (barra fixa no topo) segue no `.home-header` legado, que as telas ainda usam |
| `Botao` variantes `solido`, `destrutivo`, `pilula` | `.btn-confirm`, `.link-btn` | confirmação cheia / ação pequena arredondada |
| `Legenda` | `.stat-foot`, `.routine-meta`, `.dev-n` | texto pequeno cinza; sem margem (use `className="mt-3"`) |
| `ChipsDia` | `.day-chips` + `.day-chip` | fileira D S T Q Q S S |
| `Campo` (`variante` formulario/modelo/linha), `AreaTexto`, `CampoBusca`, `CampoNumero`/`LinhaNumero`, `CampoCor` | `.mk-e-name`, `.market-form-row input`, `.set-busca`, `.dur-input`, `.area-color-swatch` | `modelo` e `linha` NÃO trazem font-family (o legado usava a fonte do sistema nesses campos; trocar é decisão de harmonização) |
| `LinhaDado` | `.dev-row` | rótulo + valor em negrito com filete |

**Escala de texto** (`text-2xs` 10 · `xs` 11 · `sm` 12 · `md` 13 · `base` 14 · `lg` 15 · `xl` 16 · `2xl` 18 · `3xl` 20 · `4xl` 22 · `5xl` 32, em px): meio-pixel (12.5, 13.5, 14.5, 15.5) e 17/19 seguem como `text-[13.5px]` até uma rodada de harmonização escolhida pelo Pedro — a migração não muda o visual. Ao criar um nome novo em `@theme`, ensine-o ao `lib/cn.ts` (senão o tailwind-merge o lê como cor).

**Catálogo:** `npm run dev:react` e abra `/#/ui` — cada primitivo ao lado do elemento equivalente do `app.css`, nos dois temas (botão "tema"). Só existe em desenvolvimento. `webapp/visual/catalogo.spec.mjs` compara os estilos computados dos dois lados (paridade) e reprova se um primitivo divergir; diferença intencional é declarada na linha do `<Par ignorar=[…]>` com o motivo. Primitivo novo = linha nova no catálogo. Divergências intencionais hoje: `Botao perigo` usa Montserrat (o legado caía em Arial por esquecimento), opções de `Toggle` têm cursor de mão, `BotaoIcone sm` centra com flex.

### Migrar uma tela (procedimento)

1. **Referência do que existe:** `npm run visual:baseline-head -- <roteiro>.spec.mjs` grava a referência a partir do último COMMIT (HEAD) — não do seu trabalho em andamento. Se a tela ainda não tem cobertura, escreva o roteiro antes (todos os estados: seções abertas, listas com dados, modais, variantes do app instalado com a ponte simulada de `ajustes.spec.mjs`) e commite roteiro + qualquer `data-*` de teste sozinhos.
2. **Migre:** `python3 webapp/scripts/regras-legadas.py webapp/src/screens/Tela.tsx` lista, por classe usada, todas as regras do `app.css` que a tocam (com `@media` e seletores de contexto — ex.: `.set-secao-body > .stat-card` remove a moldura do cartão). Troque por primitivos/utilitários, tire `style={{}}` estático, quebre a tela em `features/<área>/`. Casca de tela (`screen with-tabbar`, `home-header`, tabbar, sidebar) continua legada até a fase 4.
3. **Verifique:** `npm run visual` deve dar tudo idêntico (2 rodadas) — diferença só é aceitável se intencional e explicada; `npm test`; `npm run typecheck:react`.
4. **Quirks preservados** (a migração não muda visual; harmonizar é uma rodada à parte): campos de `variante` modelo/linha usam a fonte do sistema; `Toggle`/`Chip` ganham cursor de mão; botão `perigo` usa Montserrat (único desvio já aceito).

### Regressão visual

`npm run visual:baseline` grava a referência (60 imagens: 14 telas + catálogo × celular/desktop × claro/escuro, com dados fixos de `webapp/visual/seed.mjs` e data congelada em 23/09/2026); `npm run visual` compara e reprova qualquer diferença (relatório em `webapp/visual/relatorio`). Rode o baseline ANTES de migrar uma tela e o `visual` depois: mudança visual intencional → confira o relatório e rode o baseline de novo. A referência é gitignorada (depende da máquina); o Chromium do Playwright fica em `~/Library/Caches/ms-playwright` (`npx playwright install chromium`). Telas novas entram acrescentando um bloco em `webapp/visual/telas.spec.mjs`.
