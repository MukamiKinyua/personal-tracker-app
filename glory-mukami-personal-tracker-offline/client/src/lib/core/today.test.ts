import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./calendar";
import type { SortableItem } from "./sorting";
import {
  buildBriefing,
  buildToday,
  clearDayMessage,
  greetingFor,
  overflowLabel,
  todayItemLabel,
  type TodayHabit,
} from "./today";

const TODAY = "2026-03-14";

function task(over: Partial<SortableItem> & { id: string }): SortableItem {
  return { title: over.id, status: "not-started", ...over };
}

function habit(over: Partial<TodayHabit> & { id: string }): TodayHabit {
  return { title: over.id, schedule: { kind: "daily" }, ...over };
}

describe("what reaches Today", () => {
  it("separates overdue from due today and leaves the future out", () => {
    const view = buildToday({
      today: TODAY,
      items: [
        task({ id: "late", dueDay: "2026-03-10" }),
        task({ id: "now", dueDay: TODAY }),
        task({ id: "later", dueDay: "2026-04-01" }),
        task({ id: "someday" }),
      ],
    });

    expect(view.overdue.items.map(i => i.id)).toEqual(["late"]);
    expect(view.dueToday.items.map(i => i.id)).toEqual(["now"]);
    // Neither a future task nor an undated one is needed now.
    const shown = [...view.overdue.items, ...view.dueToday.items].map(
      i => i.id
    );
    expect(shown).not.toContain("later");
    expect(shown).not.toContain("someday");
  });

  it("shows only habits actually scheduled for today", () => {
    const view = buildToday({
      today: TODAY, // a Saturday
      habits: [
        habit({ id: "daily" }),
        habit({
          id: "weekdays",
          schedule: { kind: "days", days: [1, 2, 3, 4, 5] },
        }),
      ],
    });
    expect(view.habits.items.map(h => h.id)).toEqual(["daily"]);
  });

  it("drops a habit already logged today", () => {
    const view = buildToday({
      today: TODAY,
      habits: [
        habit({ id: "done", state: "complete" }),
        habit({ id: "rested", state: "rest" }),
        habit({ id: "open" }),
      ],
    });
    // Resting is a decision, not something still to do.
    expect(view.habits.items.map(h => h.id)).toEqual(["open"]);
  });

  it("leaves finished calendar events off", () => {
    const events: CalendarEvent[] = [
      { id: "a", category: "appointment", title: "Dentist", day: TODAY },
      { id: "b", category: "task", title: "Sent", day: TODAY, done: true },
    ];
    const view = buildToday({ today: TODAY, events });
    expect(view.events.items.map(e => e.id)).toEqual(["a"]);
  });

  it("lists tracked areas with nothing logged yet", () => {
    const view = buildToday({
      today: TODAY,
      trackedScopes: ["water", "sleep", "wellbeing"],
      loggedScopes: ["sleep"],
    });
    expect(view.notLoggedYet).toEqual(["water", "wellbeing"]);
  });
});

describe("keeping Today small", () => {
  it("caps a section and reports the remainder honestly", () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      task({ id: `t${index}`, dueDay: TODAY })
    );
    const view = buildToday({ today: TODAY, items: many, limit: 5 });

    expect(view.dueToday.items).toHaveLength(5);
    expect(view.dueToday.total).toBe(9);
    expect(view.dueToday.overflow).toBe(4);
    expect(overflowLabel(view.dueToday)).toBe("and 4 more");
  });

  it("says nothing about overflow when nothing was held back", () => {
    const view = buildToday({
      today: TODAY,
      items: [task({ id: "one", dueDay: TODAY })],
    });
    expect(overflowLabel(view.dueToday)).toBeNull();
  });
});

describe("a clear day", () => {
  it("is a state of its own, not an error", () => {
    const view = buildToday({ today: TODAY });
    expect(view.isClear).toBe(true);
    expect(clearDayMessage(view)).toBe("Nothing is due today.");
  });

  it("still invites logging when trackers are untouched", () => {
    const view = buildToday({
      today: TODAY,
      trackedScopes: ["water"],
      loggedScopes: [],
    });
    expect(clearDayMessage(view)).toContain("You can still log");
  });

  it("is not clear while anything is outstanding", () => {
    const view = buildToday({
      today: TODAY,
      items: [task({ id: "x", dueDay: TODAY })],
    });
    expect(view.isClear).toBe(false);
    expect(clearDayMessage(view)).toBe("");
  });
});

describe("the daily briefing", () => {
  const view = buildToday({
    today: TODAY,
    items: [
      task({ id: "Return the library book", dueDay: "2026-03-10" }),
      task({ id: "Email supervisor", dueDay: TODAY }),
    ],
    habits: [habit({ id: "Stretch" })],
  });

  it("greets by time of day and by name when known", () => {
    expect(buildBriefing({ view, hourOfDay: 8, name: "Glory" }).greeting).toBe(
      "Good morning, Glory"
    );
    expect(buildBriefing({ view, hourOfDay: 14 }).greeting).toBe(
      "Good afternoon"
    );
    expect(buildBriefing({ view, hourOfDay: 21 }).greeting).toBe(
      "Good evening"
    );
  });

  it("greetingFor is exposed on its own, not only via buildBriefing", () => {
    // The dashboard's page header greets without a full TodayView, so it
    // needs this directly. A fixed "Good morning, Glory." on that header —
    // once true — would eventually say good morning at 4pm, and would name
    // someone who never signed in, which is what this covers against.
    expect(greetingFor(8, "Glory")).toBe("Good morning, Glory");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(21)).toBe("Good evening");
    // Midnight is still "morning" by this clock's own boundary (hour < 12).
    expect(greetingFor(0)).toBe("Good morning");
    expect(greetingFor(11)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(17)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(23)).toBe("Good evening");
  });

  it("leads with the overdue item, since that is what has slipped", () => {
    expect(buildBriefing({ view, hourOfDay: 9 }).headline).toBe(
      "Return the library book"
    );
  });

  it("counts what is there without grading the day", () => {
    const briefing = buildBriefing({ view, hourOfDay: 9 });
    expect(briefing.lines).toContain("1 overdue item");
    expect(briefing.lines).toContain("1 due today");

    const text = [briefing.headline, ...briefing.lines].join(" ").toLowerCase();
    expect(text).not.toMatch(/well done|great|behind|failed|only|should/);
  });

  it("says plainly when nothing is asking for the user", () => {
    const clear = buildToday({ today: TODAY });
    expect(buildBriefing({ view: clear, hourOfDay: 9 }).headline).toBe(
      "Nothing is asking for you today."
    );
  });
});

describe("item labels", () => {
  it("does not repeat the date for something due today", () => {
    expect(todayItemLabel(task({ id: "x", dueDay: TODAY }), TODAY)).toBe("x");
  });

  it("says how late an overdue item is", () => {
    expect(todayItemLabel(task({ id: "x", dueDay: "2026-03-12" }), TODAY)).toBe(
      "x — 2 days ago"
    );
  });

  it("leaves an undated item as its title", () => {
    expect(todayItemLabel(task({ id: "x" }), TODAY)).toBe("x");
  });
});
