# Estado de funcionalidades e decisões preservadas

## Não reimplementar

- Gerenciador de tarefas de estudo foi removido; usar cartões Kanban/Metas, não quinta superfície.
- Tipo de nota “Ideia”, Pomodoro e ciclo de repetição foram removidos.
- Agenda antiga como tela separada, botão de boletim Home, filtro de área da Home, card Hoje e CSV foram removidos/substituídos.
- Aba Dados **voltou** no React em 12/09/2026 (mockups do Pedro): `Stats.tsx` é a tela da aba `dados` na tabbar, não mais uma tela interna aberta pelo cabeçalho da Home. Não recriar o botão "Dados" no `home-header` nem o "voltar" no cabeçalho de Dados.
- Aba Diário foi removida (legado, commit `c627f33`, 23/08/2026); a agenda semana/dia da aba Rotinas cobre o uso. Não recriar uma tela/aba "Diário" separada — ver nota em `react-migration.md`.
- Card "Alarmes agendados" em Ajustes foi removido em 12/09/2026 a pedido do Pedro (não recriar). O toggle "pontua no boletim" no formulário de meta recorrente também saiu: positiva sempre pontua, negativa nunca.
- Excluir Meta continua acessível por swipe; mantenha o botão oculto `data-cddel` enquanto o wiring depender dele.

## Contratos visuais/funcionais existentes

- Ajustes tem seção "Som e vibração" (modo mudo/suave/normal + vibrar + testar) desde 11/09/2026 — o som do cronômetro é preferência de verdade no React, ao contrário do legado, onde `soundMode()` está amarrado em "mudo". Notificações expõem três avisos separados: ritmo (com dias), meta perto do prazo e sequência em risco.
- Exportar agenda (.ics) fica na seção Calendário externo de Ajustes: é cópia de mão única, não sincronização.

- Home: roda inclui boletim; rotina concluída vai ao fim e exibe horário real; rotinas ordenam por horário; “só hoje” usa `rotinaCabeEmHoje`, enquanto `rotinaOcorreHoje` fica estrita para notificação/MCP.
- Aba Rotinas (React): ordem das visões é Semana (padrão) / Dia / Lista, com um único FAB nas três que abre a escolha Rotina ou Evento. Card da visão Lista é compacto (ícones numa linha, sem chip de área — a bolinha já diz — e sem duração quando há horário). Clique em vão livre da grade Dia cria evento naquele horário.
- Player: lançamento rápido oferece nota, despesa, nota diária e cartão; overlay de etapas permite reordenar somente futuro; notas vinculadas não interrompem timer.
- Card de rotina executada hoje (visão Lista): título riscado em `var(--sub)`, bolinha esmaecida, horário real em verde com check, selo de streak INVERTIDO (fundo cheio na cor da sequência, conteúdo em `var(--card)`) e botão de play em cor cheia. O selo não esmaece — inverte; foi correção explícita do Pedro em 22/09/2026.
- Rótulo de dias do card: 3+ dias seguidos viram intervalo (`ter → sex`); dois seguidos continuam listados (`ter/qua`). "todos os dias", "dias úteis" e "fim de semana" ganham do intervalo.
- Linha de filtros da visão Lista: dropdown de área da roda (ocupando a sobra) + três botões-ícone — ocultar feitas de hoje, só hoje, cards compactos/expandidos. O dropdown é `<select>` nativo de propósito: o menu é desenhado pelo sistema e nunca vaza a largura da tela.
- Editor de notas: título e data ficam na barra do topo (editáveis), com copiar-tudo e excluir (vermelho). Barra de baixo: B, lista, numerada, por letra, checklist, diminuir/aumentar recuo, tabela | modo cru (`</>`), arquivar, concluir. Itálico, título (H) e anexar imagem NÃO entram — decisão do Pedro em 22/09/2026.
- Arquivar nota tira da lista sem excluir; as arquivadas voltam pelo link "ver arquivadas (n)" na aba Notas.
- Ajustes (React, desde 22/09/2026): dois accordions agrupados — **Avisos e cronômetro** (notificações + som/vibração + cronômetro fora do app) e **Dados e backup** (dados + backup + backup em arquivo + sincronização com nuvem + diagnóstico). Não voltar a quebrá-los em accordions separados.
- Sair de uma rotina em andamento **guarda o progresso**: a Home mostra o cartão "Rotina em andamento" com retomar/descartar, e ele sobrevive a fechar o app (`K_PLAYER`). Existe no legado desde sempre e voltou ao React em 22/09/2026 — não remover de novo.
- Metas com prazo usam um formulário único (criação e edição) com quantidade + unidade, áreas, dias para trabalhar e peso; não existe horário para meta com prazo. Metas têm nota Markdown; recorrentes são padrão do seletor. Modelos abrem em Notas; pill Notas/Outros é `type-toggle.view-toggle`.
- Agenda (dia/semana, hoje dentro de Rotinas — ex-Diário): botão textual nos escopos; sem “+ bloco”; time-block mantém nome/hora na mesma linha.
- Kanban: mover usa `.kb-move-btn`; salto final usa check verde. Agenda inline compartilha grade/fonte única e seus comportamentos de clique/pontuação.
- Roda: nomes editáveis, sem reordenação de área; campos têm larguras preservadas.

Consulte `architecture.md` e `gamification.md` antes de mudar qualquer item. Se houver ponta visual, peça tela/função específica; não reconstrua uma área inteira.
