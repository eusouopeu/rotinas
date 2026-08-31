# Estado de funcionalidades e decisões preservadas

## Não reimplementar

- Gerenciador de tarefas de estudo foi removido; usar cartões Kanban/Metas, não quinta superfície.
- Tipo de nota “Ideia”, Pomodoro e ciclo de repetição foram removidos.
- Agenda antiga como tela separada, botão de boletim Home, filtro de área da Home, card Hoje, CSV e aba Dados foram removidos/substituídos.
- Aba Diário foi removida (legado, commit `c627f33`, 23/08/2026); a agenda semana/dia da aba Rotinas cobre o uso. Não recriar uma tela/aba "Diário" separada — ver nota em `react-migration.md`.
- Excluir Meta continua acessível por swipe; mantenha o botão oculto `data-cddel` enquanto o wiring depender dele.

## Contratos visuais/funcionais existentes

- Home: roda inclui boletim; rotina concluída vai ao fim e exibe horário real; rotinas ordenam por horário; “só hoje” usa `rotinaCabeEmHoje`, enquanto `rotinaOcorreHoje` fica estrita para notificação/MCP.
- Player: lançamento rápido oferece nota, despesa, nota diária e cartão; overlay de etapas permite reordenar somente futuro; notas vinculadas não interrompem timer.
- Metas têm nota Markdown; recorrentes são padrão do seletor. Modelos abrem em Notas; pill Notas/Outros é `type-toggle.view-toggle`.
- Agenda (dia/semana, hoje dentro de Rotinas — ex-Diário): botão textual nos escopos; sem “+ bloco”; time-block mantém nome/hora na mesma linha.
- Kanban: mover usa `.kb-move-btn`; salto final usa check verde. Agenda inline compartilha grade/fonte única e seus comportamentos de clique/pontuação.
- Roda: nomes editáveis, sem reordenação de área; campos têm larguras preservadas.

Consulte `architecture.md` e `gamification.md` antes de mudar qualquer item. Se houver ponta visual, peça tela/função específica; não reconstrua uma área inteira.
