import { describe, expect, it } from "vitest";
import {
  addWidget,
  availableWidgets,
  defaultLayout,
  moveWidget,
  removeWidget,
  requiredScopes,
  visibleLayout,
  WIDGET_CATALOG,
  widgetDefinition,
} from "./widgets";

const AREAS = ["habits", "tasks", "water", "sleep"];

describe("the catalog", () => {
  it("describes every widget it offers", () => {
    for (const widget of WIDGET_CATALOG) {
      expect(widget.title).toBeTruthy();
      expect(widget.description).toBeTruthy();
    }
  });

  it("has no duplicate kinds", () => {
    const kinds = WIDGET_CATALOG.map(w => w.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("keeps the default set small, so Today stays readable", () => {
    // The requirement is explicit that Today must not become a dense
    // all-data dashboard.
    expect(defaultLayout(AREAS).length).toBeLessThanOrEqual(6);
  });
});

describe("the default layout", () => {
  it("never places a widget for an area the user does not track", () => {
    const layout = defaultLayout([]);
    for (const kind of layout) {
      expect(widgetDefinition(kind)?.requiresArea).toBeUndefined();
    }
  });

  it("includes the area widgets once those areas are tracked", () => {
    expect(defaultLayout(AREAS)).toContain("water");
    expect(defaultLayout([])).not.toContain("water");
  });
});

describe("editing the layout", () => {
  it("adds a widget once only", () => {
    const layout = addWidget(addWidget([], "focus"), "focus");
    expect(layout).toEqual(["focus"]);
  });

  it("removes a widget", () => {
    expect(removeWidget(["focus", "water"], "focus")).toEqual(["water"]);
  });

  it("reorders by index", () => {
    expect(moveWidget(["a", "b", "c"] as never, "c" as never, 0)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("clamps an out-of-range move rather than losing the widget", () => {
    expect(moveWidget(["a", "b"] as never, "a" as never, 99)).toEqual([
      "b",
      "a",
    ]);
    expect(moveWidget(["a", "b"] as never, "b" as never, -5)).toEqual([
      "b",
      "a",
    ]);
  });

  it("ignores a move for a widget that is not placed", () => {
    const layout = ["water"] as never;
    expect(moveWidget(layout, "focus" as never, 0)).toBe(layout);
  });
});

describe("hiding without forgetting", () => {
  it("filters out widgets whose area was switched off", () => {
    const layout = ["quick-log", "water", "streaks"] as never;
    expect(visibleLayout(layout, [])).toEqual(["quick-log"]);
  });

  it("does not rewrite the stored layout, so switching an area back on restores position", () => {
    const layout = ["quick-log", "water", "streaks"] as never;
    visibleLayout(layout, []);
    // The stored arrangement is untouched.
    expect(layout).toEqual(["quick-log", "water", "streaks"]);
    expect(visibleLayout(layout, ["water", "habits"])).toEqual([
      "quick-log",
      "water",
      "streaks",
    ]);
  });

  it("drops a widget kind that no longer exists", () => {
    expect(visibleLayout(["nonsense"] as never, AREAS)).toEqual([]);
  });
});

describe("choosing new widgets", () => {
  it("offers only what is not already placed and is trackable", () => {
    const available = availableWidgets(["water"] as never, ["water"]);
    expect(available.map(w => w.kind)).not.toContain("water");
    // Habits are not tracked, so its widgets are not offered.
    expect(available.map(w => w.kind)).not.toContain("streaks");
  });
});

describe("data the layout needs", () => {
  it("collects the scopes once, without duplicates", () => {
    const scopes = requiredScopes([
      "today-habits",
      "streaks",
      "water",
    ] as never);
    expect(scopes).toEqual(["habit", "water"]);
  });

  it("returns nothing for a layout that reads nothing", () => {
    expect(requiredScopes(["quick-log"] as never)).toEqual([]);
  });
});
