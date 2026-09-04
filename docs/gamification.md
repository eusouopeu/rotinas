# Gamificação e invariantes de negócio

## Núcleo

`K_GAMIFICACAO` armazena `config`, `semanaAtual`, histórico e badges. Pontue etapa a etapa, nunca em lote. Cada crédito armazena `pb`; o fator semanal é congelado na abertura e não pode ser recalculado durante a semana. Sem etapas agendadas, use a escala padrão de 20 blocos médios de 30 min = 100; fator zero é inválido. `repararFatorSemanaAtual` reescala legado. `avancarGamificacaoAteAgora` resolve viradas se o app ficou fechado.

`tagValor:"nenhum"` vale sempre zero, não entra na agenda congelada nem no total. A rotina continua executável sem pontuar. Não exponha multiplicador editável para “nenhum”.

## Semana e áreas

Início da semana vem somente de `weekStartDow`/`inicioSemanaISO`; nunca recalcule com `getDay()` solto. Dias literais atendem `schedule.days`; offsets da semana configurada atendem agenda congelada, esperado e chaves kanban. Converta com `offsetSemana` e ordene com `ordemDiasSemana`. A semana pertence ao mês em que termina. A alteração de início reancora pela rotina própria e preserva migrações de legado.

Com Roda da Vida ativa, distribua os 100 pontos primeiro entre áreas proporcionais ao peso e depois entre rotinas da área. Área sem item agendado não reserva fatia. `r.eixo` e itens ligados preservam área; cada conclusão guarda `area`. Sem roda, use fator global.

Hábito consolidado decide desconto no congelamento e grava `semanaAtual.habitos`; não derive do streak vivo durante a semana. Respeite `semHabito`. Vagas por peso são limites globais sem roda e por área com roda; validar no salvar, não no clique. `vagaHintHtml` só informa.

## Metas e Kanban

Meta por prazo pontua proporcionalmente por progresso, via delta, com `creditos` por período. Estorno pode voltar a períodos anteriores; não deixe `creditos` e `gam.metasPontos` divergirem. Meta recorrente positiva é por padrão hábito/lembrete sem pontos, com opt-in `pontua: true` para creditar pontos semanais até o limite de vezes (`tipo:"metaRec"`). Negativa aplica penalidade por excesso via `tipo:"metaRecNeg"`, com itemId estável e estorno ao desmarcar/editar/apagar. Peso padrão de meta é alto (prazo) ou médio (recorrente).

Kanban dia/semana entra na nota semanal; mês/ano entram em `metasPontos`. Use `sincronizarPontosCartao`; conclusão tem ID estável e saída de Feito/exclusão estorna. Cartão aberto/em andamento pode rolar somente no dia atual; histórico não reescreve passado.

## Player e rotinas

“Não fazer” encerra sem pontuar e deixa pendência reaproveitável no mesmo dia; “pular” não. Reordenar etapas só da atual em diante e deve salvar snapshot/sincronizar overlay. Pomodoro e ciclo foram removidos: não recriar. Pontos, metas, roda, hábito, vagas e alterações de score exigem `test/gamificacao.cjs` e testes da área.
