# Backup, importação e sincronização

## Checklist obrigatório para coleção nova

Inclua-a em `backupData`, nos dois handlers de importação (substituir e mesclar), em `SYNCED_KEYS` desktop e Android e em `applySyncedKey`. Mantenha testes `test/sync-keys.cjs` verdes: ele compara array JS, array Java e switch do renderer. Coleções do backup v8: `routines`, `notes`, `history`, `templates`, `snoozes`, `diario`, `diaKanban`, `exercicios`, `compromissos`.

## Drive desktop

Sync roda no main process a cada 10 min, mais início e botão manual. Usa `modifiedTime`, não manifest remoto; estado local é `sync-state.json` e nunca sobe. O merge 3-way compara `baseContent`: arrays por `id` e mapas por chave mesclam adição/remoção/edição unilateral; escalar não entra no merge granular. Sem base em instalação antiga, primeiro conflito é manual e passa a estabelecer base. Testes: `sync-merge.cjs` e `sync.cjs`.

Conflito real não sobrescreve nada: grave `<chave>.conflict-<timestamp>.json` e ofereça manter local/usar remoto por `resolveConflict`, sem reutilizar o modal de importação geral. Download sem conflito substitui a chave e chama o fluxo normal de `applySyncedKey`/`save`.

## OAuth e segredos

OAuth desktop usa loopback `127.0.0.1`, navegador externo e PKCE S256. Credenciais embutidas são de app instalado e há override local `google-oauth-client.json`; não expor credenciais em UI fora do fallback previsto. Tokens ficam criptografados em `google-drive-tokens.enc` por `safeStorage`, nunca texto puro ou keytar.

## Android

Android espelha motor e `SYNCED_KEYS` em Java, usa a pasta `brita-sync`, Filesystem nativo para chaves e `EncryptedSharedPreferences`/Keystore para tokens/estado. `syncBridge` abstrai Electron/Capacitor. Não há sync periódico com app fechado: ocorre no retorno ao app e manualmente. Nunca deixe desktop e Android divergirem.

## Campos novos sem coleção nova (30/09/2026)

Despesa fixa vive em `templates` (tipo `expense`): a original ganha `recorrente`/`recUltimo` e cada cópia mensal tem id determinístico `<id da original>:<AAAA-MM>` com `origemRec` — dois aparelhos que lançam o mesmo mês geram o mesmo id e o merge por `id` não duplica. Rotina arquivada é `arquivada: true` + pausa até `9999-12-31` em `routines`; `gam.ultimoMesVisto` segue a gamificação. `K_BOASVINDAS` (primeira abertura já vista) é preferência local, fora do backup e do sync.

Campos novos de 01/10/2026, também sem coleção nova: energia do dia vive no mapa `diario` sob `energia:AAAA-MM-DD` ("1".."5", `lib/energia.ts`) — entra no backup e no merge por chave do diário; meta com prazo ganhou `progressoDias` (saldo por dia, últimos 60) e meta recorrente `rotinaId`, ambos dentro do doc de metas em `templates`. `K_FECHAMENTODIA` (dia em que o "Fechar o dia" foi dispensado) e `K_LEMBRETEGASTO` (lembrete de gastos ligado) são preferências locais, fora do backup e do sync.

Campos novos da 2ª rodada de 01/10/2026, também sem coleção nova: `RoutineStep.essencial` (versão mínima) em `routines`; `HistoryEntry.minima` em `history`; `MetaTarget.marcos` (`{id, data, alvo}`) no doc de metas em `templates`; orçamento de gastos no mapa `diario` sob `orcamento:<categoria>` (valor em reais; vazio = sem limite); notas de anotação de rotina são docs `type: "journal"` em `templates` (formato do legado). O espelho `.json` das rotinas em Documentos é cópia de mão única — não é fonte de sync nem é lido de volta.

