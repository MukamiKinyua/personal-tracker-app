import { describe, expect, it } from "vitest";
import { createRecord, type TrackerRecord } from "./record";
import type { AnyRecord } from "./recordStore";
import { createSyncQueue, enqueueWrite, type QueuedWrite } from "./syncQueue";
import {
  applyPulled,
  createSyncState,
  nextBatch,
  readOutcomes,
  syncMessage,
  syncOnce,
  toPushWrite,
  type PushOutcome,
  type SyncRecordPayload,
  type SyncTransport,
} from "./syncEngine";

function rec(id: string, body: Record<string, unknown> = {}): AnyRecord {
  const record = createRecord({
    scope: "water",
    ownerId: "u1",
    body,
  }) as TrackerRecord<Record<string, unknown>>;
  return { ...record, id };
}

function write(over: Partial<QueuedWrite> & { recordId: string }): QueuedWrite {
  return {
    id: `w-${over.recordId}`,
    scope: "water",
    op: "update",
    body: {},
    baseRevision: 1,
    queuedAt: "2026-03-14T09:00:00.000Z",
    attempts: 0,
    ...over,
  };
}

function payload(
  over: Partial<SyncRecordPayload> & { recordId: string }
): SyncRecordPayload {
  return {
    scope: "water",
    body: { amountMl: 250 },
    period: { start: "2026-03-14T09:00:00.000Z" },
    source: "manual",
    revision: 2,
    createdAt: "2026-03-14T09:00:00.000Z",
    updatedAt: "2026-03-14T09:00:00.000Z",
    ...over,
  };
}

describe("preparing a batch", () => {
  it("turns queued writes into what the server expects", () => {
    const record = rec("r1", { amountMl: 250 });
    const prepared = toPushWrite(
      write({ recordId: "r1", baseRevision: 3 }),
      record
    );

    expect(prepared).toMatchObject({
      recordId: "r1",
      scope: "water",
      baseRevision: 3,
      body: { amountMl: 250 },
    });
  });

  it("sends nothing for a write whose record has been purged", () => {
    expect(toPushWrite(write({ recordId: "gone" }), undefined)).toBeNull();
  });

  it("still consumes an unsendable write so the queue cannot jam behind it", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ recordId: "gone" }));
    queue = enqueueWrite(queue, write({ recordId: "r1" }));

    const batch = nextBatch(queue, { r1: rec("r1") });
    expect(batch.writes).toHaveLength(1);
    // Both ids leave the queue, including the one with nothing to send.
    expect(batch.ids).toHaveLength(2);
  });

  it("caps the batch so one request stays sendable on a poor connection", () => {
    let queue = createSyncQueue();
    const records: Record<string, AnyRecord> = {};
    for (let index = 0; index < 250; index += 1) {
      queue = enqueueWrite(
        queue,
        write({ id: `w${index}`, recordId: `r${index}` })
      );
      records[`r${index}`] = rec(`r${index}`);
    }
    expect(nextBatch(queue, records).writes).toHaveLength(100);
  });
});

describe("reading what the server said", () => {
  const local = { r1: rec("r1"), r2: rec("r2") };

  it("treats a duplicate as settled, not as a failure", () => {
    const outcomes: PushOutcome[] = [
      { recordId: "r1", status: "applied", revision: 2, seq: 10 },
      { recordId: "r2", status: "duplicate", revision: 4 },
    ];
    // Retrying a duplicate forever is how a flaky connection becomes a stuck queue.
    expect(readOutcomes(outcomes, local).settled).toEqual(["r1", "r2"]);
  });

  it("separates a real conflict for a decision", () => {
    const outcomes: PushOutcome[] = [
      {
        recordId: "r1",
        status: "conflict",
        server: payload({ recordId: "r1" }),
      },
    ];
    const result = readOutcomes(outcomes, local);

    expect(result.settled).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].local.id).toBe("r1");
  });
});

describe("applying what was pulled", () => {
  it("takes a record this device has never seen", () => {
    const result = applyPulled({
      pulled: [payload({ recordId: "new" })],
      local: {},
    });
    expect(result.accept.map(r => r.recordId)).toEqual(["new"]);
  });

  it("takes the server copy when nothing local is waiting to go out", () => {
    const local = { r1: { ...rec("r1"), revision: 1 } };
    const result = applyPulled({
      pulled: [payload({ recordId: "r1", revision: 5 })],
      local,
    });
    expect(result.accept).toHaveLength(1);
  });

  it("discards a pulled copy the device is already ahead of", () => {
    const local = { r1: { ...rec("r1"), revision: 9 } };
    const result = applyPulled({
      pulled: [payload({ recordId: "r1", revision: 2 })],
      local,
    });
    expect(result.accept).toHaveLength(0);
    expect(result.skip).toHaveLength(1);
  });

  it("never blindly overwrites a record with unsent local writes", () => {
    const local = {
      r1: { ...rec("r1", { amountMl: 250, note: "mine" }), revision: 3 },
    };
    const result = applyPulled({
      pulled: [
        payload({
          recordId: "r1",
          revision: 4,
          body: { amountMl: 999, note: "theirs" },
        }),
      ],
      local,
      pendingIds: new Set(["r1"]),
    });

    // Both sides changed the same fields, so it is escalated rather than taken.
    expect(result.accept).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
  });

  it("takes a deletion made on another device", () => {
    const local = { r1: { ...rec("r1"), revision: 1 } };
    const result = applyPulled({
      pulled: [
        payload({
          recordId: "r1",
          revision: 2,
          deletedAt: "2026-03-14T10:00:00.000Z",
        }),
      ],
      local,
    });
    expect(result.accept[0].deletedAt).toBeDefined();
  });
});

describe("a full pass", () => {
  function transportWith(over: Partial<SyncTransport> = {}): SyncTransport {
    return {
      push: async () => ({ outcomes: [], cursor: 0 }),
      pull: async () => ({ records: [], cursor: 0, hasMore: false }),
      ...over,
    };
  }

  it("pushes before it pulls", async () => {
    const calls: string[] = [];
    const transport = transportWith({
      push: async () => {
        calls.push("push");
        return { outcomes: [], cursor: 1 };
      },
      pull: async () => {
        calls.push("pull");
        return { records: [], cursor: 1, hasMore: false };
      },
    });

    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ recordId: "r1" }));

    await syncOnce({
      transport,
      queue,
      records: { r1: rec("r1") },
      state: createSyncState(),
    });

    // Pulling first would make every unsent write look like a conflict.
    expect(calls).toEqual(["push", "pull"]);
  });

  it("advances the cursor and reports what moved", async () => {
    const transport = transportWith({
      pull: async () => ({
        records: [payload({ recordId: "new" })],
        cursor: 42,
        hasMore: false,
      }),
    });

    const result = await syncOnce({
      transport,
      queue: createSyncQueue(),
      records: {},
      state: createSyncState(),
      now: () => "2026-03-14T12:00:00.000Z",
    });

    expect(result.report.pulled).toBe(1);
    expect(result.state.cursor).toBe(42);
    expect(result.state.lastSyncedAt).toBe("2026-03-14T12:00:00.000Z");
    expect(result.accepted).toHaveLength(1);
  });

  it("leaves the cursor alone when the network fails", async () => {
    const transport = transportWith({
      pull: async () => {
        throw new Error("offline");
      },
    });

    const state = { ...createSyncState(), cursor: 17 };
    const result = await syncOnce({
      transport,
      queue: createSyncQueue(),
      records: {},
      state,
    });

    // Advancing past unseen changes would lose them permanently.
    expect(result.state.cursor).toBe(17);
    expect(result.state.lastError).toBe("offline");
    expect(result.settledWriteIds).toEqual([]);
  });

  it("says there is more to do when the queue is longer than one batch", async () => {
    let queue = createSyncQueue();
    const records: Record<string, AnyRecord> = {};
    for (let index = 0; index < 150; index += 1) {
      queue = enqueueWrite(
        queue,
        write({ id: `w${index}`, recordId: `r${index}` })
      );
      records[`r${index}`] = rec(`r${index}`);
    }

    const result = await syncOnce({
      transport: transportWith(),
      queue,
      records,
      state: createSyncState(),
    });
    expect(result.report.moreToPush).toBe(true);
  });
});

describe("what the user is told", () => {
  it("is honest while offline", () => {
    expect(syncMessage(createSyncState(), false, 3)).toBe(
      "Offline — 3 changes waiting to sync"
    );
    expect(syncMessage(createSyncState(), false, 0)).toContain(
      "saved on this device"
    );
  });

  it("does not claim synced before anything has synced", () => {
    expect(syncMessage(createSyncState(), true, 0)).toBe("Not synced yet");
  });

  it("confirms only once a sync has actually happened", () => {
    const state = {
      ...createSyncState(),
      lastSyncedAt: "2026-03-14T12:00:00.000Z",
    };
    expect(syncMessage(state, true, 0)).toBe("Everything is synced");
  });

  it("surfaces conflicts as needing the user, not as an error", () => {
    const state = {
      ...createSyncState(),
      conflicts: [{ local: rec("r1"), server: payload({ recordId: "r1" }) }],
    };
    expect(syncMessage(state, true, 0)).toBe("1 change needs your decision");
  });

  it("reports a failure plainly", () => {
    const state = { ...createSyncState(), lastError: "no network" };
    expect(syncMessage(state, true, 1)).toBe("Could not sync — no network");
  });
});
