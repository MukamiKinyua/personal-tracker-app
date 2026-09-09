import { describe, expect, it } from "vitest";
import {
  addConflict,
  autoResolvable,
  clearConflict,
  conflictSides,
  describeConflict,
  differences,
  resolve,
  triage,
  type Conflict,
} from "./conflicts";
import { createRecord, type TrackerRecord } from "./record";
import type { AnyRecord } from "./recordStore";
import type { SyncRecordPayload } from "./syncEngine";

const DETECTED = "2026-03-14T12:00:00.000Z";

function local(
  body: Record<string, unknown>,
  over: Partial<AnyRecord> = {}
): AnyRecord {
  const record = createRecord({
    scope: "water",
    ownerId: "u1",
    body,
  }) as TrackerRecord<Record<string, unknown>>;
  return { ...record, id: "r1", revision: 3, ...over };
}

function server(
  body: Record<string, unknown>,
  over: Partial<SyncRecordPayload> = {}
): SyncRecordPayload {
  return {
    recordId: "r1",
    scope: "water",
    body,
    period: { start: "2026-03-14T09:00:00.000Z" },
    source: "manual",
    revision: 5,
    createdAt: "2026-03-14T09:00:00.000Z",
    updatedAt: "2026-03-14T11:00:00.000Z",
    ...over,
  };
}

function conflictOf(
  localBody: Record<string, unknown>,
  serverBody: Record<string, unknown>,
  over: { local?: Partial<AnyRecord>; server?: Partial<SyncRecordPayload> } = {}
): Conflict {
  return {
    local: local(localBody, over.local),
    server: server(serverBody, over.server),
    detectedAt: DETECTED,
  };
}

describe("what actually disagrees", () => {
  it("names only the fields that differ", () => {
    const conflict = conflictOf(
      { amountMl: 250, note: "same" },
      { amountMl: 500, note: "same" }
    );

    expect(differences(conflict)).toEqual([
      { field: "amountMl", localValue: 250, serverValue: 500 },
    ]);
  });

  it("counts a field one side does not have as a difference", () => {
    const conflict = conflictOf(
      { amountMl: 250, note: "mine" },
      { amountMl: 250 }
    );
    expect(differences(conflict).map(d => d.field)).toEqual(["note"]);
  });

  it("compares nested values properly", () => {
    const same = conflictOf({ tags: ["a", "b"] }, { tags: ["a", "b"] });
    const different = conflictOf({ tags: ["a"] }, { tags: ["b"] });

    expect(differences(same)).toEqual([]);
    expect(differences(different)).toHaveLength(1);
  });

  it("describes the disagreement in terms a person can answer", () => {
    const conflict = conflictOf({ amountMl: 250 }, { amountMl: 500 });
    expect(describeConflict(conflict)).toBe(
      "water: amountMl differ between this device and another."
    );
  });

  it("summarises a long list rather than naming everything", () => {
    const conflict = conflictOf(
      { a: 1, b: 1, c: 1, d: 1, e: 1 },
      { a: 2, b: 2, c: 2, d: 2, e: 2 }
    );
    expect(describeConflict(conflict)).toContain("and 2 more");
  });
});

describe("resolving", () => {
  const conflict = conflictOf({ amountMl: 250 }, { amountMl: 500 });

  it("takes the other device's version without needing to push it back", () => {
    const result = resolve(conflict, { choice: "server" });
    expect(result.record.body.amountMl).toBe(500);
    // It is already what the server holds.
    expect(result.needsPush).toBe(false);
  });

  it("keeps this device's version and sends it over the top", () => {
    const result = resolve(conflict, { choice: "local" }, DETECTED);
    expect(result.record.body.amountMl).toBe(250);
    expect(result.needsPush).toBe(true);
  });

  it("advances past the server revision so the fix actually sticks", () => {
    const result = resolve(conflict, { choice: "local" });
    // Keeping the local revision would get this rejected as stale on the very
    // next push, and the user would be asked the same question again.
    expect(result.record.revision).toBe(conflict.server.revision);
  });

  it("merges field by field when each side got something right", () => {
    const mixed = conflictOf(
      { amountMl: 250, note: "after the run" },
      { amountMl: 500, note: "" }
    );
    const result = resolve(mixed, {
      choice: "merge",
      take: { amountMl: "server", note: "local" },
    });

    expect(result.record.body).toEqual({
      amountMl: 500,
      note: "after the run",
    });
    expect(result.needsPush).toBe(true);
  });

  it("defaults an unnamed field to this device rather than dropping it", () => {
    const mixed = conflictOf(
      { amountMl: 250, note: "mine" },
      { amountMl: 500 }
    );
    const result = resolve(mixed, {
      choice: "merge",
      take: { amountMl: "server" },
    });
    expect(result.record.body.note).toBe("mine");
  });
});

describe("what can be settled without asking", () => {
  it("settles two copies that turn out to be identical", () => {
    const same = conflictOf({ amountMl: 250 }, { amountMl: 250 });
    expect(autoResolvable(same)).toEqual({ choice: "server" });
  });

  it("lets a deletion win, since restoring is easier than re-deleting", () => {
    const deletedLocally = conflictOf(
      { amountMl: 250 },
      { amountMl: 500 },
      { local: { deletedAt: "2026-03-14T10:00:00.000Z" } }
    );
    expect(autoResolvable(deletedLocally)).toEqual({ choice: "local" });

    const deletedElsewhere = conflictOf(
      { amountMl: 250 },
      { amountMl: 500 },
      { server: { deletedAt: "2026-03-14T10:00:00.000Z" } }
    );
    expect(autoResolvable(deletedElsewhere)).toEqual({ choice: "server" });
  });

  it("refuses to guess when both sides hold real, different values", () => {
    expect(
      autoResolvable(conflictOf({ amountMl: 250 }, { amountMl: 500 }))
    ).toBeNull();
  });

  it("splits a batch into settled and still-needing-a-person", () => {
    const result = triage([
      conflictOf({ amountMl: 250 }, { amountMl: 250 }),
      conflictOf({ amountMl: 250 }, { amountMl: 500 }),
    ]);

    expect(result.resolved).toHaveLength(1);
    expect(result.remaining).toHaveLength(1);
  });
});

describe("presenting the choice", () => {
  it("labels both sides and says which is newer", () => {
    const conflict = conflictOf(
      { amountMl: 250 },
      { amountMl: 500 },
      { local: { updatedAt: "2026-03-14T13:00:00.000Z" } }
    );
    const sides = conflictSides(conflict);

    expect(sides.local.label).toBe("This device");
    expect(sides.server.label).toBe("Another device");
    expect(sides.localIsNewer).toBe(true);
  });

  it("flags a side that is a deletion", () => {
    const conflict = conflictOf(
      { amountMl: 250 },
      { amountMl: 500 },
      { server: { deletedAt: "2026-03-14T10:00:00.000Z" } }
    );
    expect(conflictSides(conflict).server.deleted).toBe(true);
  });
});

describe("the outstanding list", () => {
  it("keeps one question per record", () => {
    const first = conflictOf({ amountMl: 250 }, { amountMl: 500 });
    const second = conflictOf({ amountMl: 250 }, { amountMl: 750 });

    const list = addConflict(addConflict([], first), second);
    expect(list).toHaveLength(1);
    expect(list[0].server.body.amountMl).toBe(750);
  });

  it("clears one once it has been answered", () => {
    const list = addConflict([], conflictOf({ a: 1 }, { a: 2 }));
    expect(clearConflict(list, "r1")).toEqual([]);
  });
});
