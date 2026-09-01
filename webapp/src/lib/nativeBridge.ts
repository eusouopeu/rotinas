// Tipos + acesso às pontes nativas de Drive/MCP (index.html:14142-14311) —
// SEM reimplementar nada: cada método aqui só chama a mesma ponte que o app
// legado já usa (window.electronBridge no Electron, plugin Capacitor
// DriveSync no Android). Hoje o Electron carrega www/index.html, não o
// build do React, então window.electronBridge não existe no runtime do
// React ainda — os cards ficam prontos e corretos, mas inertes até o dia em
// que o Electron passar a carregar webapp-dist (ver docs/react-migration.md).
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

/** Ponte do plugin Capacitor LocalNotifications (index.html:2765-2900) — só
 * a fatia usada pela sincronização de notificação de compromisso avulso
 * (ver lib/notifications.ts); o resto do sistema de notificações nativas
 * (rotinas agendadas, metas recorrentes, digest semanal) fica fora desta
 * fase. */
export interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  getPending(): Promise<{ notifications: Array<{ id: number; extra?: Record<string, unknown> }> }>;
  cancel(args: { notifications: Array<{ id: number }> }): Promise<void>;
  schedule(args: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      extra?: Record<string, unknown>;
      schedule: { at: Date; allowWhileIdle?: boolean };
    }>;
  }): Promise<void>;
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
