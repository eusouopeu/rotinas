# Aprimoramentos implementados

Registro das melhorias entregues, uma por linha, no formato "descrição – implementado em data". Detalhes de regra e implementação ficam nos documentos temáticos (`gamification.md`, `native.md`, `feature-status.md`).

- Duração de cada série de exercício estimada em 1m15s e depois aprendida pela média das três últimas execuções – implementado em 26/09/2026
- Previsão de horário de término da rotina no topo do player – implementado em 26/09/2026
- Sequência de rotina com dias marcados contada pela quantidade (dias corridos + execuções), zerando só em semana fechada abaixo da meta – implementado em 26/09/2026
- Sequência contínua das metas recorrentes, sem zerar na virada da semana – implementado em 26/09/2026
- Metas recorrentes positivas e negativas podem passar do limite – implementado em 26/09/2026
- Meta negativa exibida como saldo (começa cheia, verde até 1, neutra em 0, vermelha e descontando abaixo de zero) – implementado em 26/09/2026
- Meta positiva com a pontuação dividida pelo número de itens e item excedente valendo metade – implementado em 26/09/2026
- Notificação do cronômetro deixa de ser repostada a cada bloqueio/desbloqueio do celular – implementado em 26/09/2026
- Cronômetro continua promovido à Now Bar com a tela de bloqueio acesa (modo bolha) – implementado em 26/09/2026
- Widget de sequência passa a mostrar o valor calculado pelo app e é redesenhado ao mudar o histórico – implementado em 27/09/2026
- Estimativa aprendida de exercício usada também na agenda e no boletim – implementado em 27/09/2026
- Virada de dia/semana das metas recorrentes gravada na abertura do app, sem alterar a meta durante a exibição – implementado em 27/09/2026
- Pontos do toque ("+0,8") exibidos ao lado do contador da meta – implementado em 27/09/2026
- Histórico de períodos das metas recorrentes e mini-calendário no cartão – implementado em 27/09/2026
- Sugestão de carga no player com base na última execução do exercício – implementado em 27/09/2026
- Diagnóstico do cronômetro em Ajustes (permissões, notificações em tempo real e teste de 10 s) – implementado em 27/09/2026
- Pausa da agenda não quebra as sequências – implementado em 27/09/2026
- Mini-calendário da meta tocável, com o detalhe de cada período e rótulo acessível – implementado em 27/09/2026
- Metas recorrentes na revisão da Semana fechada – implementado em 27/09/2026
- Previsão de término aprendendo também com as etapas de tempo – implementado em 27/09/2026
- Regressão visual cobrindo mini-calendário, detalhe do período, sugestão de carga e pausa por rotina; teste de componente do diagnóstico do cronômetro – implementado em 27/09/2026
- Seção de metas recorrentes no relatório PDF da aba Dados – implementado em 27/09/2026
- Widget de metas do dia com saldo da meta negativa e as cores do cartão – implementado em 27/09/2026
- Limite de cada período guardado no histórico da meta (mudar o limite não reclassifica o passado) – implementado em 27/09/2026
- Troca do início da semana preserva o histórico e o progresso das metas semanais – implementado em 27/09/2026
- Estimativas e sugestão de carga do player sem recalcular o histórico a cada segundo – implementado em 27/09/2026
- Selo de sequência dos cards sem refazer o cálculo a cada redesenho – implementado em 27/09/2026
- Pausar só uma rotina (sai da agenda, do "hoje", do boletim, dos alarmes e não quebra a sequência) – implementado em 27/09/2026
- Atraso previsto ("+N min") em relação ao fim agendado no topo do player – implementado em 27/09/2026
- Pausas e estimativas passadas como parâmetro, sem registros globais escondidos – implementado em 27/09/2026
- Visão Mês na agenda da aba Rotinas (bolinha por item do dia; tocar abre a visão Dia na data) – implementado em 27/09/2026
- Atalhos do launcher Android: Nova nota, Nova despesa e as duas primeiras rotinas – implementado em 27/09/2026
- Biblioteca de rotinas prontas no popup Criar (Manhã produtiva, Treino de força A, Bloco de estudo, Revisão semanal) – implementado em 27/09/2026
- Semana fechada pergunta separadamente "o que funcionou" e "o que travou" – implementado em 27/09/2026
- Aviso de backup atrasado na aba Rotinas (7+ dias sem exportação, auto-backup ou sync) – implementado em 27/09/2026
- Arquivar rotina: sai da lista, da agenda, do boletim e dos alarmes sem apagar histórico nem sequências; "ver arquivadas (n)" na Lista – implementado em 30/09/2026
- Despesas recorrentes: "repetir todo mês neste dia" lança as cópias ao abrir o app, sem duplicar entre aparelhos – implementado em 30/09/2026
- Mês fechado: cartão na aba Rotinas e tela com nota/selo do mês, semanas, rotinas mais feitas, gastos e foco do mês seguinte (vira nota) – implementado em 30/09/2026
- Primeira abertura guiada: num app vazio, escolher áreas da roda e rotinas prontas – implementado em 30/09/2026
- Redesenho pelos mockups do Pedro: cartões cápsula de rotina e meta (faixa da área, play em degradê, +/− empilhados), selo verde/vermelho da Roda da Vida, formulários de meta em grupos com áreas como chip, detalhe da rotina com etiquetas e deslizar etapa para editar/excluir – implementado em 30/09/2026
- Visão Mês com resumo do dia tocado, Lista expandida em quadrados, cartão de nota compacto com data completa, editor de rotina com agendamento antes das etapas e calendário externo do Google corrigido – implementado em 30/09/2026
- Projeção de conclusão da meta com prazo no ritmo dos últimos 14 dias – implementado em 01/10/2026
- Meta recorrente ligada a uma rotina (concluir a rotina conta +1) – implementado em 01/10/2026
- Fechar o dia: pendentes de hoje passam para amanhã ou são descartados – implementado em 01/10/2026
- Check-in diário de energia (1–5) cruzado com o cumprimento em Dados – implementado em 01/10/2026
- Lembrete de gastos às 21h nos dias sem despesa lançada – implementado em 01/10/2026
- Estética minimalista concluída no React (superfícies por cor, sem bordas de 1,5px) e widgets redesenhados com as cores do app e toque direto na tela – implementado em 01/10/2026
- Troca de abas sem recarregar (barra única e telas mantidas com Activity), botões-ícone maiores, selo de sequência só em laranja e ajudas recolhidas atrás do ⓘ – implementado em 01/10/2026

## Recomendações refutadas

Recomendações sugeridas e não escolhidas pelo Pedro, no formato "descrição – refutada em data". Não voltar a sugeri-las sem pedido explícito.

- Visão Ano na agenda (a visão Mês foi feita; a do ano ficou de fora) – refutada em 27/09/2026
- Adiar com swipe no Kanban e na agenda – refutada em 27/09/2026
- Ditado por voz nas notas e no lançamento rápido do player – refutada em 27/09/2026
- Replanejar o dia a partir do atraso previsto no player – refutada em 27/09/2026
- Aviso de conflito de horário na agenda – refutada em 27/09/2026
- Progressão automática de carga (+2,5 kg após duas execuções completas) – refutada em 27/09/2026
- Mapa de calor anual por rotina/meta – refutada em 27/09/2026
- Registro local de erros exportável em Ajustes › Diagnóstico – refutada em 27/09/2026
- Eventos que se repetem (compromisso semanal/mensal/a cada N dias) – refutada em 30/09/2026
- Resumo matinal por notificação (rotinas, eventos e metas do dia) – refutada em 30/09/2026
- Widget Android "Agenda de hoje" – refutada em 30/09/2026
- Links entre notas ([[Título]] abre/cria a nota) e lista "citada em" – refutada em 30/09/2026
- Compartilhar nota como Markdown pelo menu nativo – refutada em 30/09/2026
- Modelos de nota ao criar (ata, fichamento, plano de projeto) – refutada em 30/09/2026
- Lixeira de 30 dias para notas e rotinas excluídas – refutada em 30/09/2026
- Orçamento mensal por categoria nos gastos – refutada em 30/09/2026
- Revisão espaçada de itens das metas com prazo (1/7/30 dias) – refutada em 01/10/2026
- Sessão de foco avulsa creditando área ou meta – refutada em 01/10/2026
- Aviso de rotina não iniciada 15 min após o horário – refutada em 01/10/2026
- Não perturbe automático durante o player – refutada em 01/10/2026
- Bloco nas configurações rápidas do Android para começar a próxima rotina – refutada em 01/10/2026
- Três prioridades do dia no topo da aba Rotinas – refutada em 01/10/2026
- Copiar o planejamento de um dia para outro – refutada em 01/10/2026
