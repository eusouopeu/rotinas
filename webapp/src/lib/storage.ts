// Camada de persistência — porta quase literal de index.html:203-347.
// Mesmo modelo: `mem` é um cache síncrono em memória; toda escrita é
// enfileirada e gravada de verdade num backend assíncrono escolhido por
// plataforma (Electron via IPC, Capacitor Filesystem, IndexedDB no browser).
// Os TRÊS backends têm que continuar lendo/escrevendo o mesmo formato que o
// app antigo usa — não é um storage novo, é o mesmo dado.
import { K_MIGRATED, K_PREFIX } from "./constants";

interface StorageBackend {
  getAll(): Promise<Map<string, unknown> | null>;
  set(key: string, val: unknown): Promise<unknown> | void;
  del(key: string): Promise<void>;
}

// `sync`/`mcp` são só assinatura de tipo aqui — a implementação de verdade
// mora no processo Electron (preload.js/main.js); ver lib/nativeBridge.ts
// para quem consome. Opcionais porque nem toda instalação expõe as duas.
export interface ElectronBridge {
  getAll(): Promise<Array<[string, unknown]>>;
  set(key: string, val: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  sync?: import("./nativeBridge").SyncBridge;
  mcp?: import("./nativeBridge").McpBridge;
  ical?: import("./nativeBridge").IcalBridge;
  miniPlayer?: import("./nativeBridge").MiniPlayerBridge;
  onPlayerCall?: (handler: import("./nativeBridge").PlayerCallHandler) => void;
}

interface CapacitorFilesystem {
  readdir(opts: { path: string; directory: string }): Promise<{ files: Array<string | { name: string }> }>;
  readFile(opts: { path: string; directory: string; encoding: string }): Promise<{ data: string }>;
  writeFile(opts: { path: string; directory: string; encoding: string; data: string; recursive: boolean }): Promise<unknown>;
  deleteFile(opts: { path: string; directory: string }): Promise<unknown>;
}

export interface CapacitorPlugins {
  Filesystem: CapacitorFilesystem;
  DriveSync?: import("./nativeBridge").DriveSyncPlugin;
  LocalNotifications?: import("./nativeBridge").LocalNotificationsPlugin;
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins: CapacitorPlugins;
    };
  }
}

export const isNative = !!(
  typeof window !== "undefined" &&
  window.Capacitor?.isNativePlatform &&
  window.Capacitor.isNativePlatform()
);
export const isDesktop = typeof window !== "undefined" && !!window.electronBridge;

function makeElectronBackend(EB: ElectronBridge): StorageBackend {
  return {
    async getAll() {
      const out = new Map<string, unknown>();
      let entries: Array<[string, unknown]> = [];
      try {
        entries = await EB.getAll();
      } catch {
        return out; // pasta ainda não existe = primeira execução
      }
      entries.forEach(([k, v]) => out.set(k, v));
      return out;
    },
    set(key, val) {
      return EB.set(key, val);
    },
    async del(key) {
      try {
        await EB.del(key);
      } catch {
        /* ignora */
      }
    },
  };
}

function makeCapacitorBackend(FS: CapacitorFilesystem): StorageBackend {
  const fpath = (k: string) => "brita/" + k + ".json";
  return {
    async getAll() {
      const out = new Map<string, unknown>();
      let names: string[] = [];
      try {
        const r = await FS.readdir({ path: "brita", directory: "DATA" });
        names = (r.files || []).map((f) => (typeof f === "string" ? f : f.name));
      } catch {
        return out;
      }
      for (const n of names) {
        if (!n.endsWith(".json")) continue;
        try {
          const r = await FS.readFile({ path: "brita/" + n, directory: "DATA", encoding: "utf8" });
          out.set(n.slice(0, -5), JSON.parse(r.data));
        } catch {
          /* ignora entrada corrompida */
        }
      }
      return out;
    },
    set(key, val) {
      return FS.writeFile({
        path: fpath(key),
        directory: "DATA",
        encoding: "utf8",
        data: JSON.stringify(val),
        recursive: true,
      });
    },
    async del(key) {
      try {
        await FS.deleteFile({ path: fpath(key), directory: "DATA" });
      } catch {
        /* ignora */
      }
    },
  };
}

function makeIndexedDbBackend(): StorageBackend {
  let dbp: Promise<IDBDatabase> | null = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const req = indexedDB.open("brita", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("kv");
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }
    return dbp;
  }
  function tx(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
    return db().then(
      (d) =>
        new Promise<void>((res, rej) => {
          const t = d.transaction("kv", mode);
          fn(t.objectStore("kv"));
          t.oncomplete = () => res();
          t.onerror = () => rej(t.error);
        })
    );
  }
  return {
    async getAll() {
      const out = new Map<string, unknown>();
      const d = await db();
      await new Promise<void>((res, rej) => {
        const req = d.transaction("kv", "readonly").objectStore("kv").openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (c) {
            out.set(String(c.key), c.value);
            c.continue();
          } else res();
        };
        req.onerror = () => rej(req.error);
      });
      return out;
    },
    set(key, val) {
      return tx("readwrite", (s) => void s.put(val, key));
    },
    del(key) {
      return tx("readwrite", (s) => void s.delete(key));
    },
  };
}

function pickBackend(): StorageBackend {
  if (isDesktop) return makeElectronBackend(window.electronBridge!);
  if (isNative) return makeCapacitorBackend(window.Capacitor!.Plugins.Filesystem);
  return makeIndexedDbBackend();
}

export const storageBackend = pickBackend();

const mem = new Map<string, unknown>();
let persistChain: Promise<unknown> = Promise.resolve();

function persistQueue(fn: () => Promise<unknown> | void) {
  persistChain = persistChain.then(fn).catch((e) => {
    console.error("Falha ao persistir dados:", e);
  });
}

export function load<T>(key: string, fallback: T): T {
  return mem.has(key) ? (mem.get(key) as T) : fallback;
}

export function save(key: string, val: unknown): void {
  mem.set(key, JSON.parse(JSON.stringify(val)));
  persistQueue(() => storageBackend.set(key, mem.get(key)));
}

/** Porta de saveRaw (index.html:312) — grava SEM o clone JSON, preservando
 * objetos que só sobrevivem por structured clone no IndexedDB (ex.:
 * FileSystemFileHandle do backup automático em arquivo). */
export function saveRaw(key: string, val: unknown): void {
  mem.set(key, val);
  persistQueue(() => storageBackend.set(key, mem.get(key)));
}

export function removeKey(key: string): void {
  mem.delete(key);
  persistQueue(() => storageBackend.del(key));
}

/**
 * Sequência de boot — mesmo comportamento de index.html:318-347: lê tudo do
 * backend, migra localStorage legado (K_PREFIX) na primeira execução real, e
 * popula o cache `mem` antes de qualquer load() subsequente.
 */
export async function bootStorage(): Promise<void> {
  let stored: Map<string, unknown> | null = null;
  try {
    stored = await storageBackend.getAll();
  } catch (e) {
    console.error("Falha ao ler armazenamento:", e);
  }
  if (stored === null) {
    stored = new Map();
  } else if (!stored.has(K_MIGRATED)) {
    if (stored.size === 0 && typeof localStorage !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !k.startsWith(K_PREFIX)) continue;
          try {
            const v = JSON.parse(localStorage.getItem(k) as string);
            if (v !== null) {
              stored.set(k, v);
              persistQueue(() => storageBackend.set(k, v));
            }
          } catch {
            /* ignora item ilegível */
          }
        }
      } catch {
        /* localStorage indisponível */
      }
    }
    stored.set(K_MIGRATED, true);
    persistQueue(() => storageBackend.set(K_MIGRATED, true));
  }
  stored.forEach((v, k) => mem.set(k, v));
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
