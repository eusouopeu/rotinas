# Inventário de preservação da fonte

| Seção/fato da fonte | Classe | Destino |
|---|---|---|
| Propósito, busca direcionada, escopo local-first | CONDENSE | `CLAUDE.md`, `architecture.md` |
| Legado vanilla, IIFE, CSS/asset/PWA | KEEP + MOVE TO DOC | `CLAUDE.md`, `architecture.md` |
| Persistência e proibição de localStorage | KEEP | `CLAUDE.md`, `architecture.md` |
| Backup, import e paridade de chaves | KEEP + MOVE TO DOC | `CLAUDE.md`, `sync.md` |
| Capacitor, export, pasta, widget, overlay, alertas | MOVE TO DOC | `native.md`, `release.md` |
| Electron, MCP e notificações | MOVE TO DOC | `native.md`, `sync.md` |
| Drive, OAuth, tokens, merge e conflitos | KEEP + MOVE TO DOC | `CLAUDE.md`, `sync.md` |
| React/Vite, telas, riscos, CSS compartilhado | KEEP + MOVE TO DOC | `CLAUDE.md`, `react-migration.md` |
| Dispatcher, dados, IDs e nomenclatura | MOVE TO DOC | `architecture.md` |
| Semana, score, peso nenhum, roda, hábito, vagas | KEEP + MOVE TO DOC | `CLAUDE.md`, `gamification.md` |
| Metas, pontos proporcionais e penalidade | MOVE TO DOC | `gamification.md` |
| Markdown/live editor | KEEP + MOVE TO DOC | `CLAUDE.md`, `architecture.md` |
| Diário, agenda, kanban, modelos e player | MOVE TO DOC | `architecture.md`, `feature-status.md` |
| Tokens, layout, botões e responsividade | KEEP + MOVE TO DOC | `CLAUDE.md`, `design-system.md` |
| Itens OK/removidos e anti-regressões | MOVE TO DOC | `feature-status.md` |
| Busca, menor mudança, resposta curta e dependências | KEEP/CONDENSE | `CLAUDE.md`, `release.md` |
| Testes, commit, push, APK | KEEP + MOVE TO SKILL | `CLAUDE.md`, `release.md`, skill `release` |
| Caveman | MOVE TO SKILL | `.claude/skills/caveman/SKILL.md` |
| “Sempre TS/Tailwind/Lucide” | CONDENSE/RESOLVE | `CLAUDE.md`, `react-migration.md` |

Classificação aplicada: **KEEP** para guardrail universal; **CONDENSE** para regra preservada em forma operacional; **MOVE TO DOC** para referência sob demanda; **MOVE TO SKILL** para procedimento acionável.
