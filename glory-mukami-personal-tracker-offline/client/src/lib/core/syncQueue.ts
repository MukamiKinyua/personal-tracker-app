/**
 * The offline write queue and conflict rules.
 *
 * Requirement 2.4 asks that offline records be queued locally and synchronised
 * on reconnect, that conflicts be resolved rather than silently overwritten,
 * and that the source of imported records stay identifiable. Acceptance
 * scenario 12 requires an offline save to reach the server exactly once.
 */

import type { RecordSource, TrackerRecord } from "./record";

export type WriteOp = "create" | "update" | "delete";

export type QueuedWrite = {
  id: string;
  scope: string;
  recordId: string;
  op: WriteOp;
  /** Fields to write. Absent for a delete. */
  body?: Record<string, unknown>;
  /**
   * The revision the edit was made against. The server compares it to what it
   * holds to spot a competing edit instead of clobbering it.
   */
  baseRevision: number;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

export type SyncQueue = {
  writes: QueuedWrite[];
};

export function createSyncQueue(): SyncQueue {
  return { writes: [] };
}

/**
 * Adds a write, collapsing it into an earlier pending write for the same
 * record where that is safe.
 *
 * Without this, twenty offline water taps replay as twenty requests and the
 * user watches their own history rebuild itself. Collapsing keeps the queue
 * proportional to the records touched rather than the taps made.
 */
export function enqueueWrite(queue: SyncQueue, write: QueuedWrite): SyncQueue {
  const index = queue.writes.findIndex(
    pending =>
      pending.recordId === write.recordId && pending.scope === write.scope
  );

  if (index === -1) {
    return { writes: [...queue.writes, write] };
  }

  const existing = queue.writes[index];
  const collapsed = collapse(existing, write);
  const writes = [...queue.writes];

  if (!collapsed) {
    // A create cancelled by a delete never reached the server; drop both.
    writes.splice(index, 1);
    return { writes };
  }

  writes[index] = collapsed;
  return { writes };
}

function collapse(
  existing: QueuedWrite,
  incoming: QueuedWrite
): QueuedWrite | null {
  // Created then deleted while still offline: the record has no remote life.
  if (existing.op === "create" && incoming.op === "delete") return null;

  // A create absorbs later edits and stays a create.
  if (existing.op === "create" && incoming.op === "update") {
    return {
      ...existing,
      body: { ...existing.body, ...incoming.body },
      queuedAt: incoming.queuedAt,
    };
  }

  // Consecutive edits merge; the base revision stays the earliest one, because
  // that is the version the whole merged edit was reasoned from.
  if (existing.op === "update" && incoming.op === "update") {
    return {
      ...existing,
      body: { ...existing.body, ...incoming.body },
      queuedAt: incoming.queuedAt,
    };
  }

  // A delete supersedes any pending edit.
  if (incoming.op === "delete") {
    return { ...incoming, baseRevision: existing.baseRevision };
  }

  // Re-creating after a queued delete is a genuinely new state, not a merge.
  return incoming;
}

export function dequeueWrite(queue: SyncQueue, id: string): SyncQueue {
  return { writes: queue.writes.filter(write => write.id !== id) };
}

/** Records a failed attempt so the interface can show why sync is stalled. */
export function markAttemptFailed(
  queue: SyncQueue,
  id: string,
  error: string
): SyncQueue {
  return {
    writes: queue.writes.map(write =>
      write.id === id
        ? { ...write, attempts: write.attempts + 1, lastError: error }
        : write
    ),
  };
}

/** Exponential backoff, capped, so a persistent outage stops hammering. */
export function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts));
}

export function pendingCount(queue: SyncQueue): number {
  return queue.writes.length;
}

export type ConflictResolution<TBody> =
  | { outcome: "no-conflict"; record: TrackerRecord<TBody> }
  | {
      outcome: "resolved";
      record: TrackerRecord<TBody>;
      strategy: "local" | "remote" | "merged";
    }
  | {
      outcome: "needs-review";
      local: TrackerRecord<TBody>;
      remote: TrackerRecord<TBody>;
      conflictingFields: string[];
    };

/**
 * Decides what happens when the local and remote copies of a record disagree.
 *
 * Where the two sides changed different fields the merge is unambiguous. Where
 * they changed the same field there is no correct automatic answer, so this
 * hands the decision back rather than picking a winner — 2.4 rules out a
 * silent overwrite, and for a sensitive scope 4.9 rules out an automatic one.
 */
export function resolveConflict<TBody extends Record<string, unknown>>(
  local: TrackerRecord<TBody>,
  remote: TrackerRecord<TBody>,
  /**
   * The last version both sides agreed on. Without it there is no way to tell
   * "I changed this field and they did not" from "we both changed it", so a
   * two-way comparison has to treat every difference as a conflict.
   */
  base?: TrackerRecord<TBody>
): ConflictResolution<TBody> {
  if (local.revision === remote.revision) {
    return { outcome: "no-conflict", record: local };
  }

  // One side never moved: the other simply wins.
  if (local.revision === 1 && local.updatedAt === local.createdAt) {
    return { outcome: "resolved", record: remote, strategy: "remote" };
  }

  const fields = new Set([
    ...Object.keys(local.body),
    ...Object.keys(remote.body),
    ...(base ? Object.keys(base.body) : []),
  ]);

  const conflictingFields: string[] = [];
  const merged: Record<string, unknown> = {};

  for (const key of Array.from(fields)) {
    const localValue = local.body[key];
    const remoteValue = remote.body[key];

    if (equalValue(localValue, remoteValue)) {
      merged[key] = localValue;
      continue;
    }
    if (localValue === undefined) {
      merged[key] = remoteValue;
      continue;
    }
    if (remoteValue === undefined) {
      merged[key] = localValue;
      continue;
    }

    if (base) {
      const baseValue = base.body[key];
      const localMoved = !equalValue(localValue, baseValue);
      const remoteMoved = !equalValue(remoteValue, baseValue);

      // Only one side edited this field, so there is nothing to arbitrate.
      if (localMoved && !remoteMoved) {
        merged[key] = localValue;
        continue;
      }
      if (remoteMoved && !localMoved) {
        merged[key] = remoteValue;
        continue;
      }
    }

    conflictingFields.push(key);
  }

  if (conflictingFields.length > 0) {
    return { outcome: "needs-review", local, remote, conflictingFields };
  }

  const newerAt =
    local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt;

  return {
    outcome: "resolved",
    strategy: "merged",
    record: {
      ...local,
      body: merged as TBody,
      updatedAt: newerAt,
      revision: Math.max(local.revision, remote.revision) + 1,
    },
  };
}

function equalValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Drops incoming records already held under the same provider and external id.
 *
 * 3.19 requires synchronisation not to create duplicates. Matching on the
 * provider's own id — not on shape or timestamp — is what makes a re-sync of
 * an overlapping window safe to run repeatedly.
 */
export function dedupeImported<TBody>(
  existing: TrackerRecord<TBody>[],
  incoming: TrackerRecord<TBody>[]
): { added: TrackerRecord<TBody>[]; updated: TrackerRecord<TBody>[] } {
  const seen = new Map<string, TrackerRecord<TBody>>();
  for (const record of existing) {
    if (record.provider && record.externalId) {
      seen.set(`${record.provider}:${record.externalId}`, record);
    }
  }

  const added: TrackerRecord<TBody>[] = [];
  const updated: TrackerRecord<TBody>[] = [];

  for (const record of incoming) {
    const key =
      record.provider && record.externalId
        ? `${record.provider}:${record.externalId}`
        : null;

    if (!key) {
      added.push(record);
      continue;
    }

    const match = seen.get(key);
    if (!match) {
      added.push(record);
      seen.set(key, record);
      continue;
    }

    // A provider may correct a value it already sent. Only take it when the
    // user has not edited their copy since it arrived, so a manual correction
    // is never overwritten by the next sync.
    //
    // An edit after import is what `updatedAt` moving past `createdAt` means.
    // The source stays "imported" through such an edit — 3.19 wants the origin
    // preserved — so the source is not what tells the two cases apart.
    const userEdited = match.updatedAt > match.createdAt;
    if (!userEdited && record.updatedAt > match.updatedAt) {
      const merged = {
        ...match,
        body: record.body,
        updatedAt: record.updatedAt,
        revision: match.revision + 1,
      };
      updated.push(merged);
      // Register the newer copy, so a third record for the same external id in
      // the same batch compares against it rather than against the original
      // and produces a second update for the same document.
      seen.set(key, merged);
    }
  }

  return { added, updated };
}

/**
 * What disconnecting a provider does to the records it brought in.
 * 3.19 and acceptance scenario 9 require the user to understand this before
 * they confirm, so the counts are computed rather than described vaguely.
 */
export function describeDisconnect<TBody>(
  records: TrackerRecord<TBody>[],
  provider: string
): { imported: number; edited: number; message: string } {
  const fromProvider = records.filter(record => record.provider === provider);
  const edited = fromProvider.filter(
    record => record.updatedAt > record.createdAt
  ).length;

  return {
    imported: fromProvider.length,
    edited,
    message:
      fromProvider.length === 0
        ? `Disconnecting ${provider} removes its access. No records came from it.`
        : `Disconnecting ${provider} removes its access and stops new syncing. ` +
          `${fromProvider.length} record${fromProvider.length === 1 ? "" : "s"} it imported stay in your journal` +
          (edited > 0 ? `, including ${edited} you have since edited.` : ".") +
          " You can delete them separately.",
  };
}

export type ImportedOrigin = {
  provider: string;
  externalId: string;
  source: RecordSource;
};
