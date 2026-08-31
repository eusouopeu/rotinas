# Android, Electron, MCP e notificações

## Android/Capacitor

Capacitor 8: filesystem, local-notifications, share; proteja ramificações com `isNative`. Exports usam `nativeWriteExport` em `Documentos/<pasta>` e share sheet; não use blob/download/print. A pasta configurável (`K_DATAFOLDER`) vale para export, auto-backup e espelho Markdown; migração é best-effort e não move a store viva em `Directory.Data/brita`, que é lida pelo widget. Auto-backup é a cada três dias. `syncNativeSchedules` agenda rotinas recorrentes.

Plugins Android: registrar em `MainActivity`; widget lê arquivos direto por `RoutineStore`. Overlay só aparece em segundo plano, recebe fila de etapas e lê millis por `optLong`. Alertas de primeiro plano usam WebAudio/vibração; segundo plano usa LocalNotifications independente do overlay, com canais próprios e cancelamento/reagendamento centralizado.

## Electron e MCP

Electron é terceira casca do mesmo legado. Preload é ponte exclusiva, com `contextIsolation:true` e `nodeIntegration:false`; storage passa por IPC. `desktop:start` copia `www`, `desktop:build` usa electron-builder. O MCP local é Streamable HTTP em loopback, token em `userData`, e modo padrão somente leitura. Toda tool de escrita delega a `window.__britaMCP` e às mesmas funções de UI: nunca replique score ou regras. Atualize somente o card MCP quando apropriado, sem `render` global.

Electron carregado por `file://` não tem service worker funcional. Notificações desktop usam `notifyDesktop`/`Notification`, e clique mostra janela. Scheduler permanece ativo com janela escondida.
