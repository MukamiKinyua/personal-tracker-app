import { describe, expect, it } from "vitest";
import { addLink, createLink, linkedOfKind } from "./links";
import {
  addRecord,
  applyUndo,
  createRecordStore,
  deletedRecords,
  editRecord,
  groupByDay,
  outstandingWrites,
  recordsOnDay,
  removeRecord,
  type RecordStore,
} from "./recordStore";

const TZ = "Africa/Nairobi";

function storeWithWater(): { store: RecordStore; ids: string[] } {
  let store = createRecordStore(TZ);
  const ids: string[] = [];

  for (const [amount, at] of [
    [250, "2026-03-14T06:00:00.000Z"],
    [500, "2026-03-14T13:00:00.000Z"],
    // 21:30 UTC is already 00:30 the next day in Nairobi.
    [200, "2026-03-14T21:30:00.000Z"],
  ] as const) {
    const result = addRecord(store, {
      scope: "water",
      ownerId: "u1",
      body: { amount },
      period: { start: at },
      undoLabel: `Added ${amount} ml`,
    });
    store = result.store;
    ids.push(result.record.id);
  }

  return { store, ids };
}

describe("day grouping in the user's timezone", () => {
  it("files a late entry under the day the user is actually in", () => {
    const { store } = storeWithWater();
    expect(recordsOnDay(store, "water", "2026-03-14")).toHaveLength(2);
    expect(recordsOnDay(store, "water", "2026-03-15")).toHaveLength(1);
  });

  it("groups a scope by day for the pixel grid", () => {
    const { store } = storeWithWater();
    const grouped = groupByDay(store, "water");
    expect([...grouped.keys()].sort()).toEqual(["2026-03-14", "2026-03-15"]);
  });
});

describe("correcting and reversing a water entry", () => {
  it("undoes a quick-add by removing exactly that entry", () => {
    const { store, ids } = storeWithWater();
    const undone = applyUndo(store, `undo_${ids[2]}_create`);

    expect(undone.applied).toBe(true);
    expect(recordsOnDay(undone.store, "water", "2026-03-15")).toHaveLength(0);
    expect(recordsOnDay(undone.store, "water", "2026-03-14")).toHaveLength(2);
  });

  it("undoes an edit back to the previous value rather than to nothing", () => {
    const { store, ids } = storeWithWater();
    const edited = editRecord(
      store,
      ids[0],
      { amount: 400 },
      {
        undoLabel: "Changed to 400 ml",
      }
    );
    expect(edited.record.body.amount).toBe(400);

    const reverted = applyUndo(edited.store, edited.undoId);
    expect(reverted.store.records[ids[0]].body.amount).toBe(250);
    // The reversal is itself a recorded change, not a rewrite of history.
    expect(reverted.store.records[ids[0]].revision).toBe(3);
  });

  it("can move a record in time on edit, and undo moves it back", () => {
    const { store, ids } = storeWithWater();
    const originalPeriod = store.records[ids[0]].period;
    const moved = editRecord(
      store,
      ids[0],
      { amount: 250 },
      {
        undoLabel: "Moved to after midnight",
        // 22:00 UTC is 01:00 the next day in Nairobi, so the day grouping
        // has to follow the new period, not the old one.
        period: { start: "2026-03-14T22:00:00.000Z" },
      }
    );
    expect(moved.record.period.start).toBe("2026-03-14T22:00:00.000Z");
    expect(recordsOnDay(moved.store, "water", "2026-03-14")).toHaveLength(1);
    expect(recordsOnDay(moved.store, "water", "2026-03-15")).toHaveLength(2);

    const reverted = applyUndo(moved.store, moved.undoId);
    expect(reverted.store.records[ids[0]].period).toEqual(originalPeriod);
    expect(recordsOnDay(reverted.store, "water", "2026-03-14")).toHaveLength(2);
  });
});

describe("task completion, undo, and restore", () => {
  it("walks the whole acceptance scenario end to end", () => {
    let store = createRecordStore(TZ);

    const goal = addRecord(store, {
      scope: "goal",
      ownerId: "u1",
      body: { title: "Finish the dissertation" },
      undoLabel: "Added goal",
    });
    store = goal.store;

    const task = addRecord(store, {
      scope: "task",
      ownerId: "u1",
      body: { title: "Draft chapter 3", status: "open" },
      undoLabel: "Added task",
    });
    store = task.store;

    // Link it to the goal.
    store = {
      ...store,
      links: addLink(
        store.links,
        createLink("task", task.record.id, "goal", goal.record.id)
      ),
    };
    expect(linkedOfKind(store.links, "goal", goal.record.id, "task")).toEqual([
      task.record.id,
    ]);

    // Complete it.
    const completed = editRecord(
      store,
      task.record.id,
      {
        status: "done",
        completedAt: "2026-03-14T17:00:00.000Z",
      },
      { undoLabel: "Completed “Draft chapter 3”" }
    );
    expect(completed.record.body.status).toBe("done");

    // Undo the completion.
    const reopened = applyUndo(completed.store, completed.undoId);
    expect(reopened.applied).toBe(true);
    expect(reopened.store.records[task.record.id].body.status).toBe("open");
    expect(
      reopened.store.records[task.record.id].body.completedAt
    ).toBeUndefined();

    // Delete it, then restore it.
    const removed = removeRecord(reopened.store, task.record.id, {
      undoLabel: "Deleted “Draft chapter 3”",
    });
    expect(deletedRecords(removed.store)).toHaveLength(1);

    const restored = applyUndo(removed.store, removed.undoId);
    expect(deletedRecords(restored.store)).toHaveLength(0);
    expect(restored.store.records[task.record.id].body.title).toBe(
      "Draft chapter 3"
    );
    // The link survived the round trip.
    expect(
      linkedOfKind(restored.store.links, "goal", goal.record.id, "task")
    ).toEqual([task.record.id]);
  });
});

describe("the offline queue behind the store", () => {
  it("queues one write per record rather than one per keystroke", () => {
    let store = createRecordStore(TZ);
    const added = addRecord(store, {
      scope: "reflection",
      ownerId: "u1",
      body: { highlights: "" },
      undoLabel: "Started a reflection",
    });
    store = added.store;

    for (const text of ["A", "A g", "A good", "A good week"]) {
      store = editRecord(
        store,
        added.record.id,
        { highlights: text },
        {
          undoLabel: "Edited",
        }
      ).store;
    }

    expect(outstandingWrites(store)).toBe(1);
    expect(store.queue.writes[0].op).toBe("create");
    expect(store.queue.writes[0].body).toMatchObject({
      highlights: "A good week",
    });
  });

  it("keeps both of two adds applied back to back in one tick", () => {
    // The contract RecordStoreProvider.commit() exists to uphold. Each write
    // must build on the result of the last, not on a snapshot taken earlier:
    // two quick-adds in the same tick starting from the same store would leave
    // only one entry, silently losing the other.
    const store = createRecordStore(TZ);

    const first = addRecord(store, {
      scope: "water",
      ownerId: "u1",
      body: { amountMl: 250 },
      undoLabel: "Added 250 ml",
    });
    const second = addRecord(first.store, {
      scope: "water",
      ownerId: "u1",
      body: { amountMl: 500 },
      undoLabel: "Added 500 ml",
    });

    expect(Object.keys(second.store.records)).toHaveLength(2);
    expect(outstandingWrites(second.store)).toBe(2);

    // Both remain individually undoable.
    const undone = applyUndo(second.store, first.undoId);
    expect(undone.applied).toBe(true);
    expect(
      Object.values(undone.store.records).filter(record => !record.deletedAt)
    ).toHaveLength(1);
  });

  it("does not refuse to undo an entry that was never pushed", () => {
    const { store } = storeWithWater();
    const result = applyUndo(store, "undo_missing_create");
    expect(result.applied).toBe(false);
  });
});
