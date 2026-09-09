/**
 * Per-record server storage — the copy that survives losing the device.
 *
 * The existing `mongoJournal` keeps one JSON blob per page, which is fine for
 * page state but cannot support sync: two devices editing different records in
 * the same scope would overwrite each other wholesale, and there is no way to
 * ask "what changed since I last looked".
 *
 * This stores records individually and gives every write a per-owner sequence
 * number, so a client can pull only what it has not seen. Sequence numbers are
 * used rather than timestamps deliberately — a phone with a wrong clock, or two
 * writes inside the same millisecond, both break a timestamp cursor.
 */

import type { Collection } from "mongodb";
import { getMongoDb } from "./mongo";

export type RecordPeriod = { start: string; end?: string };

export type SyncRecord = {
  recordId: string;
  scope: string;
  body: Record<string, unknown>;
  period: RecordPeriod;
  source: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  provider?: string;
  externalId?: string;
};

type StoredRecord = SyncRecord & {
  ownerId: number;
  /** Per-owner monotonic write counter; the cursor a client pulls against. */
  seq: number;
};

type Counter = { ownerId: number; seq: number };

const indexPromises = new Map<string, Promise<void>>();

async function collections() {
  const db = await getMongoDb();
  const records = db.collection<StoredRecord>("journal_records");
  const counters = db.collection<Counter>("journal_counters");
  const key = db.databaseName;

  if (!indexPromises.has(key)) {
    indexPromises.set(
      key,
      Promise.all([
        // One row per record per owner; the guard against double-inserting a
        // record that a retried offline write pushes twice.
        records.createIndex(
          { ownerId: 1, recordId: 1 },
          { unique: true, name: "owner_record_unique" }
        ),
        // The pull cursor.
        records.createIndex({ ownerId: 1, seq: 1 }, { name: "owner_seq" }),
        records.createIndex(
          { ownerId: 1, scope: 1, seq: 1 },
          { name: "owner_scope_seq" }
        ),
        counters.createIndex(
          { ownerId: 1 },
          { unique: true, name: "owner_counter_unique" }
        ),
      ]).then(() => undefined)
    );
  }

  await indexPromises.get(key);
  return { records, counters };
}

/**
 * Reserves a block of sequence numbers atomically.
 *
 * Taken in one hop rather than one per record so a fifty-record batch costs a
 * single round trip, and so two concurrent pushes can never be handed the same
 * number.
 */
async function reserveSeq(
  counters: Collection<Counter>,
  ownerId: number,
  count: number
): Promise<number> {
  const result = await counters.findOneAndUpdate(
    { ownerId },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: "after" }
  );
  const after = result?.seq ?? count;
  // The first number of the reserved block.
  return after - count + 1;
}

function toSyncRecord(document: StoredRecord): SyncRecord {
  // `_id` is stripped alongside the internal fields: it is Mongo's own key,
  // it means nothing to a client, and shipping storage internals to every
  // device makes them impossible to change later without a migration.
  const {
    ownerId: _owner,
    seq: _seq,
    _id: _mongoId,
    ...record
  } = document as StoredRecord & { _id?: unknown };

  // Absent optionals come back as `undefined`, never `null`. The type says
  // `deletedAt?: string`, and a client that trusts the type would be wrong
  // about a record it was told is `null`.
  return {
    ...record,
    deletedAt: record.deletedAt ?? undefined,
    provider: record.provider ?? undefined,
    externalId: record.externalId ?? undefined,
  };
}

export type PullResult = {
  records: SyncRecord[];
  /** Pass back as `since` next time. */
  cursor: number;
  /** True when more remain beyond this page. */
  hasMore: boolean;
};

/**
 * Everything changed since the client's cursor, oldest first.
 *
 * Deletions come back as records carrying `deletedAt` rather than being
 * omitted — a client that only ever heard about existing records would never
 * learn that something was removed on another device.
 */
export async function pullRecords(
  ownerId: number,
  since = 0,
  limit = 500
): Promise<PullResult> {
  const { records } = await collections();

  const page = await records
    .find({ ownerId, seq: { $gt: since } })
    .sort({ seq: 1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = page.length > limit;
  const wanted = hasMore ? page.slice(0, limit) : page;

  return {
    records: wanted.map(toSyncRecord),
    cursor: wanted.length ? wanted[wanted.length - 1].seq : since,
    hasMore,
  };
}

/**
 * What to do with a write whose base revision no longer matches the server.
 *
 * Whether that is harmless depends on *what* moved the record, not on the
 * revision numbers: a replayed offline write and another device's edit both
 * arrive with a stale base, and no comparison of revisions can separate them.
 *
 * So compare the outcome instead. If the server already holds exactly what the
 * write was asking for, the write landed and this is a retry. If it holds
 * something else, someone else changed it and the user has to decide —
 * reporting that as "already applied" would drop their edit silently, which is
 * the one thing this design exists to prevent.
 */
export function classifyStaleWrite(
  current: { body: Record<string, unknown>; deletedAt?: string },
  write: { body: Record<string, unknown>; deletedAt?: string }
): "duplicate" | "conflict" {
  const sameBody = JSON.stringify(current.body) === JSON.stringify(write.body);
  const sameDeletion = Boolean(current.deletedAt) === Boolean(write.deletedAt);
  return sameBody && sameDeletion ? "duplicate" : "conflict";
}

export type PushWrite = {
  recordId: string;
  scope: string;
  body: Record<string, unknown>;
  period: RecordPeriod;
  source: string;
  /** The revision the edit was made against. */
  baseRevision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  provider?: string;
  externalId?: string;
};

export type PushOutcome =
  | { recordId: string; status: "applied"; revision: number; seq: number }
  /** Someone else changed it first; the server copy comes back for merging. */
  | { recordId: string; status: "conflict"; server: SyncRecord }
  /** Already applied — a retried offline write, safely ignored. */
  | { recordId: string; status: "duplicate"; revision: number };

/**
 * Applies a batch of client writes.
 *
 * Every write states the revision it was made against, and the server only
 * accepts it when that still matches. This is what makes an offline queue safe
 * to replay: a write that is already applied reports `duplicate` rather than
 * bumping the revision again, and a write built on a stale version reports
 * `conflict` instead of silently overwriting the other device's edit.
 */
export async function pushRecords(
  ownerId: number,
  writes: PushWrite[]
): Promise<{ outcomes: PushOutcome[]; cursor: number }> {
  const { records, counters } = await collections();
  if (writes.length === 0) {
    return { outcomes: [], cursor: 0 };
  }

  const existing = await records
    .find({ ownerId, recordId: { $in: writes.map(write => write.recordId) } })
    .toArray();
  const byId = new Map(existing.map(document => [document.recordId, document]));

  let nextSeq = await reserveSeq(counters, ownerId, writes.length);
  const outcomes: PushOutcome[] = [];
  const operations: Array<Parameters<typeof records.bulkWrite>[0][number]> = [];
  let highestSeq = 0;

  for (const write of writes) {
    const current = byId.get(write.recordId);

    if (current && current.revision !== write.baseRevision) {
      if (classifyStaleWrite(current, write) === "duplicate") {
        outcomes.push({
          recordId: write.recordId,
          status: "duplicate",
          revision: current.revision,
        });
      } else {
        outcomes.push({
          recordId: write.recordId,
          status: "conflict",
          server: toSyncRecord(current),
        });
      }
      continue;
    }
    // A write for a record the server has never seen is accepted as a create,
    // whatever revision it claims. Refusing would strand a record whose
    // original create was lost in transit, which is worse than taking it late.

    const seq = nextSeq;
    nextSeq += 1;
    highestSeq = Math.max(highestSeq, seq);
    const revision = write.baseRevision + 1;

    operations.push({
      updateOne: {
        filter: { ownerId, recordId: write.recordId },
        update: {
          $set: {
            ownerId,
            recordId: write.recordId,
            scope: write.scope,
            body: write.body,
            period: write.period,
            source: write.source,
            revision,
            createdAt: write.createdAt,
            updatedAt: write.updatedAt,
            // Only set when present, so an absent optional stays absent
            // rather than being stored as an explicit null.
            ...(write.deletedAt ? { deletedAt: write.deletedAt } : {}),
            ...(write.provider ? { provider: write.provider } : {}),
            ...(write.externalId ? { externalId: write.externalId } : {}),
            seq,
          },
        },
        upsert: true,
      },
    });

    outcomes.push({
      recordId: write.recordId,
      status: "applied",
      revision,
      seq,
    });
  }

  if (operations.length > 0) {
    await records.bulkWrite(operations, { ordered: false });
  }

  return { outcomes, cursor: highestSeq };
}

/** The newest sequence number an owner holds, for a first-run full pull. */
/**
 * The highest sequence number actually carried by a record.
 *
 * Read from the records rather than from the counter on purpose. `pushRecords`
 * reserves a block of numbers up front, but writes that come back as conflicts
 * or duplicates never spend theirs, so the counter always runs ahead of the
 * real history. A device that seeded its cursor from the counter would skip
 * every record between the two — which is a silent, total data loss for that
 * device, so the safe number is the one a record can actually be found at.
 */
export async function currentCursor(ownerId: number): Promise<number> {
  const { records } = await collections();
  const newest = await records
    .find({ ownerId })
    .sort({ seq: -1 })
    .limit(1)
    .toArray();
  return newest[0]?.seq ?? 0;
}

export async function countRecords(ownerId: number): Promise<number> {
  const { records } = await collections();
  return records.countDocuments({ ownerId, deletedAt: { $exists: false } });
}

/**
 * Permanently removes everything for an owner.
 *
 * This is the account-deletion path the privacy requirements ask for, so it
 * really deletes rather than marking deleted — including the counter, so a
 * later sign-in starts genuinely fresh rather than resuming an old cursor.
 */
export async function purgeOwner(ownerId: number): Promise<number> {
  const { records, counters } = await collections();
  const result = await records.deleteMany({ ownerId });
  await counters.deleteOne({ ownerId });
  return result.deletedCount ?? 0;
}
