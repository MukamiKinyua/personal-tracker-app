import { describe, expect, it } from "vitest";
import {
  clearScope,
  createUndoStack,
  popUndo,
  pruneExpired,
  pushUndo,
  takeUndo,
} from "./undo";

const t0 = 1_000_000;

describe("undo stack", () => {
  it("returns the most recent action first", () => {
    let stack = createUndoStack();
    stack = pushUndo(
      stack,
      { id: "a", label: "Added 250 ml", scope: "water", payload: {} },
      t0
    );
    stack = pushUndo(
      stack,
      { id: "b", label: "Added 500 ml", scope: "water", payload: {} },
      t0 + 10
    );

    const { action } = popUndo(stack, t0 + 20);
    expect(action?.id).toBe("b");
  });

  it("will not undo an action whose window has closed", () => {
    let stack = createUndoStack();
    stack = pushUndo(
      stack,
      {
        id: "a",
        label: "Deleted a task",
        scope: "task",
        payload: {},
        windowMs: 5_000,
      },
      t0
    );
    expect(popUndo(stack, t0 + 4_000).action?.id).toBe("a");
    expect(popUndo(stack, t0 + 6_000).action).toBeUndefined();
  });

  it("takes one specific entry so a visible toast undoes its own action", () => {
    let stack = createUndoStack();
    stack = pushUndo(
      stack,
      { id: "a", label: "First", scope: "task", payload: {} },
      t0
    );
    stack = pushUndo(
      stack,
      { id: "b", label: "Second", scope: "task", payload: {} },
      t0 + 1
    );

    const { action, stack: rest } = takeUndo(stack, "a", t0 + 2);
    expect(action?.label).toBe("First");
    expect(rest.entries.map(entry => entry.id)).toEqual(["b"]);
  });

  it("keeps the stack bounded", () => {
    let stack = createUndoStack(3);
    for (let index = 0; index < 6; index += 1) {
      stack = pushUndo(
        stack,
        { id: `a${index}`, label: "x", scope: "water", payload: {} },
        t0 + index
      );
    }
    expect(stack.entries).toHaveLength(3);
    expect(stack.entries[0].id).toBe("a5");
  });

  it("drops expired entries and clears a scope on demand", () => {
    let stack = createUndoStack();
    stack = pushUndo(
      stack,
      { id: "a", label: "x", scope: "water", payload: {}, windowMs: 1_000 },
      t0
    );
    stack = pushUndo(
      stack,
      { id: "b", label: "y", scope: "task", payload: {} },
      t0
    );

    expect(pruneExpired(stack, t0 + 2_000).entries.map(e => e.id)).toEqual([
      "b",
    ]);
    expect(clearScope(stack, "water").entries.map(e => e.id)).toEqual(["b"]);
  });
});
