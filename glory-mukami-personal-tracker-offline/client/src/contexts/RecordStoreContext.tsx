/**
 * The record store, wired into React.
 *
 * The bridge between the pure core in `@/lib/core` and the pages. It owns the
 * one copy of the store and is responsible for four promises the interface
 * makes: an edit is never lost, a change is never silently discarded, the
 * journal is here whether or not the network is, and what is on this device
 * eventually reaches the others.
 *
 * Records live in IndexedDB rather than `localStorage` — bigger, asynchronous,
 * and eligible for persistent storage — and are pushed to the account as soon
 * as there is a connection, because a copy on one device is not a backup.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  addConflict,
  clearConflict,
  resolve as resolveConflictChoice,
  triage,
  type Conflict,
  type Resolution,
} from "@/lib/core/conflicts";
import { dayKeyOf, todayKey, type DayKey } from "@/lib/core/datetime";
import {
  createIdentity,
  shouldSync,
  SYNC_DELAYS,
  type DeviceIdentity,
  type SyncTrigger,
} from "@/lib/core/devices";
import { buildExport, type ExportBundle } from "@/lib/core/exportData";
import { addLink, createLink, type EntityKind } from "@/lib/core/links";
import {
  resolvePreferences,
  type PreferenceInput,
  type Preferences,
} from "@/lib/core/preferences";
import type { RecordPeriod, RecordSource } from "@/lib/core/record";
import {
  addRecord as addToStore,
  allRecordsForExport,
  applyUndo,
  createRecordStore,
  editRecord as editInStore,
  groupByDay,
  outstandingWrites,
  recordsBetween,
  recordsInScope,
  recordsOnDay,
  removeRecord as removeFromStore,
  type AnyRecord,
  type RecordStore,
} from "@/lib/core/recordStore";
import {
  initialSaveState,
  saveStateReducer,
  type SaveState,
} from "@/lib/core/saveState";
import {
  migrateFromLocalStorage,
  openStore,
  requestPersistence,
  storageStatus,
  type JournalStore,
  type StorageStatus,
} from "@/lib/core/storage";
import { dequeueWrite } from "@/lib/core/syncQueue";
import {
  createSyncState,
  syncMessage,
  syncOnce,
  type SyncRecordPayload,
  type SyncState,
  type SyncTransport,
} from "@/lib/core/syncEngine";
import { trpc } from "@/lib/trpc";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const RECORDS_KEY = "records";
const PREFS_KEY = "preferences";
const DEVICE_KEY = "device";
const SYNC_KEY = "sync";

type AddInput = {
  scope: string;
  body: Record<string, unknown>;
  period?: RecordPeriod;
  source?: RecordSource;
  /** Shown in the Undo toast, e.g. "Added 250 ml". */
  undoLabel: string;
  /** Optional connection to make at the same time (section 6). */
  linkTo?: { kind: EntityKind; id: string; fromKind: EntityKind };
};

type Persisted = {
  records: RecordStore["records"];
  links: RecordStore["links"];
  queue: RecordStore["queue"];
};

type RecordStoreValue = {
  store: RecordStore;
  preferences: Preferences;
  /** Today in the user's own timezone, not the machine's. */
  today: DayKey;
  saveState: SaveState;
  online: boolean;
  pendingWrites: number;
  ready: boolean;

  device?: DeviceIdentity;
  storage?: StorageStatus;
  sync: SyncState;
  /** Disagreements between devices that still need a decision. */
  conflicts: Conflict[];
  syncNow: () => void;
  resolveConflict: (recordId: string, resolution: Resolution) => void;
  /** One line describing where the journal is saved and how safely. */
  syncStatusMessage: string;

  add: (input: AddInput) => AnyRecord;
  edit: (
    id: string,
    changes: Record<string, unknown>,
    undoLabel?: string
  ) => AnyRecord | null;
  remove: (id: string, undoLabel?: string) => void;

  inScope: (scope: string) => AnyRecord[];
  onDay: (scope: string, day: DayKey) => AnyRecord[];
  between: (scope: string, from: DayKey, to: DayKey) => AnyRecord[];
  byDay: (scope: string) => Map<DayKey, AnyRecord[]>;
  dayOf: (record: AnyRecord) => DayKey;

  updatePreferences: (patch: PreferenceInput) => void;
  exportAll: () => ExportBundle;
};

const RecordStoreContext = createContext<RecordStoreValue | null>(null);

/** Turns a record pulled from the server back into a local record. */
function fromPayload(payload: SyncRecordPayload, ownerId: string): AnyRecord {
  return {
    id: payload.recordId,
    ownerId,
    scope: payload.scope,
    period: payload.period,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    source: payload.source as RecordSource,
    revision: payload.revision,
    deletedAt: payload.deletedAt,
    body: payload.body,
  };
}

export function RecordStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const ownerId = auth.user ? String(auth.user.id) : "guest";
  const signedIn = Boolean(auth.user);

  const [preferences, setPreferences] = useState<Preferences>(() =>
    resolvePreferences()
  );
  const [store, setStore] = useState<RecordStore>(() =>
    createRecordStore(resolvePreferences().timezone)
  );
  const [saveState, dispatchSave] = useReducer(
    saveStateReducer,
    initialSaveState
  );
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<DeviceIdentity>();
  const [storage, setStorage] = useState<StorageStatus>();
  const [sync, setSync] = useState<SyncState>(() => createSyncState());
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  /**
   * The newest store, updated synchronously by every write.
   *
   * Reading `store` from a callback's closure is not safe: two quick-adds in
   * the same tick would both start from the same snapshot and the second would
   * overwrite the first, silently dropping an entry. Tapping twice in quick
   * succession is the normal way this app is used, so every write goes through
   * `commit`, which advances the ref before queueing the re-render.
   */
  const storeRef = useRef(store);
  const journalRef = useRef<JournalStore | null>(null);
  const syncRef = useRef(sync);
  const hydratedFor = useRef("");
  const syncing = useRef(false);

  const commit = useCallback((next: RecordStore) => {
    storeRef.current = next;
    setStore(next);
  }, []);

  const pullQuery = trpc.useUtils();
  const pushMutation = trpc.records.push.useMutation();
  const registerDevice = trpc.devices.register.useMutation();

  // Load everything this owner already has before anything is written back, so
  // a fresh mount cannot overwrite a populated journal with an empty one.
  useEffect(() => {
    if (hydratedFor.current === ownerId) return;
    hydratedFor.current = ownerId;
    let cancelled = false;

    (async () => {
      setReady(false);
      const journal = await openStore();
      if (cancelled) return;
      journalRef.current = journal;

      // Anything left in the old localStorage keys is moved across once, and
      // the original is only dropped after the new copy reads back.
      await migrateFromLocalStorage(journal);

      const [savedPrefs, saved, savedDevice, savedSync] = await Promise.all([
        journal.get<PreferenceInput>(`${PREFS_KEY}:${ownerId}`),
        journal.get<Persisted>(`${RECORDS_KEY}:${ownerId}`),
        journal.get<DeviceIdentity>(DEVICE_KEY),
        journal.get<SyncState>(`${SYNC_KEY}:${ownerId}`),
      ]);
      if (cancelled) return;

      const loadedPrefs = resolvePreferences(savedPrefs ?? {});
      setPreferences(loadedPrefs);

      const base = createRecordStore(loadedPrefs.timezone);
      commit(
        saved
          ? {
              ...base,
              records: saved.records ?? {},
              links: saved.links ?? [],
              queue: saved.queue ?? base.queue,
            }
          : base
      );

      // The device id is deliberately not per-owner: it identifies the
      // install, so signing in as someone else on the same phone is still the
      // same device in the list.
      const identity =
        savedDevice ??
        createIdentity({
          userAgent:
            typeof navigator === "undefined" ? "" : navigator.userAgent,
        });
      if (!savedDevice) await journal.set(DEVICE_KEY, identity);
      setDevice(identity);

      if (savedSync) {
        syncRef.current = savedSync;
        setSync(savedSync);
      }

      // Asking to keep the data is pointless until there is data worth
      // keeping, so it is requested here rather than on first paint.
      await requestPersistence();
      setStorage(await storageStatus(journal));

      setReady(true);
    })().catch(() => {
      // A storage failure must not stop the journal opening; the store falls
      // back to memory and `storage.kind` tells the user what that means.
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [commit, ownerId]);

  // Persist records. Durable locally even with no server reachable, which is
  // what lets an offline save be reported as saved rather than as failed.
  useEffect(() => {
    if (!ready || !journalRef.current) return;
    const payload: Persisted = {
      records: store.records,
      links: store.links,
      queue: store.queue,
    };
    void journalRef.current
      .set(`${RECORDS_KEY}:${ownerId}`, payload)
      .catch(() => dispatchSave({ type: "saveFailed", error: "storage is full" }));
  }, [ownerId, ready, store.links, store.queue, store.records]);

  useEffect(() => {
    if (!ready || !journalRef.current) return;
    void journalRef.current.set(`${PREFS_KEY}:${ownerId}`, preferences);
  }, [ownerId, preferences, ready]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const pendingWrites = outstandingWrites(store);

  // Keep the reported save state honest about which guarantee the user has:
  // durable on the server, or durable on this device only.
  useEffect(() => {
    if (!ready) return;
    if (!online && pendingWrites > 0) {
      dispatchSave({ type: "queuedOffline", pending: pendingWrites });
    } else if (online && pendingWrites === 0) {
      dispatchSave({ type: "queueDrained", at: new Date().toISOString() });
    }
  }, [online, pendingWrites, ready]);

  const transport = useMemo<SyncTransport>(
    () => ({
      pull: (since, limit) =>
        pullQuery.records.pull.fetch({ since, limit: limit ?? 500 }),
      push: writes => pushMutation.mutateAsync({ writes }),
    }),
    [pullQuery, pushMutation]
  );

  /**
   * One sync pass.
   *
   * Guarded by a ref rather than state so two triggers landing in the same
   * tick cannot start two passes — which would push the same batch twice and
   * race each other's cursor.
   */
  const runSync = useCallback(
    async (trigger: SyncTrigger) => {
      if (!signedIn || !device || syncing.current) return;

      const decision = shouldSync({
        trigger,
        online,
        lastSyncedAt: syncRef.current.lastSyncedAt,
        pendingWrites: outstandingWrites(storeRef.current),
      });
      if (!decision.sync) return;

      syncing.current = true;
      try {
        const result = await syncOnce({
          transport,
          queue: storeRef.current.queue,
          records: storeRef.current.records,
          state: syncRef.current,
        });

        let next = storeRef.current;

        // Writes that reached the server leave the queue.
        for (const id of result.settledWriteIds) {
          next = { ...next, queue: dequeueWrite(next.queue, id) };
        }

        // Records from other devices land locally.
        for (const payload of result.accepted) {
          next = {
            ...next,
            records: {
              ...next.records,
              [payload.recordId]: fromPayload(payload, ownerId),
            },
          };
        }

        commit(next);

        // Settle what can be settled, and only surface what genuinely needs a
        // person to choose.
        const detectedAt = new Date().toISOString();
        const incoming = result.state.conflicts.map(entry => ({
          ...entry,
          detectedAt,
        }));
        const { resolved, remaining } = triage(incoming);

        if (resolved.length > 0) {
          let settled = storeRef.current;
          for (const item of resolved) {
            settled = {
              ...settled,
              records: {
                ...settled.records,
                [item.result.record.id]: item.result.record,
              },
            };
          }
          commit(settled);
        }

        setConflicts(current =>
          remaining.reduce((list, entry) => addConflict(list, entry), current)
        );

        syncRef.current = { ...result.state, conflicts: [] };
        setSync(syncRef.current);
        void journalRef.current?.set(`${SYNC_KEY}:${ownerId}`, syncRef.current);

        void registerDevice.mutateAsync({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind,
          cursor: result.state.cursor,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not reach the server";
        syncRef.current = { ...syncRef.current, lastError: message };
        setSync(syncRef.current);
      } finally {
        syncing.current = false;
      }
    },
    [commit, device, online, ownerId, registerDevice, signedIn, transport]
  );

  // Opening the app and coming back online are when a device is most likely to
  // be behind, so both sync immediately.
  useEffect(() => {
    if (!ready) return;
    void runSync(online ? "opened" : "manual");
  }, [ready, runSync]);

  useEffect(() => {
    if (!ready || !online) return;
    void runSync("reconnected");
  }, [online, ready, runSync]);

  useEffect(() => {
    if (!ready || !signedIn) return;
    const timer = window.setInterval(
      () => void runSync("interval"),
      SYNC_DELAYS.interval
    );
    const onFocus = () => void runSync("focused");
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, runSync, signedIn]);

  /** Debounced so five quick taps are one sync, not five. */
  const scheduleSync = useRef<number | undefined>(undefined);
  const syncAfterWrite = useCallback(() => {
    window.clearTimeout(scheduleSync.current);
    scheduleSync.current = window.setTimeout(
      () => void runSync("after-write"),
      SYNC_DELAYS["after-write"]
    );
  }, [runSync]);

  const runUndo = useCallback(
    (undoId: string) => {
      commit(applyUndo(storeRef.current, undoId).store);
      syncAfterWrite();
    },
    [commit, syncAfterWrite]
  );

  const offerUndo = useCallback(
    (label: string, undoId: string) => {
      toast(label, {
        action: { label: "Undo", onClick: () => runUndo(undoId) },
      });
    },
    [runUndo]
  );

  const add = useCallback(
    (input: AddInput): AnyRecord => {
      const result = addToStore(storeRef.current, {
        scope: input.scope,
        ownerId,
        body: input.body,
        period: input.period,
        source: input.source,
        undoLabel: input.undoLabel,
      });

      let next = result.store;
      if (input.linkTo) {
        next = {
          ...next,
          links: addLink(
            next.links,
            createLink(
              input.linkTo.fromKind,
              result.record.id,
              input.linkTo.kind,
              input.linkTo.id
            )
          ),
        };
      }

      commit(next);
      dispatchSave({ type: "edited" });
      offerUndo(input.undoLabel, result.undoId);
      syncAfterWrite();
      return result.record;
    },
    [commit, offerUndo, ownerId, syncAfterWrite]
  );

  const edit = useCallback(
    (id: string, changes: Record<string, unknown>, undoLabel = "Edited") => {
      if (!storeRef.current.records[id]) return null;
      const result = editInStore(storeRef.current, id, changes, { undoLabel });
      commit(result.store);
      dispatchSave({ type: "edited" });
      offerUndo(undoLabel, result.undoId);
      syncAfterWrite();
      return result.record;
    },
    [commit, offerUndo, syncAfterWrite]
  );

  const remove = useCallback(
    (id: string, undoLabel = "Deleted") => {
      if (!storeRef.current.records[id]) return;
      const result = removeFromStore(storeRef.current, id, { undoLabel });
      commit(result.store);
      dispatchSave({ type: "edited" });
      offerUndo(undoLabel, result.undoId);
      syncAfterWrite();
    },
    [commit, offerUndo, syncAfterWrite]
  );

  const resolveConflict = useCallback(
    (recordId: string, resolution: Resolution) => {
      const conflict = conflicts.find(entry => entry.local.id === recordId);
      if (!conflict) return;

      const result = resolveConflictChoice(conflict, resolution);
      let next: RecordStore = {
        ...storeRef.current,
        records: { ...storeRef.current.records, [recordId]: result.record },
      };

      if (result.needsPush) {
        // Queued like any other edit, so it goes out through the same path.
        next = {
          ...next,
          queue: {
            writes: [
              ...next.queue.writes,
              {
                id: `resolve_${recordId}_${result.record.revision}`,
                scope: result.record.scope,
                recordId,
                op: "update",
                body: result.record.body,
                baseRevision: result.record.revision,
                queuedAt: new Date().toISOString(),
                attempts: 0,
              },
            ],
          },
        };
      }

      commit(next);
      setConflicts(current => clearConflict(current, recordId));
      syncAfterWrite();
    },
    [commit, conflicts, syncAfterWrite]
  );

  const updatePreferences = useCallback(
    (patch: PreferenceInput) => {
      setPreferences(current => {
        const next = resolvePreferences({ ...current, ...patch });
        // A timezone change re-files every day-grouped record, so the store has
        // to learn about it rather than keeping the zone it was built with.
        commit({ ...storeRef.current, timezone: next.timezone });
        return next;
      });
    },
    [commit]
  );

  const value = useMemo<RecordStoreValue>(() => {
    const today = todayKey(preferences.timezone);
    return {
      store,
      preferences,
      today,
      saveState,
      online,
      pendingWrites,
      ready,
      device,
      storage,
      sync,
      conflicts,
      syncNow: () => void runSync("manual"),
      resolveConflict,
      syncStatusMessage: signedIn
        ? syncMessage(sync, online, pendingWrites)
        : "Sign in to keep a copy of your journal to your account",
      add,
      edit,
      remove,
      inScope: scope => recordsInScope(store, scope),
      onDay: (scope, day) => recordsOnDay(store, scope, day),
      between: (scope, from, to) => recordsBetween(store, scope, from, to),
      byDay: scope => groupByDay(store, scope),
      dayOf: record => dayKeyOf(record.period.start, store.timezone),
      updatePreferences,
      exportAll: () =>
        buildExport(allRecordsForExport(store), store.links, {
          id: ownerId,
          timezone: preferences.timezone,
          locale: preferences.locale,
        }),
    };
  }, [
    add,
    conflicts,
    device,
    edit,
    online,
    ownerId,
    pendingWrites,
    preferences,
    ready,
    remove,
    resolveConflict,
    runSync,
    saveState,
    signedIn,
    storage,
    store,
    sync,
    updatePreferences,
  ]);

  return (
    <RecordStoreContext.Provider value={value}>
      {children}
    </RecordStoreContext.Provider>
  );
}

export function useRecordStore(): RecordStoreValue {
  const value = useContext(RecordStoreContext);
  if (!value) {
    throw new Error("useRecordStore must be used inside a RecordStoreProvider.");
  }
  return value;
}

/**
 * A single page's slice. Pages take this rather than the whole store so they
 * cannot accidentally read another page's records.
 */
export function useScopeRecords(scope: string) {
  const { inScope, onDay, byDay, today, add, edit, remove, saveState } =
    useRecordStore();

  return useMemo(
    () => ({
      records: inScope(scope),
      todayRecords: onDay(scope, today),
      byDay: () => byDay(scope),
      saveState,
      add: (input: Omit<AddInput, "scope">) => add({ ...input, scope }),
      edit,
      remove,
    }),
    [add, byDay, edit, inScope, onDay, remove, saveState, scope, today]
  );
}
