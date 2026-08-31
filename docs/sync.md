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
