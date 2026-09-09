# Android, Electron, MCP e notificações

## Android/Capacitor

Capacitor 8: filesystem, local-notifications, share; proteja ramificações com `isNative`. Exports usam `nativeWriteExport` em `Documentos/<pasta>` e share sheet; não use blob/download/print. A pasta configurável (`K_DATAFOLDER`) vale para export, auto-backup e espelho Markdown; migração é best-effort e não move a store viva em `Directory.Data/brita`, que é lida pelo widget. Auto-backup é a cada três dias. `syncNativeSchedules` agenda rotinas recorrentes.

Plugins Android: registrar em `MainActivity`; widget lê arquivos direto por `RoutineStore`. Overlay só aparece em segundo plano, recebe fila de etapas e lê millis por `optLong`. Alertas de primeiro plano usam WebAudio/vibração; segundo plano usa LocalNotifications independente do overlay, com canais próprios e cancelamento/reagendamento centralizado.

A bolha do overlay (`TimerOverlayService`) nasce ancorada na borda direita, meio da altura da tela (posição calculada por `DisplayMetrics`, não por `Gravity`, porque o arraste em `ACTION_MOVE` assume x/y crescendo a partir do canto superior esquerdo — mudar a gravity sem inverter o cálculo do arraste quebra a direção do drag) — evita a faixa de cima (status bar, título/deck de apps como Anki) e a de baixo (controles de vídeo, botões de resposta), que é onde incomodava por padrão antes de 09/09/2026. Continua livremente arrastável; a última posição só dura enquanto o serviço está de pé (não persiste em disco). A notificação em primeiro plano do overlay (canal `brita_overlay`) usa `setUsesChronometer`/`setChronometerCountDown` (API 24+, igual ao minSdk) para mostrar a contagem regressiva sozinha na barra de notificações/lock screen, como o timer nativo do relógio da Samsung — sem polling manual; ela é reconstruída a cada `onStartCommand` (chamada JS) e também quando `rollForward()` avança etapa automática sozinho, com o WebView suspenso. **`TimerOverlayPlugin`/`TimerOverlayService` só é chamado pelo `index.html` legado — o `webapp/` (produção Android desde o corte de 05/09/2026) ainda não tem essa ponte, gap conhecido em `webapp/src/screens/Settings.tsx`.**

## Electron e MCP

Electron é terceira casca do mesmo legado. Preload é ponte exclusiva, com `contextIsolation:true` e `nodeIntegration:false`; storage passa por IPC. `desktop:start` copia `www`, `desktop:build` usa electron-builder. O MCP local é Streamable HTTP em loopback, token em `userData`, e modo padrão somente leitura. Toda tool de escrita delega a `window.__britaMCP` e às mesmas funções de UI: nunca replique score ou regras. Atualize somente o card MCP quando apropriado, sem `render` global.

Electron carregado por `file://` não tem service worker funcional. Notificações desktop usam `notifyDesktop`/`Notification`, e clique mostra janela. Scheduler permanece ativo com janela escondida.
