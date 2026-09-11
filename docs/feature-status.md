# Estado de funcionalidades e decisões preservadas

## Não reimplementar

- Gerenciador de tarefas de estudo foi removido; usar cartões Kanban/Metas, não quinta superfície.
- Tipo de nota “Ideia”, Pomodoro e ciclo de repetição foram removidos.
- Agenda antiga como tela separada, botão de boletim Home, filtro de área da Home, card Hoje, CSV e aba Dados foram removidos/substituídos.
- Aba Diário foi removida (legado, commit `c627f33`, 23/08/2026); a agenda semana/dia da aba Rotinas cobre o uso. Não recriar uma tela/aba "Diário" separada — ver nota em `react-migration.md`.
- Excluir Meta continua acessível por swipe; mantenha o botão oculto `data-cddel` enquanto o wiring depender dele.

## Contratos visuais/funcionais existentes

- Ajustes tem seção "Som e vibração" (modo mudo/suave/normal + vibrar + testar) desde 11/09/2026 — o som do cronômetro é preferência de verdade no React, ao contrário do legado, onde `soundMode()` está amarrado em "mudo". Notificações expõem três avisos separados: ritmo (com dias), meta perto do prazo e sequência em risco.
- Exportar agenda (.ics) fica na seção Calendário externo de Ajustes: é cópia de mão única, não sincronização.

- Home: roda inclui boletim; rotina concluída vai ao fim e exibe horário real; rotinas ordenam por horário; “só hoje” usa `rotinaCabeEmHoje`, enquanto `rotinaOcorreHoje` fica estrita para notificação/MCP.
- Aba Rotinas (React): ordem das visões é Semana (padrão) / Dia / Lista, com um único FAB nas três que abre a escolha Rotina ou Evento. Card da visão Lista é compacto (ícones numa linha, sem chip de área — a bolinha já diz — e sem duração quando há horário). Clique em vão livre da grade Dia cria evento naquele horário.
- Player: lançamento rápido oferece nota, despesa, nota diária e cartão; overlay de etapas permite reordenar somente futuro; notas vinculadas não interrompem timer.
- Metas com prazo usam um formulário único (criação e edição) com quantidade + unidade, áreas, dias para trabalhar e peso; não existe horário para meta com prazo. Metas têm nota Markdown; recorrentes são padrão do seletor. Modelos abrem em Notas; pill Notas/Outros é `type-toggle.view-toggle`.
- Agenda (dia/semana, hoje dentro de Rotinas — ex-Diário): botão textual nos escopos; sem “+ bloco”; time-block mantém nome/hora na mesma linha.
- Kanban: mover usa `.kb-move-btn`; salto final usa check verde. Agenda inline compartilha grade/fonte única e seus comportamentos de clique/pontuação.
- Roda: nomes editáveis, sem reordenação de área; campos têm larguras preservadas.

Consulte `architecture.md` e `gamification.md` antes de mudar qualquer item. Se houver ponta visual, peça tela/função específica; não reconstrua uma área inteira.
