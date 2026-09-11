// Tipos + acesso às pontes nativas de Drive/MCP (index.html:14142-14311) —
// SEM reimplementar nada: cada método aqui só chama a mesma ponte que o app
// legado já usa (window.electronBridge no Electron, plugin Capacitor
// DriveSync no Android). Desde o corte de produção de 05/09/2026, Electron e
// Android carregam webapp-dist (este build React), então essas pontes rodam
// pela primeira vez em produção aqui — ver docs/react-migration.md para os
// gaps aceitos nesse corte.
import { isDesktop, isNative } from "./storage";

export interface SyncKeyHealth {
  key: string;
  syncedAt?: number | null;
  conflito?: boolean;
}

export interface SyncStatus {
  hasClientCreds: boolean;
  connected: boolean;
  lastSyncAt?: number | null;
  pendingConflicts?: string[];
  keys?: SyncKeyHealth[];
}

export interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  merged?: string[];
  conflicts: string[];
}

export interface SyncBridge {
  saveClientCreds(id: string, secret: string): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncNow(): Promise<SyncResult>;
  getStatus(): Promise<SyncStatus>;
  resolveConflict(key: string, choice: "local" | "remote"): Promise<void>;
}

export interface McpLogEntry {
  tool: string;
  ts: number;
  kind?: "read" | "write";
}

export interface McpStatus {
  running: boolean;
  mode: "off" | "read" | "write";
  port: number;
  token: string;
  /** false enquanto o dispatcher de tools não estiver portado ao React (ver docs/react-migration.md);
   * o main process força o servidor desligado nesse caso, independente do modo salvo. */
  wired?: boolean;
  log?: McpLogEntry[];
}

export interface McpBridge {
  getStatus(): Promise<McpStatus>;
  setMode(mode: "off" | "read" | "write"): Promise<void>;
  setPort(port: number): Promise<void>;
  regenerateToken(): Promise<void>;
}

/** Ponte de Calendário externo (index.html:380-385) — só no desktop; browser
 * e Android usam fetch direto (Android via CapacitorHttp, transparente). */
export interface IcalBridge {
  fetch(url: string): Promise<string>;
}

export interface MiniPlayerState {
  routineName: string;
  stepName: string;
  idx: number;
  total: number;
  isTimer: boolean;
  remaining: number | null;
  paused: boolean;
}

/** Ponte da mini-player (index.html:14650-14674, electron/preload.js:64-87)
 * — janela separada sempre-no-topo (electron/mini-player.html), só desktop.
 * Ela não conhece playerState: pergunta "getState" (poll de 1s) e manda
 * "control" (pausar/concluir), sempre através da janela principal, que é
 * quem tem o player de verdade — por isso o handler é registrado aqui
 * (janela principal) via onPlayerCall, não chamado pela mini-player
 * diretamente. */
export interface MiniPlayerBridge {
  open(): void;
  close(): void;
}

export type PlayerCallHandler = (tool: "getState" | "control", args?: unknown) => Promise<MiniPlayerState | boolean | null>;

/** Registra, na janela principal, o handler que responde ao round-trip da
 * mini-player. `null` se a ponte não existir (browser, Android, ou Electron
 * ainda carregando o app legado — ver docs/react-migration.md). */
export function getMiniPlayerBridge(): MiniPlayerBridge | null {
  if (isDesktop && window.electronBridge?.miniPlayer) return window.electronBridge.miniPlayer;
  return null;
}

export interface DriveSyncPlugin {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncNow(): Promise<SyncResult>;
  getStatus(): Promise<SyncStatus>;
  resolveConflict(args: { key: string; choice: "local" | "remote" }): Promise<void>;
}

/** Ponte do plugin Capacitor Share, usada por shareOrDownload/exportPdfView
 * (index.html:10679-10702, 6316-6337) para abrir o share sheet nativo com o
 * arquivo já gravado. */
export interface SharePlugin {
  share(args: { title: string; files: string[] }): Promise<void>;
}

/** Ponte do plugin Capacitor LocalNotifications (index.html:2765-2900) — só
 * a fatia usada pela sincronização de notificação de compromisso avulso
 * (ver lib/notifications.ts); o resto do sistema de notificações nativas
 * (rotinas agendadas, metas recorrentes, digest semanal) fica fora desta
 * fase. */
export interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  /** Opcional: ausente em versões antigas do plugin; só é necessário no
   * Android 13+, onde POST_NOTIFICATIONS é permissão de runtime. */
  requestPermissions?(): Promise<{ display: string }>;
  getPending(): Promise<{ notifications: Array<{ id: number; extra?: Record<string, unknown> }> }>;
  /** Android: canal de notificação. Opcional — no-op/ausente no desktop e em
   * versões antigas do plugin (index.html:2687-2692). */
  createChannel?(args: { id: string; name: string; description?: string; importance?: number; vibration?: boolean }): Promise<void>;
  cancel(args: { notifications: Array<{ id: number }> }): Promise<void>;
  schedule(args: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      extra?: Record<string, unknown>;
      /** Android: canal criado por createChannel (index.html:2717). */
      channelId?: string;
      // ausente = dispara imediatamente (index.html:2771-2772, notifyDigestSemanal);
      // `at` = ocorrência única; `on` = recorrente (rotina agendada, index.html:2825).
      schedule?: { at: Date; allowWhileIdle?: boolean } | { on: { weekday?: number; hour: number; minute: number } };
    }>;
  }): Promise<void>;
}

export interface TimerOverlayQueueItem {
  label: string;
  seconds: number;
  auto: boolean;
}

export interface TimerOverlayShowArgs {
  endTs: number;
  label: string;
  paused: boolean;
  remainingMs: number;
  auto: boolean;
  visible: boolean;
  /** JSON de TimerOverlayQueueItem[] — etapas seguintes, para o serviço rolar os descansos sozinho. */
  queue: string;
}

/** Ponte do plugin Capacitor TimerOverlay
 * (android/app/src/main/java/com/pedro/rotinas/TimerOverlayPlugin.java) —
 * bolha do cronômetro sobre outros apps E a notificação em primeiro plano
 * com chronometer na barra/lock screen (mesmo serviço cobre as duas
 * superfícies, index.html:2601-2675). Só Android. */
/* Os métodos devolvem `Promise<X> | X` de propósito: o proxy do Capacitor nem
   sempre entrega Promise (e pode lançar de forma síncrona quando o plugin não
   está de pé). Tipar como Promise pura foi o que derrubou a tela do Player no
   APK v39 — ver overlayShow/overlayHide abaixo. */
export interface TimerOverlayPlugin {
  hasPermission(): Promise<{ granted: boolean }> | { granted: boolean };
  requestPermission(): Promise<{ granted: boolean }> | { granted: boolean };
  show(args: TimerOverlayShowArgs): Promise<void> | void;
  hide(): Promise<void> | void;
}

export function getTimerOverlayBridge(): TimerOverlayPlugin | null {
  if (isNative && window.Capacitor?.Plugins.TimerOverlay) return window.Capacitor.Plugins.TimerOverlay;
  return null;
}

/** Chama a ponte nativa sem nunca derrubar quem chamou — mesma defesa do
 * legado (index.html:2650-2663 e 2665-2672): o retorno pode não ser Promise
 * (nada a encadear) e a chamada pode lançar de forma síncrona. Num efeito do
 * React, uma exceção dessas desmonta a árvore inteira: tela branca. */
function chamarPonte(rodar: () => unknown, contexto: string): void {
  try {
    const r = rodar() as { catch?: (cb: (e: unknown) => void) => unknown } | undefined;
    if (r && typeof r.catch === "function") r.catch((e: unknown) => console.error(contexto, e));
  } catch (e) {
    console.error(contexto, e);
  }
}

/** Porta de sincronizarOverlay (index.html:2650-2663) — sobe/atualiza a bolha
 * e a notificação com chronometer. Silencioso fora do Android. */
export function overlayShow(args: TimerOverlayShowArgs): void {
  const p = getTimerOverlayBridge();
  if (!p) return;
  chamarPonte(() => p.show(args), "overlay:");
}

/** Porta de pararOverlay (index.html:2665-2672) — encerra serviço e bolha. */
export function overlayHide(): void {
  const p = getTimerOverlayBridge();
  if (!p) return;
  chamarPonte(() => p.hide(), "overlay:");
}

export interface AppStateChangeInfo {
  isActive: boolean;
}

export interface PluginListenerHandle {
  remove?: () => void;
}

export interface AppPlugin {
  addListener(
    eventName: "appStateChange",
    cb: (state: AppStateChangeInfo) => void,
  ): Promise<PluginListenerHandle> | PluginListenerHandle;
}

/** Assina appStateChange do plugin Capacitor App (index.html:2767-2771) —
 * sinal confiável de "saiu da frente" no APK; complementa visibilitychange,
 * que cobre o navegador. Devolve unsubscribe; no-op fora do Android. Como no
 * legado, nada aqui pode escapar: o proxy devolve ora Promise, ora o handle
 * direto, e lança se o plugin não estiver registrado. */
export function onAppStateChange(cb: (isActive: boolean) => void): () => void {
  const plugin = isNative ? window.Capacitor?.Plugins.App : undefined;
  if (!plugin) return () => {};
  let handle: PluginListenerHandle | null = null;
  let cancelado = false;
  try {
    const r = plugin.addListener("appStateChange", (s) => cb(s.isActive));
    if (r && typeof (r as PromiseLike<PluginListenerHandle>).then === "function") {
      (r as Promise<PluginListenerHandle>)
        .then((h) => {
          if (cancelado) h?.remove?.();
          else handle = h;
        })
        .catch((e) => console.error("appStateChange:", e));
    } else {
      handle = r as PluginListenerHandle;
    }
  } catch (e) {
    console.error("appStateChange:", e);
  }
  return () => {
    cancelado = true;
    try {
      handle?.remove?.();
    } catch (e) {
      console.error("appStateChange:", e);
    }
  };
}

/** Porta de syncBridge (index.html:14283-14297) — mesma ponte comum entre
 * desktop (IPC) e Android (Capacitor), métodos idênticos. */
export function getSyncBridge(): SyncBridge | null {
  if (isDesktop && window.electronBridge?.sync) return window.electronBridge.sync;
  if (isNative && window.Capacitor?.Plugins.DriveSync) {
    const P = window.Capacitor.Plugins.DriveSync;
    return {
      saveClientCreds: () => Promise.resolve(),
      connect: () => P.connect(),
      disconnect: () => P.disconnect(),
      syncNow: () => P.syncNow(),
      getStatus: () => P.getStatus(),
      resolveConflict: (key, choice) => P.resolveConflict({ key, choice }),
    };
  }
  return null;
}

/** MCP só existe no desktop (servidor local no main process do Electron). */
export function getMcpBridge(): McpBridge | null {
  if (isDesktop && window.electronBridge?.mcp) return window.electronBridge.mcp;
  return null;
}

/** Porta de mcpConfigJson (index.html:14146-14150). */
export function mcpConfigJson(status: McpStatus): string {
  return JSON.stringify(
    {
      mcpServers: { brita: { url: `http://127.0.0.1:${status.port}/mcp`, headers: { Authorization: `Bearer ${status.token}` } } },
    },
    null,
    2,
  );
}
