# Sistema visual e layout

Use tokens CSS, nunca cor hardcoded. Tema claro é padrão; escuro é `body.dark`. Primário é `var(--caneta)` sólido, sem gradiente. Superfícies usam borda 1.5px `var(--line)`, sem sombra decorativa; exceções: indicador de DnD e janelas always-on-top. Ao mudar tema, sincronize `theme-color`, manifest e Electron.

Formulários de meta (prazo e recorrente, React): usam `.meta-form` no `.confirm-box` — linhas `.mf-row` de ícone (`.mf-ico`) + controle, sem rótulos empilhados. Peso vira pílulas 0–3 (`.type-toggle`, `title` com o rótulo do peso), negativa/pontua viram `.mf-toggle-btn` (menos/check) e o lembrete da recorrente liga sozinho quando as duas horas estão preenchidas. Reaproveite essas classes em vez de criar variantes.

Componentes: `.icon-btn` é o padrão 34px; `.icon-btn.borderless` só remove aparência, não alvo; `.btn-primary`, `.btn-cancel`, `.btn-confirm`, `.btn-danger-outline`, `.link-btn` já existem. Reutilize-os. No legado ícones são entidades HTML, não emoji literal/SVG. Priorize ícone quando a semântica estiver clara, mas não sacrifique acessibilidade.

Layout: cabeçalhos de aba não são fixos no mobile; respeite nós de rolagem irmãos para não derrubar handlers. Tabelas `.dev-row` dão sobra à primeira coluna, números têm largura mínima, alinhamento à direita e tabular nums. Desktop começa a 900px: tabbar vira sidebar, FAB exige `title`, hover só em `any-hover`. Paisagem curta tem media query própria. Ajuste desktop em CSS; `ehDesktop` fica restrito ao Diário.

Rotina/agenda: preserve marcadores, colunas de horário/lápis com largura fixa, card de streak como `.streak-tag`, e ação de toque por `transform:scale`. Não reintroduza layouts/removidos listados em `feature-status.md`.
