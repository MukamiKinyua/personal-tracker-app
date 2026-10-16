import { describe, expect, it } from "vitest";
import type { UpcomingItem } from "./eventReminders";
import {
  buildWidgetExtras,
  MAX_WIDGET_TASKS,
  MAX_WIDGET_UPCOMING,
  relativeDay,
} from "./widgetSummary";

// Monday 12 Oct 2026, 10:00 local.
const NOW = new Date(2026, 9, 12, 10, 0);

const base = {
  tasks: [],
  sleep: [],
  items: [] as UpcomingItem[],
  previewMode: "Show everything",
  privacyMode: false,
  now: NOW,
};

const item = (
  id: string,
  source: UpcomingItem["source"],
  title: string,
  date: string,
  atMs?: number
): UpcomingItem => ({ id, source, title, date, atMs });

describe("relativeDay", () => {
  it("reads naturally near and far", () => {
    expect(relativeDay(new Date(2026, 9, 12), NOW)).toBe("Today");
    expect(relativeDay(new Date(2026, 9, 13), NOW)).toBe("Tomorrow");
    expect(relativeDay(new Date(2026, 9, 15), NOW)).toBe("Thu 15");
    expect(relativeDay(new Date(2026, 10, 3), NOW)).toBe("3 Nov");
  });
});

describe("tasks", () => {
  const tasks = [
    { title: "Later thing", done: false, when: "later" },
    { title: "Pay rent", done: false, when: "today" },
    { title: "Done thing", done: true, when: "today" },
    { title: "Call mum", done: false, when: "today" },
  ];

  it("lists open tasks with today's first, and skips finished ones", () => {
    const { tasks: lines } = buildWidgetExtras({ ...base, tasks });
    expect(lines).toEqual(["Pay rent", "Call mum", "Later thing"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      title: `t${i}`,
      done: false,
      when: "today",
    }));
    expect(buildWidgetExtras({ ...base, tasks: many }).tasks).toHaveLength(MAX_WIDGET_TASKS);
  });

  it("shows only a generic word unless titles are allowed", () => {
    for (const previewMode of [
      "Hide sensitive names",
      "Show a general reminder only",
      "Hide all reminder previews",
    ]) {
      const { tasks: lines } = buildWidgetExtras({ ...base, tasks, previewMode });
      expect(lines.every(line => line === "Task")).toBe(true);
      expect(lines.join(" ")).not.toContain("rent");
    }
  });

  it("shows nothing at all in privacy mode", () => {
    const result = buildWidgetExtras({ ...base, tasks, privacyMode: true });
    expect(result.tasks).toEqual([]);
    expect(result.hidden).toBe(true);
  });

  it("shortens a very long title", () => {
    const long = [{ title: "x".repeat(100), done: false, when: "today" }];
    expect(buildWidgetExtras({ ...base, tasks: long }).tasks[0]).toHaveLength(40);
  });
});

describe("upcoming", () => {
  const items = [
    item("c", "document", "Passport", "2026-10-20"),
    item("a", "assignment", "Essay", "2026-10-13"),
    item("old", "assignment", "Overdue essay", "2026-10-01"),
    item("r", "reminder", "Call the bank", "", new Date(2026, 9, 12, 17, 30).getTime()),
    item("x", "assignment", "Fourth", "2026-11-30"),
  ];

  it("lists the soonest first, drops the past, and caps the list", () => {
    const { upcoming } = buildWidgetExtras({ ...base, items });
    expect(upcoming).toHaveLength(MAX_WIDGET_UPCOMING);
    expect(upcoming.map(u => u.label)).toEqual(["Call the bank", "Essay", "Passport"]);
    expect(upcoming[0].when).toBe("Today 17:30");
    expect(upcoming[1].when).toBe("Tomorrow");
  });

  it("keeps the dates but hides the titles when reminders reveal little", () => {
    const { upcoming } = buildWidgetExtras({
      ...base,
      items,
      previewMode: "Hide sensitive names",
    });
    expect(upcoming.map(u => u.label)).toEqual(["Reminder", "Assignment", "Document"]);
    expect(upcoming[1].when).toBe("Tomorrow");
  });

  it("includes things due today", () => {
    const { upcoming } = buildWidgetExtras({
      ...base,
      items: [item("t", "assignment", "Due today", "2026-10-12")],
    });
    expect(upcoming[0].when).toBe("Today");
  });
});

describe("sleep", () => {
  const sleep = [
    { hours: 6.04, quality: "Light", start: "2026-10-10T23:00" },
    { hours: 7.46, quality: "Restful", start: "2026-10-11T23:10" },
  ];

  it("reports the most recent night, rounded", () => {
    expect(buildWidgetExtras({ ...base, sleep }).sleep).toEqual({
      hours: 7.5,
      quality: "Restful",
    });
  });

  it("is absent when there is nothing, or in privacy mode", () => {
    expect(buildWidgetExtras({ ...base }).sleep).toBeNull();
    expect(buildWidgetExtras({ ...base, sleep, privacyMode: true }).sleep).toBeNull();
    expect(
      buildWidgetExtras({ ...base, sleep: [{ hours: 0, quality: "", start: "2026-10-11" }] }).sleep
    ).toBeNull();
  });
});
