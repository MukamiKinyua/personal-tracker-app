import { describe, expect, it } from "vitest";
import {
  createRecord,
  deleteRecord,
  DATA_STATE_LABEL,
  liveRecords,
  resolveDataState,
  restoreRecord,
  updateRecord,
  type TrackerRecord,
} from "./record";

const owner = "user-1";

function waterRecord(body: Record<string, unknown>) {
  return createRecord({
    scope: "water",
    ownerId: owner,
    body,
    now: new Date("2026-03-14T09:00:00.000Z"),
  });
}

describe("record envelope", () => {
  it("stamps identity, ownership, source and revision on creation", () => {
    const record = waterRecord({ amount: 250 });
    expect(record.id).toMatch(/^water_/);
    expect(record.ownerId).toBe(owner);
    expect(record.source).toBe("manual");
    expect(record.revision).toBe(1);
    expect(record.createdAt).toBe(record.updatedAt);
  });

  it("bumps the revision and update stamp on a correction", () => {
    const record = waterRecord({ amount: 250 });
    const corrected = updateRecord(
      record,
      { amount: 300 },
      {
        now: new Date("2026-03-14T10:00:00.000Z"),
      }
    );
    expect(corrected.body.amount).toBe(300);
    expect(corrected.revision).toBe(2);
    expect(corrected.updatedAt).not.toBe(record.updatedAt);
    expect(corrected.createdAt).toBe(record.createdAt);
  });

  it("keeps an audit trail for a sensitive scope only", () => {
    const spend = createRecord({
      scope: "finances",
      ownerId: owner,
      body: { amountMinor: 1200 },
    });
    expect(spend.audit).toHaveLength(1);
    const edited = updateRecord(spend, { amountMinor: 1500 });
    expect(edited.audit?.at(-1)).toMatchObject({
      action: "updated",
      fields: ["amountMinor"],
    });

    expect(waterRecord({ amount: 250 }).audit).toBeUndefined();
  });

  it("deletes softly so the record can be restored", () => {
    const record = waterRecord({ amount: 250 });
    const removed = deleteRecord(record);
    expect(removed.deletedAt).toBeDefined();

    const restored = restoreRecord(removed);
    expect(restored.deletedAt).toBeUndefined();
    expect(restored.body.amount).toBe(250);
    expect(restored.revision).toBe(3);
  });

  it("filters deleted records out of the live set", () => {
    const kept = waterRecord({ amount: 250 });
    const gone = deleteRecord(waterRecord({ amount: 100 }));
    expect(liveRecords([kept, gone])).toEqual([kept]);
  });
});

describe("the five data states", () => {
  const record = waterRecord({ amount: 0 });

  it("separates never-entered from measured zero", () => {
    expect(resolveDataState<{ amount: number }>({ record: null })).toBe(
      "empty"
    );
    expect(
      resolveDataState({ record, measure: body => body.amount as number })
    ).toBe("zero");
  });

  it("reports unavailable when the source could not be read", () => {
    expect(
      resolveDataState({
        record,
        loadFailed: true,
        measure: body => body.amount as number,
      })
    ).toBe("unavailable");
  });

  it("reports a deliberate skip distinctly", () => {
    const skipped = waterRecord({ amount: 0, skipped: true });
    expect(
      resolveDataState({
        record: skipped,
        measure: body => body.amount as number,
      })
    ).toBe("skipped");
  });

  it("reports an incomplete entry when a required field is missing", () => {
    const partial = createRecord({
      scope: "sleep",
      ownerId: owner,
      body: { bedTime: "23:30", wakeTime: "" },
    });
    expect(
      resolveDataState<{ bedTime: string; wakeTime: string }>({
        record: partial as TrackerRecord<{ bedTime: string; wakeTime: string }>,
        requiredFields: ["bedTime", "wakeTime"],
      })
    ).toBe("incomplete");
  });

  it("gives every state its own wording", () => {
    const labels = Object.values(DATA_STATE_LABEL);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
