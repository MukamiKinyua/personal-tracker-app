import { describe, expect, it } from "vitest";
import { createRecord, type TrackerRecord } from "./record";
import {
  createSyncQueue,
  dedupeImported,
  describeDisconnect,
  enqueueWrite,
  markAttemptFailed,
  pendingCount,
  resolveConflict,
  retryDelayMs,
  type QueuedWrite,
} from "./syncQueue";

function write(over: Partial<QueuedWrite>): QueuedWrite {
  return {
    id: "w1",
    scope: "water",
    recordId: "r1",
    op: "update",
    body: {},
    baseRevision: 1,
    queuedAt: "2026-03-14T09:00:00.000Z",
    attempts: 0,
    ...over,
  };
}

describe("offline write queue", () => {
  it("keeps writes for different records separate", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ id: "w1", recordId: "r1" }));
    queue = enqueueWrite(queue, write({ id: "w2", recordId: "r2" }));
    expect(pendingCount(queue)).toBe(2);
  });

  it("collapses repeated edits of one record into a single write", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ id: "w1", body: { amount: 250 } }));
    queue = enqueueWrite(queue, write({ id: "w2", body: { amount: 500 } }));
    queue = enqueueWrite(
      queue,
      write({ id: "w3", body: { note: "with lunch" } })
    );

    expect(pendingCount(queue)).toBe(1);
    expect(queue.writes[0].body).toEqual({ amount: 500, note: "with lunch" });
    // The merged edit is still reasoned from the version it started at.
    expect(queue.writes[0].baseRevision).toBe(1);
  });

  it("keeps a create a create when it is edited before syncing", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(
      queue,
      write({ id: "w1", op: "create", body: { amount: 250 } })
    );
    queue = enqueueWrite(
      queue,
      write({ id: "w2", op: "update", body: { amount: 300 } })
    );

    expect(queue.writes[0].op).toBe("create");
    expect(queue.writes[0].body).toEqual({ amount: 300 });
  });

  it("sends nothing for a record created and deleted while offline", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ id: "w1", op: "create" }));
    queue = enqueueWrite(queue, write({ id: "w2", op: "delete" }));
    expect(pendingCount(queue)).toBe(0);
  });

  it("lets a delete supersede a pending edit", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(
      queue,
      write({ id: "w1", op: "update", body: { amount: 250 } })
    );
    queue = enqueueWrite(queue, write({ id: "w2", op: "delete" }));
    expect(queue.writes).toHaveLength(1);
    expect(queue.writes[0].op).toBe("delete");
  });

  it("records why an attempt failed and backs off", () => {
    let queue = createSyncQueue();
    queue = enqueueWrite(queue, write({ id: "w1" }));
    queue = markAttemptFailed(queue, "w1", "network unreachable");
    expect(queue.writes[0]).toMatchObject({
      attempts: 1,
      lastError: "network unreachable",
    });
    expect(retryDelayMs(0)).toBe(1_000);
    expect(retryDelayMs(3)).toBe(8_000);
    expect(retryDelayMs(20)).toBe(60_000);
  });
});

describe("conflicting edits", () => {
  const base = createRecord({
    scope: "finances",
    ownerId: "u1",
    body: { amountMinor: 1200, merchant: "Cafe", category: "food" },
  }) as TrackerRecord<Record<string, unknown>>;

  it("merges when the two sides touched different fields", () => {
    const local = {
      ...base,
      body: { ...base.body, merchant: "Cafe Riva" },
      revision: 2,
      updatedAt: "2026-03-14T10:00:00.000Z",
    };
    const remote = {
      ...base,
      body: { ...base.body, category: "eating out" },
      revision: 3,
      updatedAt: "2026-03-14T09:00:00.000Z",
    };

    const result = resolveConflict(local, remote, base);
    expect(result.outcome).toBe("resolved");
    if (result.outcome === "resolved") {
      expect(result.strategy).toBe("merged");
      expect(result.record.body).toMatchObject({
        merchant: "Cafe Riva",
        category: "eating out",
      });
    }
  });

  it("refuses to pick a winner when both sides changed the same field", () => {
    const local = {
      ...base,
      body: { ...base.body, amountMinor: 1500 },
      revision: 2,
      updatedAt: "2026-03-14T10:00:00.000Z",
    };
    const remote = {
      ...base,
      body: { ...base.body, amountMinor: 1800 },
      revision: 3,
      updatedAt: "2026-03-14T11:00:00.000Z",
    };

    const result = resolveConflict(local, remote, base);
    expect(result.outcome).toBe("needs-review");
    if (result.outcome === "needs-review") {
      expect(result.conflictingFields).toEqual(["amountMinor"]);
    }
  });

  it("reports no conflict when the revisions agree", () => {
    expect(resolveConflict(base, base).outcome).toBe("no-conflict");
  });

  it("treats any difference as a conflict when no common ancestor is known", () => {
    const local = {
      ...base,
      body: { ...base.body, merchant: "Cafe Riva" },
      revision: 2,
      updatedAt: "2026-03-14T10:00:00.000Z",
    };
    const remote = {
      ...base,
      body: { ...base.body, category: "eating out" },
      revision: 3,
      updatedAt: "2026-03-14T09:00:00.000Z",
    };

    const result = resolveConflict(local, remote);
    expect(result.outcome).toBe("needs-review");
    if (result.outcome === "needs-review") {
      expect(result.conflictingFields.sort()).toEqual(["category", "merchant"]);
    }
  });
});

describe("imported records", () => {
  function imported(
    externalId: string,
    body: Record<string, unknown>,
    updatedAt?: string
  ) {
    const record = createRecord({
      scope: "sleep",
      ownerId: "u1",
      body,
      source: "imported",
      provider: "ring",
      externalId,
    }) as TrackerRecord<Record<string, unknown>>;
    return updatedAt ? { ...record, updatedAt } : record;
  }

  it("does not import the same provider record twice", () => {
    const existing = [imported("night-1", { minutes: 430 })];
    const { added } = dedupeImported(existing, [
      imported("night-1", { minutes: 430 }),
      imported("night-2", { minutes: 455 }),
    ]);
    expect(added).toHaveLength(1);
    expect(added[0].externalId).toBe("night-2");
  });

  it("accepts a provider correction to a record the user has not touched", () => {
    const existing = [imported("night-1", { minutes: 430 })];
    const { updated } = dedupeImported(existing, [
      imported("night-1", { minutes: 445 }, "2030-01-01T00:00:00.000Z"),
    ]);
    expect(updated).toHaveLength(1);
    expect(updated[0].body.minutes).toBe(445);
  });

  it("never overwrites a value the user corrected by hand", () => {
    const original = imported("night-1", { minutes: 430 });
    const edited = {
      ...original,
      createdAt: "2026-03-14T08:00:00.000Z",
      updatedAt: "2026-03-14T12:00:00.000Z",
    };
    const { added, updated } = dedupeImported(
      [edited],
      [imported("night-1", { minutes: 445 }, "2030-01-01T00:00:00.000Z")]
    );
    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("says exactly what disconnecting a provider does to its records", () => {
    const records = [
      imported("a", { minutes: 400 }),
      {
        ...imported("b", { minutes: 410 }),
        updatedAt: "2030-01-01T00:00:00.000Z",
      },
    ];
    const summary = describeDisconnect(records, "ring");
    expect(summary.imported).toBe(2);
    expect(summary.edited).toBe(1);
    expect(summary.message).toContain(
      "2 records it imported stay in your journal"
    );
    expect(summary.message).toContain("1 you have since edited");
  });
});
