/**
 * Where attached files and photos actually live: IndexedDB on this device.
 *
 * The bytes never go into a journal record. A record holds a small FileRef and
 * this store holds the Blob, so the file is there offline, instantly, and
 * whether or not anyone is signed in. Backing it up to the account is a
 * separate, later step (fileSync.ts) that only ever reads from here.
 *
 * A removed file that had already been backed up leaves a tombstone instead of
 * vanishing, so the deletion still reaches the server once there is a
 * connection.
 */

export const FILE_DB_NAME = "glory-personal-tracker-files";
const STORE = "files";

export type LocalFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  addedAt: string;
  /** Absent on a tombstone. */
  blob?: Blob;
  /** True once the account holds a copy. */
  synced: boolean;
  /** Why the last backup attempt failed, for the person to read. */
  syncError?: string;
  /** Removed locally; waiting to be removed from the account too. */
  deleted?: boolean;
};

/** Fired after any change, so open screens can refresh without polling. */
export const FILES_CHANGED_EVENT = "tracker-files-changed";

function announce() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FILES_CHANGED_EVENT));
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser cannot store files here."));
  }
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Could not open file storage."));
    };
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = work(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function putLocalFile(file: LocalFile): Promise<void> {
  await run("readwrite", store => store.put(file));
  announce();
}

export async function getLocalFile(id: string): Promise<LocalFile | undefined> {
  const found = await run<LocalFile | undefined>("readonly", store =>
    store.get(id)
  );
  // A tombstone is not a file anyone can open.
  return found && !found.deleted ? found : undefined;
}

export async function listLocalFiles(): Promise<LocalFile[]> {
  const all = await run<LocalFile[]>("readonly", store => store.getAll());
  return all.filter(file => !file.deleted);
}

/** Everything the sync step has work for: not backed up yet, or to delete. */
export async function listFilesToSync(): Promise<LocalFile[]> {
  const all = await run<LocalFile[]>("readonly", store => store.getAll());
  return all.filter(file => file.deleted || !file.synced);
}

export async function markSynced(id: string): Promise<void> {
  const file = await run<LocalFile | undefined>("readonly", store => store.get(id));
  if (!file || file.deleted) return;
  await putLocalFile({ ...file, synced: true, syncError: undefined });
}

export async function markSyncFailed(id: string, reason: string): Promise<void> {
  const file = await run<LocalFile | undefined>("readonly", store => store.get(id));
  if (!file || file.deleted) return;
  await putLocalFile({ ...file, syncError: reason });
}

/**
 * Removes a file from this device. If the account already has a copy, a
 * tombstone stays so the server copy is deleted as well; if it never left the
 * device there is nothing to tell the server and the entry just goes.
 */
export async function removeLocalFile(id: string): Promise<void> {
  const file = await run<LocalFile | undefined>("readonly", store => store.get(id));
  if (!file) return;
  if (file.synced) {
    await putLocalFile({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: 0,
      addedAt: file.addedAt,
      synced: true,
      deleted: true,
    });
  } else {
    await run("readwrite", store => store.delete(id));
    announce();
  }
}

/** Called once the server has confirmed a deletion. */
export async function forgetTombstone(id: string): Promise<void> {
  await run("readwrite", store => store.delete(id));
  announce();
}

export async function clearFileStore(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    (await dbPromise)?.close();
  } catch {
    // Nothing was open.
  }
  dbPromise = null;
  await new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase(FILE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  announce();
}
