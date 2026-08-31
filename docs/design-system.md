# Sistema visual e layout

Use tokens CSS, nunca cor hardcoded. Tema claro é padrão; escuro é `body.dark`. Primário é `var(--caneta)` sólido, sem gradiente. Superfícies usam borda 1.5px `var(--line)`, sem sombra decorativa; exceções: indicador de DnD e janelas always-on-top. Ao mudar tema, sincronize `theme-color`, manifest e Electron.

Componentes: `.icon-btn` é o padrão 34px; `.icon-btn.borderless` só remove aparência, não alvo; `.btn-primary`, `.btn-cancel`, `.btn-confirm`, `.btn-danger-outline`, `.link-btn` já existem. Reutilize-os. No legado ícones são entidades HTML, não emoji literal/SVG. Priorize ícone quando a semântica estiver clara, mas não sacrifique acessibilidade.

Layout: cabeçalhos de aba não são fixos no mobile; respeite nós de rolagem irmãos para não derrubar handlers. Tabelas `.dev-row` dão sobra à primeira coluna, números têm largura mínima, alinhamento à direita e tabular nums. Desktop começa a 900px: tabbar vira sidebar, FAB exige `title`, hover só em `any-hover`. Paisagem curta tem media query própria. Ajuste desktop em CSS; `ehDesktop` fica restrito ao Diário.

Rotina/agenda: preserve marcadores, colunas de horário/lápis com largura fixa, card de streak como `.streak-tag`, e ação de toque por `transform:scale`. Não reintroduza layouts/removidos listados em `feature-status.md`.
