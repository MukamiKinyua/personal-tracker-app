/**
 * The sync engine — the drain the offline queue never had.
 *
 * `syncQueue` decides what a write looks like and how writes collapse.
 * `mongoRecords` on the server decides what is accepted. This is the loop
 * between them: push what is queued, pull what changed elsewhere, and decide
 * what to do with anything the server refused.
 *
 * It is written as pure decisions over plain data — no fetch, no timers — so
 * the awkward cases can be tested without a network. The caller supplies a
 * transport, which is also what lets the same engine run against tRPC in the
 * browser and against a native HTTP client once this is wrapped for Android.
 */

import type { AnyRecord } from "./recordStore";
import { resolveConflict } from "./syncQueue";
import type { QueuedWrite, SyncQueue } from "./syncQueue";

export type SyncRecordPayload = {
  recordId: string;
  scope: string;
  body: Record<string, unknown>;
  period: { start: string; end?: string };
  source: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type PushWritePayload = Omit<SyncRecordPayload, "revision"> & {
  baseRevision: number;
};

export type PushOutcome =
  | { recordId: string; status: "applied"; revision: number; seq: number }
  | { recordId: string; status: "conflict"; server: SyncRecordPayload }
  | { recordId: string; status: "duplicate"; revision: number };

/** What the engine needs from the outside world. */
export interface SyncTransport {
  pull(
    since: number,
    limit?: number
  ): Promise<{
    records: SyncRecordPayload[];
    cursor: number;
    hasMore: boolean;
  }>;
  push(writes: PushWritePayload[]): Promise<{
    outcomes: PushOutcome[];
    cursor: number;
  }>;
}

export type SyncState = {
  /** How much of the server's history this device has seen. */
  cursor: number;
  lastSyncedAt?: string;
  /** Records the server refused because someone else changed them first. */
  conflicts: Array<{ local: AnyRecord; server: SyncRecordPayload }>;
  lastError?: string;
};

export function createSyncState(): SyncState {
  return { cursor: 0, conflicts: [] };
}

/** Turns a queued write plus its local record into what the server expects. */
export function toPushWrite(
  write: QueuedWrite,
  record: AnyRecord | undefined
): PushWritePayload | null {
  // A queued write whose record has since been purged has nothing to send.
  if (!record) return null;

  return {
    recordId: record.id,
    scope: record.scope,
    body: record.body,
    period: record.period,
    source: record.source,
    baseRevision: write.baseRevision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

/**
 * How many writes to send at once.
 *
 * Batched rather than sent individually so reconnecting after a week offline
 * is a handful of requests, not hundreds — and capped so one request cannot
 * grow past what a flaky mobile connection will carry.
 */
export const PUSH_BATCH_SIZE = 100;

export function nextBatch(
  queue: SyncQueue,
  records: Record<string, AnyRecord>,
  size = PUSH_BATCH_SIZE
): { writes: PushWritePayload[]; ids: string[] } {
  const writes: PushWritePayload[] = [];
  const ids: string[] = [];

  for (const write of queue.writes.slice(0, size)) {
    const payload = toPushWrite(write, records[write.recordId]);
    // Unsendable writes are still consumed, or the queue jams behind them.
    ids.push(write.id);
    if (payload) writes.push(payload);
  }

  return { writes, ids };
}

export type ApplyPulled = {
  /** Records to write into the local store. */
  accept: SyncRecordPayload[];
  /** Ones the local copy is ahead of, so the pulled version is discarded. */
  skip: SyncRecordPayload[];
  /** Both sides moved; needs a decision. */
  conflicts: Array<{ local: AnyRecord; server: SyncRecordPayload }>;
};

/**
 * Decides what to do with records pulled from the server.
 *
 * A pulled record is taken whenever the device has nothing newer. Where both
 * sides changed the same record, the three-way merge in `syncQueue` gets first
 * refusal, and only a genuine field-level clash is escalated — so a phone and a
 * laptop editing different fields of the same entry reconcile silently, and
 * only a real disagreement reaches the user.
 */
export function applyPulled({
  pulled,
  local,
  pendingIds = new Set<string>(),
}: {
  pulled: SyncRecordPayload[];
  local: Record<string, AnyRecord>;
  /** Records with unsent local writes; these cannot be blindly overwritten. */
  pendingIds?: Set<string>;
}): ApplyPulled {
  const accept: SyncRecordPayload[] = [];
  const skip: SyncRecordPayload[] = [];
  const conflicts: ApplyPulled["conflicts"] = [];

  for (const incoming of pulled) {
    const current = local[incoming.recordId];

    if (!current) {
      accept.push(incoming);
      continue;
    }

    // Nothing local is waiting to go out, so the server is authoritative.
    if (!pendingIds.has(incoming.recordId)) {
      if (incoming.revision >= current.revision) accept.push(incoming);
      else skip.push(incoming);
      continue;
    }

    if (incoming.revision === current.revision) {
      skip.push(incoming);
      continue;
    }

    const merge = resolveConflict(current, {
      ...current,
      ...incoming,
      id: incoming.recordId,
    } as AnyRecord);

    if (merge.outcome === "needs-review") {
      conflicts.push({ local: current, server: incoming });
    } else {
      accept.push(incoming);
    }
  }

  return { accept, skip, conflicts };
}

/**
 * Sorts push outcomes into what the caller must do next.
 *
 * `applied` and `duplicate` both mean the write is safely on the server and
 * can leave the queue — treating a duplicate as a failure is what turns a
 * flaky connection into an endlessly retrying queue.
 */
export function readOutcomes(
  outcomes: PushOutcome[],
  local: Record<string, AnyRecord>
): {
  settled: string[];
  conflicts: Array<{ local: AnyRecord; server: SyncRecordPayload }>;
} {
  const settled: string[] = [];
  const conflicts: Array<{ local: AnyRecord; server: SyncRecordPayload }> = [];

  for (const outcome of outcomes) {
    if (outcome.status === "conflict") {
      const current = local[outcome.recordId];
      if (current) conflicts.push({ local: current, server: outcome.server });
      continue;
    }
    settled.push(outcome.recordId);
  }

  return { settled, conflicts };
}

export type SyncReport = {
  pushed: number;
  pulled: number;
  conflicts: number;
  cursor: number;
  /** True when the queue still holds work after this pass. */
  moreToPush: boolean;
  error?: string;
};

/**
 * One full pass: push everything queued, then pull everything new.
 *
 * Push comes first on purpose. Pulling first would hand the device a server
 * state that its own unsent writes were never applied to, and every one of
 * those writes would then look like a conflict against a version it had simply
 * not been given the chance to build on.
 */
export async function syncOnce({
  transport,
  queue,
  records,
  state,
  now = () => new Date().toISOString(),
}: {
  transport: SyncTransport;
  queue: SyncQueue;
  records: Record<string, AnyRecord>;
  state: SyncState;
  now?: () => string;
}): Promise<{
  state: SyncState;
  report: SyncReport;
  settledWriteIds: string[];
  accepted: SyncRecordPayload[];
}> {
  let pushed = 0;
  let pulled = 0;
  const settledWriteIds: string[] = [];
  const accepted: SyncRecordPayload[] = [];
  const conflicts: SyncState["conflicts"] = [];

  try {
    const batch = nextBatch(queue, records);

    if (batch.writes.length > 0) {
      const result = await transport.push(batch.writes);
      const read = readOutcomes(result.outcomes, records);

      pushed = read.settled.length;
      conflicts.push(...read.conflicts);

      // Every write in the batch leaves the queue, including ones that came
      // back as conflicts: those are now tracked as conflicts instead, and
      // leaving them queued would retry the same rejected write forever.
      settledWriteIds.push(...batch.ids);
    } else if (batch.ids.length > 0) {
      settledWriteIds.push(...batch.ids);
    }

    const incoming = await transport.pull(state.cursor);
    const decision = applyPulled({
      pulled: incoming.records,
      local: records,
      pendingIds: new Set(queue.writes.map(write => write.recordId)),
    });

    accepted.push(...decision.accept);
    conflicts.push(...decision.conflicts);
    pulled = decision.accept.length;

    return {
      state: {
        cursor: incoming.cursor,
        lastSyncedAt: now(),
        conflicts,
        lastError: undefined,
      },
      report: {
        pushed,
        pulled,
        conflicts: conflicts.length,
        cursor: incoming.cursor,
        moreToPush: queue.writes.length > batch.ids.length || incoming.hasMore,
      },
      settledWriteIds,
      accepted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return {
      // The cursor is left untouched on failure, so the next attempt asks for
      // the same window again rather than skipping past unseen changes.
      state: { ...state, lastError: message },
      report: {
        pushed: 0,
        pulled: 0,
        conflicts: state.conflicts.length,
        cursor: state.cursor,
        moreToPush: queue.writes.length > 0,
        error: message,
      },
      settledWriteIds: [],
      accepted: [],
    };
  }
}

/** What to tell the user about sync, in the same plain register as save state. */
export function syncMessage(
  state: SyncState,
  online: boolean,
  pending: number
): string {
  if (!online) {
    return pending > 0
      ? `Offline — ${pending} change${pending === 1 ? "" : "s"} waiting to sync`
      : "Offline — everything here is saved on this device";
  }
  if (state.lastError) return `Could not sync — ${state.lastError}`;
  if (state.conflicts.length > 0) {
    return `${state.conflicts.length} change${state.conflicts.length === 1 ? "" : "s"} need${state.conflicts.length === 1 ? "s" : ""} your decision`;
  }
  if (pending > 0) return "Syncing…";
  return state.lastSyncedAt ? "Everything is synced" : "Not synced yet";
}
