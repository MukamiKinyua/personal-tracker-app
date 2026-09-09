import { describe, expect, it } from "vitest";
import {
  FALLBACK_DEFAULTS,
  oneTapBody,
  QUICK_ADD_ACTIONS,
  quickAddMenu,
  quickAddUndoLabel,
  rememberUse,
  resolveDefaults,
} from "./quickAdd";

const AREAS = ["water", "wellbeing", "habits", "tasks", "focus"];

describe("the menu", () => {
  it("hides actions for areas the user does not track", () => {
    const kinds = quickAddMenu({ trackedAreas: [] }).map(a => a.kind);
    expect(kinds).not.toContain("water");
    // Journalling has no area gate, so it is always offered.
    expect(kinds).toContain("journal");
  });

  it("offers the tracked ones", () => {
    expect(quickAddMenu({ trackedAreas: AREAS }).map(a => a.kind)).toContain(
      "water"
    );
  });

  it("puts recently used actions first", () => {
    const menu = quickAddMenu({
      trackedAreas: AREAS,
      recentKinds: ["task", "water"],
    });
    expect(menu.slice(0, 2).map(a => a.kind)).toEqual(["task", "water"]);
  });

  it("prefers one-tap actions among the unused ones", () => {
    const menu = quickAddMenu({ trackedAreas: AREAS });
    const firstMultiStep = menu.findIndex(action => !action.oneTap);
    const lastOneTap = menu.map(a => a.oneTap).lastIndexOf(true);
    expect(lastOneTap).toBeLessThan(firstMultiStep);
  });

  it("can be capped for a compact menu", () => {
    expect(quickAddMenu({ trackedAreas: AREAS, limit: 3 })).toHaveLength(3);
  });

  it("gives every action a distinct shortcut", () => {
    const shortcuts = QUICK_ADD_ACTIONS.map(a => a.shortcut).filter(Boolean);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });
});

describe("remembering what gets used", () => {
  it("moves the newest use to the front without duplicating it", () => {
    let recent = rememberUse([], "water");
    recent = rememberUse(recent, "task");
    recent = rememberUse(recent, "water");
    expect(recent).toEqual(["water", "task"]);
  });

  it("stays bounded", () => {
    let recent: ReturnType<typeof rememberUse> = [];
    for (const kind of [
      "water",
      "task",
      "mood",
      "journal",
      "goal",
      "meal",
    ] as const) {
      recent = rememberUse(recent, kind, 3);
    }
    expect(recent).toHaveLength(3);
  });
});

describe("one-tap actions", () => {
  it("uses the user's own last-used amount rather than a fixed constant", () => {
    const defaults = resolveDefaults({ waterMl: 500 });
    expect(oneTapBody("water", defaults)).toEqual({ amountMl: 500 });
  });

  it("falls back when nothing has been saved yet", () => {
    expect(oneTapBody("water", resolveDefaults())).toEqual({
      amountMl: FALLBACK_DEFAULTS.waterMl,
    });
  });

  it("returns nothing for an action that needs a decision", () => {
    // A journal entry cannot be recorded without the user writing something.
    expect(oneTapBody("journal", resolveDefaults())).toBeNull();
    expect(oneTapBody("task", resolveDefaults())).toBeNull();
  });

  it("names the amount in the undo toast", () => {
    expect(quickAddUndoLabel("water", { amountMl: 250 })).toBe("Added 250 ml");
  });

  it("falls back to the action name when there is no amount", () => {
    expect(quickAddUndoLabel("journal", {})).toBe("Added journal entry");
  });
});
