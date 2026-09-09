import { describe, expect, it } from "vitest";
import {
  archivable,
  canTransition,
  dueLabel,
  groupItem,
  groupItems,
  isOpen,
  isOverdue,
  sortItems,
  transition,
  type SortableItem,
} from "./sorting";

const TODAY = "2026-03-14";

function item(over: Partial<SortableItem> & { id: string }): SortableItem {
  return { title: over.id, status: "not-started", ...over };
}

describe("the priority sorting matrix", () => {
  it("sorts by due date first, then priority", () => {
    const items = [
      item({ id: "b", dueDay: "2026-03-16", priority: "urgent" }),
      item({ id: "a", dueDay: "2026-03-15", priority: "low" }),
      item({ id: "c", dueDay: "2026-03-15", priority: "urgent" }),
    ];
    expect(sortItems(items).map(i => i.id)).toEqual(["c", "a", "b"]);
  });

  it("respects a different order of precedence when asked", () => {
    const items = [
      item({ id: "b", dueDay: "2026-03-16", priority: "urgent" }),
      item({ id: "a", dueDay: "2026-03-15", priority: "low" }),
    ];
    expect(sortItems(items, ["priority", "due"]).map(i => i.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("puts undated items last rather than treating them as most urgent", () => {
    const items = [
      item({ id: "undated" }),
      item({ id: "dated", dueDay: "2026-03-20" }),
    ];
    expect(sortItems(items).map(i => i.id)).toEqual(["dated", "undated"]);
  });

  it("treats a missing priority as normal", () => {
    const items = [
      item({ id: "low", priority: "low" }),
      item({ id: "unset" }),
      item({ id: "high", priority: "high" }),
    ];
    expect(sortItems(items, ["priority"]).map(i => i.id)).toEqual([
      "high",
      "unset",
      "low",
    ]);
  });

  it("is stable, so equal items do not shuffle between renders", () => {
    const items = [item({ id: "b" }), item({ id: "a" })];
    expect(sortItems(items).map(i => i.id)).toEqual(["a", "b"]);
    expect(sortItems(sortItems(items)).map(i => i.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the array it was given", () => {
    const items = [item({ id: "b" }), item({ id: "a" })];
    sortItems(items);
    expect(items.map(i => i.id)).toEqual(["b", "a"]);
  });
});

describe("overdue and grouping", () => {
  it("derives overdue from the date rather than a stored status", () => {
    expect(isOverdue(item({ id: "x", dueDay: "2026-03-13" }), TODAY)).toBe(
      true
    );
    expect(isOverdue(item({ id: "x", dueDay: "2026-03-14" }), TODAY)).toBe(
      false
    );
  });

  it("never calls a completed item overdue", () => {
    const done = item({ id: "x", dueDay: "2026-03-01", status: "completed" });
    expect(isOverdue(done, TODAY)).toBe(false);
  });

  it("keeps a submitted item open, since it is awaiting a result", () => {
    expect(isOpen(item({ id: "x", status: "submitted" }))).toBe(true);
    expect(isOpen(item({ id: "x", status: "completed" }))).toBe(false);
  });

  it("separates the groups the requirements name", () => {
    expect(groupItem(item({ id: "a", dueDay: "2026-03-10" }), TODAY)).toBe(
      "overdue"
    );
    expect(groupItem(item({ id: "b", dueDay: TODAY }), TODAY)).toBe("today");
    expect(groupItem(item({ id: "c", dueDay: "2026-03-20" }), TODAY)).toBe(
      "upcoming"
    );
    expect(groupItem(item({ id: "d" }), TODAY)).toBe("someday");
    expect(groupItem(item({ id: "e", status: "completed" }), TODAY)).toBe(
      "completed"
    );
  });

  it("returns every group even when some are empty", () => {
    const groups = groupItems([item({ id: "a", dueDay: TODAY })], TODAY);
    expect(Object.keys(groups).sort()).toEqual([
      "completed",
      "overdue",
      "someday",
      "today",
      "upcoming",
    ]);
    expect(groups.overdue).toEqual([]);
    expect(groups.today).toHaveLength(1);
  });
});

describe("the status machine", () => {
  it("allows completion to be reversed", () => {
    expect(canTransition("completed", "in-progress")).toBe(true);
    expect(canTransition("completed", "not-started")).toBe(true);
  });

  it("lets an archived item be brought back", () => {
    expect(canTransition("archived", "in-progress")).toBe(true);
  });

  it("refuses a transition that makes no sense", () => {
    expect(canTransition("archived", "submitted")).toBe(false);
    expect(() =>
      transition(item({ id: "x", status: "archived" }), "submitted")
    ).toThrow(/Cannot move an item/);
  });

  it("stamps the completion time on completing", () => {
    const done = transition(
      item({ id: "x", status: "in-progress" }),
      "completed",
      "2026-03-14T17:00:00.000Z"
    );
    expect(done.status).toBe("completed");
    expect(done.completedAt).toBe("2026-03-14T17:00:00.000Z");
  });

  it("clears the completion stamp on reopening", () => {
    const done = transition(
      item({ id: "x", status: "in-progress" }),
      "completed",
      "2026-03-14T17:00:00.000Z"
    );
    const reopened = transition(done, "in-progress");
    expect(reopened.status).toBe("in-progress");
    // A completed-on date against an open task would be a lie.
    expect(reopened.completedAt).toBeUndefined();
  });

  it("is a no-op when the status is unchanged", () => {
    const open = item({ id: "x", status: "in-progress" });
    expect(transition(open, "in-progress")).toBe(open);
  });
});

describe("archiving", () => {
  it("only offers items completed long enough ago", () => {
    const items = [
      item({
        id: "old",
        status: "completed",
        completedAt: "2026-01-01T00:00:00.000Z",
      }),
      item({
        id: "recent",
        status: "completed",
        completedAt: "2026-03-12T00:00:00.000Z",
      }),
      item({ id: "open", status: "in-progress" }),
    ];
    expect(archivable(items, TODAY).map(i => i.id)).toEqual(["old"]);
  });
});

describe("due labels", () => {
  it("pairs a relative label with the exact date", () => {
    const label = dueLabel(item({ id: "x", dueDay: "2026-03-16" }), TODAY);
    expect(label.relative).toBe("Due in 2 days");
    expect(label.exact).toBe("2026-03-16");
    expect(label.overdue).toBe(false);
  });

  it("says how late an overdue item is", () => {
    const label = dueLabel(item({ id: "x", dueDay: "2026-03-11" }), TODAY);
    expect(label.relative).toBe("3 days overdue");
    expect(label.overdue).toBe(true);
  });

  it("handles today and tomorrow in words", () => {
    expect(dueLabel(item({ id: "x", dueDay: TODAY }), TODAY).relative).toBe(
      "Due today"
    );
    expect(
      dueLabel(item({ id: "x", dueDay: "2026-03-15" }), TODAY).relative
    ).toBe("Due tomorrow");
  });

  it("says plainly when there is no date", () => {
    expect(dueLabel(item({ id: "x" }), TODAY).relative).toBe("No date");
  });
});
