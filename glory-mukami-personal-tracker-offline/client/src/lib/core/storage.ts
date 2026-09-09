/**
 * Durable local storage.
 *
 * The journal currently lives in `localStorage`, which is the wrong place for
 * anything a person would be upset to lose. It caps out around 5MB, it is
 * synchronous so every write janks the interface, and browsers treat it as
 * disposable: clearing site data, private browsing, and storage pressure all
 * wipe it without warning.
 *
 * This module moves the journal to IndexedDB, which is asynchronous, orders of
 * magnitude larger, and eligible for persistent storage — a status the browser
 * grants on request that stops routine cleanup from evicting the data.
 *
 * It must be said plainly: **this makes the data durable on one device, not
 * safe.** A lost or wiped device still loses everything stored only here. The
 * only thing that survives losing the device is a copy somewhere else, which
 * means the sync engine and a server, or a backup file the user has exported.
 */

export type StorageKind = "indexeddb" | "localstorage" | "memory";

export type StorageStatus = {
  kind: StorageKind;
  /** True once the browser has agreed not to evict this origin's data. */
  persistent: boolean;
  /** Bytes used and available, when the browser will say. */
  usageBytes?: number;
  quotaBytes?: number;
};

export interface JournalStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  readonly kind: StorageKind;
}

const DB_NAME = "glory-personal-tracker";
const DB_VERSION = 1;
const STORE = "journal";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class IndexedDbStore implements JournalStore {
  readonly kind: StorageKind = "indexeddb";

  constructor(private readonly db: IDBDatabase) {}

  private tx(mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(STORE, mode).objectStore(STORE);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return promisify(this.tx("readonly").get(key) as IDBRequest<T | undefined>);
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Structured-cloned by the browser, so no JSON round trip and no silent
    // loss of anything JSON cannot represent.
    await promisify(this.tx("readwrite").put(value, key));
  }

  async delete(key: string): Promise<void> {
    await promisify(this.tx("readwrite").delete(key));
  }

  async keys(): Promise<string[]> {
    const keys = await promisify(this.tx("readonly").getAllKeys());
    return keys.map(String);
  }

  async clear(): Promise<void> {
    await promisify(this.tx("readwrite").clear());
  }
}

/**
 * The fallback when IndexedDB is unavailable — older browsers, some private
 * modes, and embedded webviews. Deliberately kept, because a journal that
 * refuses to open is worse than one with a smaller ceiling.
 */
class LocalStorageStore implements JournalStore {
  readonly kind: StorageKind = "localstorage";

  constructor(private readonly prefix = "glory-personal-tracker:") {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = window.localStorage.getItem(this.prefix + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    window.localStorage.removeItem(this.prefix + key);
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(this.prefix))
        keys.push(key.slice(this.prefix.length));
    }
    return keys;
  }

  async clear(): Promise<void> {
    for (const key of await this.keys()) await this.delete(key);
  }
}

/** Last resort, so the app still runs where all storage is blocked. */
class MemoryStore implements JournalStore {
  readonly kind: StorageKind = "memory";
  private readonly map = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
  async keys(): Promise<string[]> {
    return Array.from(this.map.keys());
  }
  async clear(): Promise<void> {
    this.map.clear();
  }
}

/**
 * Opens the best store the browser will give us, degrading rather than failing.
 * Callers get a working store in every case and read `kind` to decide what to
 * tell the user about how safe their data is.
 */
export async function openStore(): Promise<JournalStore> {
  if (typeof indexedDB !== "undefined") {
    try {
      return new IndexedDbStore(await openDatabase());
    } catch {
      // Blocked or unavailable; fall through.
    }
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = new LocalStorageStore();
      await probe.set("__probe__", 1);
      await probe.delete("__probe__");
      return probe;
    }
  } catch {
    // Storage disabled entirely.
  }

  return new MemoryStore();
}

/**
 * Asks the browser not to evict this origin's data.
 *
 * Without this, IndexedDB is "best effort" and may be cleared under storage
 * pressure. The prompt is granted silently in some browsers and only after
 * engagement in others, so the answer is reported rather than assumed.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageStatus(
  store: JournalStore
): Promise<StorageStatus> {
  let persistent = false;
  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;

  try {
    persistent = (await navigator.storage?.persisted?.()) ?? false;
    const estimate = await navigator.storage?.estimate?.();
    usageBytes = estimate?.usage;
    quotaBytes = estimate?.quota;
  } catch {
    // Estimates are a nicety, not a requirement.
  }

  return { kind: store.kind, persistent, usageBytes, quotaBytes };
}

/**
 * What to tell the user about how safe their journal is.
 *
 * Deliberately blunt about the ceiling: local storage of any kind dies with the
 * device. Someone who believes their five years of entries are safe because the
 * app said "saved" has been misled by the interface, not by their own optimism.
 */
export function describeDurability(
  status: StorageStatus,
  syncedToServer: boolean
): { level: "at-risk" | "device-only" | "backed-up"; message: string } {
  if (syncedToServer) {
    return {
      level: "backed-up",
      message:
        "Your journal is saved on this device and to your account, so it survives losing this device.",
    };
  }

  if (status.kind === "memory") {
    return {
      level: "at-risk",
      message:
        "Storage is blocked in this browser, so nothing will be kept once you close the app. Export a backup before you leave.",
    };
  }

  if (status.kind === "localstorage") {
    return {
      level: "at-risk",
      message:
        "This browser is using limited storage that it may clear on its own. Export a backup regularly, or sign in to keep a copy to your account.",
    };
  }

  return {
    level: "device-only",
    message: status.persistent
      ? "Your journal is stored on this device and the browser has agreed to keep it. It will still be lost if you lose the device — sign in or export a backup for a second copy."
      : "Your journal is stored on this device, but the browser may clear it to free space. Sign in or export a backup to keep a second copy.",
  };
}

/** Percentage of the quota used, when the browser reports both figures. */
export function usageShare(status: StorageStatus): number | null {
  if (!status.usageBytes || !status.quotaBytes) return null;
  return Math.round((status.usageBytes / status.quotaBytes) * 100);
}

/**
 * Moves anything found in the old localStorage keys into the new store.
 *
 * Run once on upgrade. The old copy is left in place until the new one has been
 * written and read back, so a failure halfway cannot lose the journal.
 */
export async function migrateFromLocalStorage(
  store: JournalStore,
  prefix = "glory-personal-tracker:"
): Promise<{ moved: number; failed: number }> {
  let moved = 0;
  let failed = 0;

  if (typeof window === "undefined" || !window.localStorage) {
    return { moved, failed };
  }

  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }

  for (const fullKey of keys) {
    const key = fullKey.slice(prefix.length);
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) continue;

      const value = JSON.parse(raw) as unknown;
      await store.set(key, value);

      // Only drop the original once the new copy reads back.
      const check = await store.get(key);
      if (check !== undefined) {
        window.localStorage.removeItem(fullKey);
        moved += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { moved, failed };
}
