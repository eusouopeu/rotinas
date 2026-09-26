# Gamificação e invariantes de negócio

## Núcleo

`K_GAMIFICACAO` armazena `config`, `semanaAtual`, histórico e badges. Pontue etapa a etapa, nunca em lote. Cada crédito armazena `pb`; o fator semanal é congelado na abertura e não pode ser recalculado durante a semana. Sem etapas agendadas, use a escala padrão de 20 blocos médios de 30 min = 100; fator zero é inválido. `repararFatorSemanaAtual` reescala legado. `avancarGamificacaoAteAgora` resolve viradas se o app ficou fechado.

Etapa de tipo `exercicio` entra na agenda congelada como etapa de tempo, valendo `sets * restSeconds` (mesma conta do legado, `index.html:1327-1328`, e do crédito em `advanceStep`). Portar só `type === "timer"` — o que o React fez até 22/09/2026 — faz rotina de academia pesar zero na semana: a área dela não reserva fatia e as séries concluídas caem fora da agenda, creditadas pelo fator global como "extra".

`tagValor:"nenhum"` vale sempre zero, não entra na agenda congelada nem no total. A rotina continua executável sem pontuar. Não exponha multiplicador editável para “nenhum”.

## Semana e áreas

Início da semana vem somente de `weekStartDow`/`inicioSemanaISO`; nunca recalcule com `getDay()` solto. Dias literais atendem `schedule.days`; offsets da semana configurada atendem agenda congelada, esperado e chaves kanban. Converta com `offsetSemana` e ordene com `ordemDiasSemana`. A semana pertence ao mês em que termina. A alteração de início reancora pela rotina própria e preserva migrações de legado.

Com Roda da Vida ativa, distribua os 100 pontos primeiro entre áreas proporcionais ao peso e depois entre rotinas da área. **Desde 22/09/2026 toda área cadastrada reserva fatia**, tenha ou não item agendado na semana (`areasComFatia`/`fatiasPorArea` em `lib/gamificacao.ts`): antes só entravam as áreas com peso agendado, então o conjunto de áreas com fatia mudava a cada semana conforme a agenda, e a mesma área ora dividia os 100, ora entrava como extra sobre eles. A fatia reservada fica gravada em `semanaAtual.fatiasArea` (opcional — semanas congeladas antes dessa data não têm) e é o que o boletim mostra como "previsto". Área com agenda divide a fatia dela entre o que está agendado; área sem agenda mantém a fatia reservada e pontua itens avulsos no fator global da semana. Consequência aceita: fatia de área sem nada agendado nem feito fica por preencher e o teto prático da semana cai — é o significado da roda, área negligenciada custa pontos. "Sem área" só reserva fatia quando existe peso agendado sem área. `r.eixo` e itens ligados preservam área; cada conclusão guarda `area`. Sem roda, use fator global.

Hábito consolidado decide desconto no congelamento e grava `semanaAtual.habitos`; não derive do streak vivo durante a semana. Respeite `semHabito`. Vagas por peso são limites globais sem roda e por área com roda; validar no salvar, não no clique. `vagaHintHtml` só informa.

## Metas e Kanban

Meta por prazo pontua proporcionalmente por progresso, via delta, com `creditos` por período. Estorno pode voltar a períodos anteriores; não deixe `creditos` e `gam.metasPontos` divergirem. Meta recorrente positiva é por padrão hábito/lembrete sem pontos, com opt-in `pontua: true` (`tipo:"metaRec"`). Negativa aplica penalidade por excesso via `tipo:"metaRecNeg"`, com itemId estável e estorno ao desmarcar/editar/apagar.

Desde 26/09/2026 (React): as duas passam do limite (`ajustarProgressoMetaRec` não tem mais teto). Positiva divide o peso da meta pelos `vezes` itens (6 copos = 1/6 cada) e o item além do limite vale metade de um item (`metaRecPontosUnidade(rec, config, n)`; cada crédito guarda o `pb` dele). Negativa é exibida como saldo `vezes - feitas` (começa cheio, 4/4): verde enquanto ≥ 1, cor do texto em 0 (não pontua) e vermelho abaixo de zero, que é o excesso que desconta. `MetaRecorrente.sequencia` é a sequência contínua de períodos cumpridos (positiva: feitas ≥ vezes; negativa: feitas ≤ vezes), atualizada na virada preguiçosa de `metaRecProgresso`; períodos sem registro entre dois acessos contam como 0 feitas (cumprem a negativa, quebram a positiva). Peso padrão de meta é alto (prazo) ou médio (recorrente).

Kanban dia/semana entra na nota semanal; mês/ano entram em `metasPontos`. Use `sincronizarPontosCartao`; conclusão tem ID estável e saída de Feito/exclusão estorna. Cartão aberto/em andamento pode rolar somente no dia atual; histórico não reescreve passado.

## Player e rotinas

“Não fazer” encerra sem pontuar e deixa pendência reaproveitável no mesmo dia; “pular” não. Reordenar etapas só da atual em diante e deve salvar snapshot/sincronizar overlay. Pomodoro e ciclo foram removidos: não recriar. Pontos, metas, roda, hábito, vagas e alterações de score exigem `test/gamificacao.cjs` e testes da área.

## Descanso entre séries de exercício (12/09/2026)

A rotina guarda um único "descanso entre etapas" (`Routine.restSeconds`). O descanso ENTRE SÉRIES deriva dele conforme o exercício: composto usa o valor cheio, isolado usa 0,75x (`lib/exercicios.ts:descansoEntreSeries`). `Exercicio.composto` é opcional — ausente conta como composto, que era o comportamento único antes dessa data. Quem mexer no timer do player, na pontuação por série ou em `totalPlanejadoSegundos` precisa passar pelo helper, não pelo `restSeconds` cru.

O fato Σ do resumo da Roda da Vida é `ritmoInfo().esperado` — os pontos que deveriam estar feitos a esta altura da semana —, não a contagem de itens concluídos.

## Sequência de rotina com dias marcados (26/09/2026)

Rotina restrita a dias da semana (modo "dias", menos de 7): o dia marcado serve só para o filtro "hoje" e para as vistas Semana/Dia. A sequência vale pela QUANTIDADE — `sequenciaPorQuantidadeFor` em `lib/stats.ts` — e devolve dois números contínuos (não zeram na virada da semana): dias corridos desde a primeira execução da sequência e número de execuções (dias distintos) nela. Só quebra quando uma semana FECHADA teve menos execuções que `schedule.days.length`; a semana corrente nunca quebra. `streakInfoFor` usa isso para essas rotinas (unidade "dias" + `execucoes`); as funções semanais antigas continuam exportadas, sem uso na UI. Rotina diária e modo intervalo seguem no streak por dia.

## Estimativa de duração de exercício (26/09/2026)

Cada série de exercício (execução + descanso) começa estimada em 75s (`EXERCICIO_SET_SEG`). Com três execuções medidas do exercício (em qualquer rotina), a estimativa passa a ser a média de `elapsedSec / séries` das três mais recentes (`duracaoSerieEstimada`, `lib/routines.ts`). `StepActual.elapsedSec` é o tempo real da etapa sem pausas, gravado só para etapa "exercicio"; `actual` continua séries x descanso, que é o que pontua. Usada na duração do card/detalhe da rotina e na previsão de término no topo do player (`segundosRestantesEstimados`). A agenda (`computeSchedule`) continua com a estimativa fixa.
