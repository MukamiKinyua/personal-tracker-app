/**
 * One store for every page's records.
 *
 * The trackers under `client/src/lib` each hold their own shape of state. This
 * store sits underneath them and owns what section 2 requires to be identical
 * everywhere: identity, correction, soft deletion and restore, undo, the
 * offline queue, and day grouping in the user's timezone.
 *
 * Every mutation returns a new store plus the undo entry for the action, so a
 * page never has to reconstruct how to reverse what it just did.
 */

import { dayKeyOf, type DayKey } from "./datetime";
import { pruneLinks, type EntityKind, type RecordLink } from "./links";
import {
  createRecord,
  deleteRecord,
  restoreRecord,
  setRecordBody,
  updateRecord,
  type CreateRecordInput,
  type RecordId,
  type RecordPeriod,
  type TrackerRecord,
} from "./record";
import {
  createSyncQueue,
  enqueueWrite,
  pendingCount,
  type QueuedWrite,
  type SyncQueue,
} from "./syncQueue";
import {
  createUndoStack,
  pushUndo,
  takeUndo,
  type RecordUndoPayload,
  type UndoStack,
} from "./undo";

export type AnyRecord = TrackerRecord<Record<string, unknown>>;

export type RecordStore = {
  records: Record<RecordId, AnyRecord>;
  links: RecordLink[];
  queue: SyncQueue;
  undo: UndoStack;
  /** False while the browser is offline; writes are queued rather than sent. */
  online: boolean;
  timezone: string;
};

export function createRecordStore(timezone: string): RecordStore {
  return {
    records: {},
    links: [],
    queue: createSyncQueue(),
    undo: createUndoStack(),
    online: true,
    timezone,
  };
}

let writeCounter = 0;

function nextWriteId(): string {
  writeCounter += 1;
  return `w${Date.now().toString(36)}${writeCounter.toString(36)}`;
}

function queueWrite(
  store: RecordStore,
  record: AnyRecord,
  op: QueuedWrite["op"]
): SyncQueue {
  return enqueueWrite(store.queue, {
    id: nextWriteId(),
    scope: record.scope,
    recordId: record.id,
    op,
    body: op === "delete" ? undefined : record.body,
    baseRevision: record.revision,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });
}

export type MutationResult = {
  store: RecordStore;
  record: AnyRecord;
  /** Id of the undo entry created, for the toast's Undo button. */
  undoId: string;
};

export function addRecord(
  store: RecordStore,
  input: Omit<CreateRecordInput<Record<string, unknown>>, "now"> & {
    now?: Date;
    undoLabel: string;
  }
): MutationResult {
  const { undoLabel, ...createInput } = input;
  const record = createRecord(createInput);
  const undoId = `undo_${record.id}_create`;

  return {
    store: {
      ...store,
      records: { ...store.records, [record.id]: record },
      queue: queueWrite(store, record, "create"),
      undo: pushUndo<RecordUndoPayload>(store.undo, {
        id: undoId,
        label: undoLabel,
        scope: record.scope,
        payload: { kind: "delete", recordId: record.id },
      }),
    },
    record,
    undoId,
  };
}

export function editRecord(
  store: RecordStore,
  id: RecordId,
  changes: Record<string, unknown>,
  options: { undoLabel: string; now?: Date; period?: RecordPeriod } = {
    undoLabel: "Edited",
  }
): MutationResult {
  const existing = store.records[id];
  if (!existing) throw new Error(`No record ${id} to edit.`);

  const record = updateRecord(existing, changes, {
    now: options.now,
    period: options.period,
  });
  const undoId = `undo_${id}_${record.revision}`;

  return {
    store: {
      ...store,
      records: { ...store.records, [id]: record },
      queue: queueWrite(store, record, "update"),
      undo: pushUndo<RecordUndoPayload>(store.undo, {
        id: undoId,
        label: options.undoLabel,
        scope: record.scope,
        // The previous body (and period, if the edit moved the record in
        // time), so undo restores the values rather than guessing.
        payload: {
          kind: "revert",
          recordId: id,
          body: existing.body,
          ...(options.period ? { period: existing.period } : {}),
          revision: existing.revision,
        },
      }),
    },
    record,
    undoId,
  };
}

/**
 * Soft deletion. The record stays in the store so undo, restore, and the
 * export can all still reach it (2.3, 2.6, 2.8).
 */
export function removeRecord(
  store: RecordStore,
  id: RecordId,
  options: { undoLabel?: string; now?: Date } = {}
): MutationResult {
  const existing = store.records[id];
  if (!existing) throw new Error(`No record ${id} to delete.`);

  const record = deleteRecord(existing, options.now);
  const undoId = `undo_${id}_delete`;

  return {
    store: {
      ...store,
      records: { ...store.records, [id]: record },
      queue: queueWrite(store, record, "delete"),
      undo: pushUndo<RecordUndoPayload>(store.undo, {
        id: undoId,
        label: options.undoLabel ?? "Deleted",
        scope: record.scope,
        payload: { kind: "restore", recordId: id },
      }),
    },
    record,
    undoId,
  };
}

export function bringBackRecord(
  store: RecordStore,
  id: RecordId,
  now?: Date
): RecordStore {
  const existing = store.records[id];
  if (!existing) return store;
  const record = restoreRecord(existing, now);
  return {
    ...store,
    records: { ...store.records, [id]: record },
    queue: queueWrite(store, record, "update"),
  };
}

/**
 * Applies an undo entry. Reversal runs through the same mutation paths as the
 * original action, so an undone change is itself a recorded, syncable change
 * rather than a hidden rewrite of history.
 */
export function applyUndo(
  store: RecordStore,
  undoId: string,
  now: number = Date.now()
): { store: RecordStore; applied: boolean } {
  const { action, stack } = takeUndo(store.undo, undoId, now);
  if (!action) return { store: { ...store, undo: stack }, applied: false };

  const withStack: RecordStore = { ...store, undo: stack };
  const payload = action.payload as RecordUndoPayload;

  switch (payload.kind) {
    case "restore":
      return {
        store: bringBackRecord(withStack, payload.recordId),
        applied: true,
      };

    case "delete": {
      const target = withStack.records[payload.recordId];
      if (!target) return { store: withStack, applied: false };
      const record = deleteRecord(target);
      return {
        store: {
          ...withStack,
          records: { ...withStack.records, [payload.recordId]: record },
          queue: queueWrite(withStack, record, "delete"),
        },
        applied: true,
      };
    }

    case "revert": {
      const target = withStack.records[payload.recordId];
      if (!target) return { store: withStack, applied: false };
      // Replaced, not merged: fields the edit introduced have to go away again.
      const reverted = setRecordBody(target, payload.body);
      const record = payload.period
        ? { ...reverted, period: payload.period }
        : reverted;
      return {
        store: {
          ...withStack,
          records: { ...withStack.records, [payload.recordId]: record },
          queue: queueWrite(withStack, record, "update"),
        },
        applied: true,
      };
    }

    default:
      return { store: withStack, applied: false };
  }
}

/** Permanent removal, for a privacy-centre deletion rather than a mistake. */
export function purgeRecord(
  store: RecordStore,
  id: RecordId,
  kind: EntityKind
): RecordStore {
  const { [id]: _removed, ...records } = store.records;
  return { ...store, records, links: pruneLinks(store.links, kind, id) };
}

export function getRecord(
  store: RecordStore,
  id: RecordId
): AnyRecord | undefined {
  return store.records[id];
}

/** Live records for a scope, newest first. */
export function recordsInScope(store: RecordStore, scope: string): AnyRecord[] {
  return Object.values(store.records)
    .filter(record => record.scope === scope && !record.deletedAt)
    .sort((a, b) => b.period.start.localeCompare(a.period.start));
}

/**
 * Records filed under one local calendar day. Grouping happens here, in the
 * user's timezone, rather than on an ISO string prefix — that is what keeps a
 * late-evening entry on the right day (2.5, 3.6).
 */
export function recordsOnDay(
  store: RecordStore,
  scope: string,
  day: DayKey
): AnyRecord[] {
  return recordsInScope(store, scope).filter(
    record => dayKeyOf(record.period.start, store.timezone) === day
  );
}

export function recordsBetween(
  store: RecordStore,
  scope: string,
  fromDay: DayKey,
  toDay: DayKey
): AnyRecord[] {
  return recordsInScope(store, scope).filter(record => {
    const day = dayKeyOf(record.period.start, store.timezone);
    return day >= fromDay && day <= toDay;
  });
}

/** Groups a scope's records by day — the shape the pixel grids consume. */
export function groupByDay(
  store: RecordStore,
  scope: string
): Map<DayKey, AnyRecord[]> {
  const grouped = new Map<DayKey, AnyRecord[]>();
  for (const record of recordsInScope(store, scope)) {
    const day = dayKeyOf(record.period.start, store.timezone);
    const bucket = grouped.get(day);
    if (bucket) bucket.push(record);
    else grouped.set(day, [record]);
  }
  return grouped;
}

export function deletedRecords(store: RecordStore): AnyRecord[] {
  return Object.values(store.records).filter(record => record.deletedAt);
}

export function outstandingWrites(store: RecordStore): number {
  return pendingCount(store.queue);
}

/** Everything, deletions included, for the export bundle (2.8). */
export function allRecordsForExport(store: RecordStore): AnyRecord[] {
  return Object.values(store.records).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}
