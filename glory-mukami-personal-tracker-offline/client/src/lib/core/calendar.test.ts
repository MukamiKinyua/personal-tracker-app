import { describe, expect, it } from "vitest";
import {
  agenda,
  categoryCounts,
  eventDays,
  eventsOnDay,
  filterVisible,
  isVisible,
  monthGrid,
  projectPeriod,
  projectRecords,
  sortDayEvents,
  upcoming,
  type CalendarEvent,
} from "./calendar";

const TODAY = "2026-03-14";

function ev(
  over: Partial<CalendarEvent> & { id: string; day: string }
): CalendarEvent {
  return { category: "task", title: over.id, ...over };
}

describe("category visibility", () => {
  it("shows a category unless it was explicitly switched off", () => {
    expect(isVisible("task", {})).toBe(true);
    expect(isVisible("task", { task: true })).toBe(true);
    expect(isVisible("task", { task: false })).toBe(false);
  });

  it("hides only the categories switched off", () => {
    const events = [
      ev({ id: "a", day: TODAY, category: "task" }),
      ev({ id: "b", day: TODAY, category: "sleep" }),
    ];
    expect(filterVisible(events, { sleep: false }).map(e => e.id)).toEqual([
      "a",
    ]);
  });
});

describe("multi-day events", () => {
  it("occupies every day it spans", () => {
    const trip = ev({ id: "t", day: "2026-03-14", endDay: "2026-03-17" });
    expect(eventDays(trip)).toEqual([
      "2026-03-14",
      "2026-03-15",
      "2026-03-16",
      "2026-03-17",
    ]);
  });

  it("appears on a middle day, not only on its first", () => {
    const trip = ev({ id: "t", day: "2026-03-14", endDay: "2026-03-17" });
    expect(eventsOnDay([trip], "2026-03-16").map(e => e.id)).toEqual(["t"]);
  });

  it("ignores an end date that precedes the start", () => {
    const broken = ev({ id: "t", day: "2026-03-14", endDay: "2026-03-10" });
    expect(eventDays(broken)).toEqual(["2026-03-14"]);
  });
});

describe("ordering within a day", () => {
  it("puts all-day items above timed ones", () => {
    const events = [
      ev({ id: "meeting", day: TODAY, time: "09:00" }),
      ev({ id: "essay-due", day: TODAY }),
    ];
    expect(sortDayEvents(events).map(e => e.id)).toEqual([
      "essay-due",
      "meeting",
    ]);
  });

  it("orders timed items by the clock", () => {
    const events = [
      ev({ id: "late", day: TODAY, time: "16:00" }),
      ev({ id: "early", day: TODAY, time: "09:00" }),
    ];
    expect(sortDayEvents(events).map(e => e.id)).toEqual(["early", "late"]);
  });
});

describe("the month grid", () => {
  const events = [ev({ id: "x", day: "2026-03-01" })];

  it("pads to whole weeks", () => {
    const grid = monthGrid({ events, month: "2026-03-10", today: TODAY });
    expect(grid.length % 7).toBe(0);
  });

  it("marks padding days as outside the month but still carries their events", () => {
    // 2026-03-01 is a Sunday, so with a Monday week start it sits in the
    // padding week that belongs to February's grid row.
    const grid = monthGrid({
      events,
      month: "2026-03-10",
      today: TODAY,
      weekStartsOn: 1,
    });
    const first = grid.find(day => day.day === "2026-03-01");
    expect(first?.inPeriod).toBe(true);

    const padding = grid.filter(day => !day.inPeriod);
    expect(padding.length).toBeGreaterThan(0);
    // Padding days are real days, not blanks.
    expect(padding.every(day => Array.isArray(day.events))).toBe(true);
  });

  it("marks today", () => {
    const grid = monthGrid({ events, month: TODAY, today: TODAY });
    expect(grid.filter(day => day.isToday).map(d => d.day)).toEqual([TODAY]);
  });

  it("covers the whole month", () => {
    const grid = monthGrid({ events, month: "2026-03-10", today: TODAY });
    const inMonth = grid.filter(day => day.inPeriod);
    expect(inMonth[0].day).toBe("2026-03-01");
    expect(inMonth[inMonth.length - 1].day).toBe("2026-03-31");
  });

  it("handles a February in a leap year", () => {
    const grid = monthGrid({ events: [], month: "2024-02-10", today: TODAY });
    const inMonth = grid.filter(day => day.inPeriod);
    expect(inMonth).toHaveLength(29);
  });

  it("respects category visibility", () => {
    const mixed = [
      ev({ id: "a", day: "2026-03-10", category: "task" }),
      ev({ id: "b", day: "2026-03-10", category: "sleep" }),
    ];
    const grid = monthGrid({
      events: mixed,
      month: "2026-03-10",
      today: TODAY,
      visibility: { sleep: false },
    });
    const day = grid.find(entry => entry.day === "2026-03-10");
    expect(day?.events.map(e => e.id)).toEqual(["a"]);
  });
});

describe("agenda and upcoming", () => {
  it("returns every day in the range, including empty ones", () => {
    const list = agenda({
      events: [],
      from: "2026-03-14",
      to: "2026-03-16",
      today: TODAY,
    });
    expect(list.map(d => d.day)).toEqual([
      "2026-03-14",
      "2026-03-15",
      "2026-03-16",
    ]);
  });

  it("drops empty days for the compact list", () => {
    const events = [ev({ id: "a", day: "2026-03-16" })];
    const list = upcoming({ events, today: TODAY, days: 7 });
    expect(list.map(d => d.day)).toEqual(["2026-03-16"]);
  });
});

describe("projecting records onto the calendar", () => {
  it("skips records with no date rather than filing them under today", () => {
    const tasks = [
      { id: "1", title: "Dated", due: "2026-03-16" },
      { id: "2", title: "Someday", due: undefined },
    ];
    const events = projectRecords({
      records: tasks,
      category: "task",
      id: task => task.id,
      title: task => task.title,
      day: task => task.due,
    });
    expect(events).toHaveLength(1);
    expect(events[0].sourceId).toBe("1");
  });

  it("namespaces the event id so two chapters cannot collide", () => {
    const [event] = projectRecords({
      records: [{ id: "1", title: "x", due: TODAY }],
      category: "workout",
      id: r => r.id,
      title: r => r.title,
      day: r => r.due,
    });
    expect(event.id).toBe("workout:1");
  });

  it("turns a cross-midnight period into a two-day event", () => {
    const event = projectPeriod({
      id: "s1",
      category: "sleep",
      title: "Sleep",
      start: "2026-03-14T20:30:00.000Z",
      end: "2026-03-15T04:00:00.000Z",
      timezone: "Africa/Nairobi",
    });
    expect(event.day).toBe("2026-03-14");
    expect(event.endDay).toBe("2026-03-15");
  });

  it("leaves endDay off when the period stays inside one day", () => {
    const event = projectPeriod({
      id: "s2",
      category: "focus",
      title: "Focus",
      start: "2026-03-14T09:00:00.000Z",
      end: "2026-03-14T09:25:00.000Z",
      timezone: "UTC",
    });
    expect(event.endDay).toBeUndefined();
  });
});

describe("category counts", () => {
  it("counts what falls inside the range", () => {
    const events = [
      ev({ id: "a", day: "2026-03-14", category: "task" }),
      ev({ id: "b", day: "2026-03-14", category: "task" }),
      ev({ id: "c", day: "2026-04-01", category: "task" }),
    ];
    const counts = categoryCounts(events, "2026-03-01", "2026-03-31");
    expect(counts.task).toBe(2);
    expect(counts.sleep).toBe(0);
  });
});
