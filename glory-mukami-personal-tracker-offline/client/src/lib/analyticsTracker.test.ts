import { describe, expect, it } from "vitest";
import {
  compareLocalActivitySources,
  descriptiveActivityTrend,
  filterAnalyticsActivityByPeriod,
  localActivitySummary,
  localPixelSummary,
} from "./analyticsTracker";

describe("analyticsTracker", () => {
  it("keeps recorded minute totals separate from non-time entries", () => {
    const summary = localActivitySummary([
      {
        id: "a",
        module: "Productivity",
        amount: 25,
        label: "Outline",
        createdAt: "Aug 26",
      },
      {
        id: "b",
        module: "Learning",
        amount: 40,
        label: "Practice",
        createdAt: "Aug 26",
      },
      {
        id: "c",
        module: "Reflections",
        amount: 1,
        label: "Weekly note",
        createdAt: "Aug 25",
      },
    ]);

    expect(summary.recordCount).toBe(3);
    expect(summary.trackedMinutes).toBe(65);
    expect(summary.moduleSummaries).toEqual([
      { module: "Learning", records: 1, total: 40, unit: "minutes" },
      { module: "Productivity", records: 1, total: 25, unit: "minutes" },
      { module: "Reflections", records: 1, total: 1, unit: "records" },
    ]);
  });

  it("returns factual empty summaries when nothing has been recorded", () => {
    expect(localActivitySummary([])).toEqual({
      recordCount: 0,
      trackedMinutes: 0,
      moduleSummaries: [],
      recent: [],
    });
    expect(localPixelSummary({})).toEqual({ markedDays: 0, activeTrackers: 0 });
  });

  it("counts only locally marked annual cells", () => {
    expect(
      localPixelSummary({
        movement: { "0-1": "#fff" },
        mood: { "0-2": "#000", "0-3": "#111" },
        water: {},
      })
    ).toEqual({ markedDays: 3, activeTrackers: 2 });
  });

  it("filters only dated local activity in the selected review period", () => {
    const records = [
      {
        id: "today",
        module: "Time",
        amount: 15,
        label: "Planning",
        createdAt: "Aug 26",
        recordedOn: "2026-08-26",
      },
      {
        id: "week",
        module: "Learning",
        amount: 25,
        label: "Practice",
        createdAt: "Aug 22",
        recordedOn: "2026-08-22",
      },
      {
        id: "old",
        module: "Goals",
        amount: 1,
        label: "Goal",
        createdAt: "Jul 20",
        recordedOn: "2026-07-20",
      },
      {
        id: "undated",
        module: "Tasks",
        amount: 1,
        label: "Task",
        createdAt: "Aug 26",
      },
    ];
    const reference = new Date("2026-08-26T12:00:00Z");

    expect(
      filterAnalyticsActivityByPeriod(records, "today", reference).map(
        record => record.id
      )
    ).toEqual(["today"]);
    expect(
      filterAnalyticsActivityByPeriod(records, "7d", reference).map(
        record => record.id
      )
    ).toEqual(["today", "week"]);
    expect(
      filterAnalyticsActivityByPeriod(records, "all", reference).map(
        record => record.id
      )
    ).toEqual(["today", "week", "old", "undated"]);
  });

  it("withholds a descriptive weekly comparison until both periods have enough records", () => {
    const reference = new Date("2026-08-26T12:00:00Z");
    const records = ["26", "25", "24", "19", "18", "17"].map((day, index) => ({
      id: String(index),
      module: "Habits",
      amount: 1,
      label: "Habit",
      createdAt: `Aug ${day}`,
      recordedOn: `2026-08-${day}`,
    }));

    expect(descriptiveActivityTrend(records, reference)).toEqual({
      currentCount: 3,
      previousCount: 3,
      evidence: "descriptive",
      direction: "similar",
    });
    expect(descriptiveActivityTrend(records.slice(0, 2), reference)).toEqual({
      currentCount: 2,
      previousCount: 0,
      evidence: "not-enough",
      direction: null,
    });
  });

  it("compares only user-chosen source counts after both sources reach the evidence threshold", () => {
    const records = [
      "Productivity",
      "Productivity",
      "Productivity",
      "Habits",
      "Habits",
      "Habits",
      "Habits",
    ].map((module, index) => ({
      id: String(index),
      module,
      amount: 1,
      label: module,
      createdAt: "Aug 26",
      recordedOn: "2026-08-26",
    }));

    expect(
      compareLocalActivitySources(records, "Productivity", "Habits")
    ).toEqual({
      firstCount: 3,
      secondCount: 4,
      evidence: "descriptive",
      direction: "second",
    });
    expect(
      compareLocalActivitySources(records.slice(0, 5), "Productivity", "Habits")
    ).toEqual({
      firstCount: 3,
      secondCount: 2,
      evidence: "not-enough",
      direction: null,
    });
  });
});

describe("whole numbers in the area breakdown", () => {
  it("counts a night's sleep as one entry, not as its fractional hours", () => {
    // Sleep stores hours in `amount` so the history line can read "7.9 h".
    // 7h55m is 7.916666666666667, which used to be rendered verbatim as the
    // entry total on the analytics page.
    const summary = localActivitySummary([
      {
        id: "s1",
        module: "Sleep",
        amount: 475 / 60,
        label: "7h 55min · Restful sleep log",
        createdAt: "Aug 26",
      },
    ]);

    const sleep = summary.moduleSummaries.find(item => item.module === "Sleep");
    expect(sleep).toEqual({
      module: "Sleep",
      records: 1,
      total: 1,
      unit: "records",
    });
    expect(Number.isInteger(sleep!.total)).toBe(true);
  });

  it("keeps every area total a whole number", () => {
    const summary = localActivitySummary([
      {
        id: "a",
        module: "Sleep",
        amount: 475 / 60,
        label: "x",
        createdAt: "d",
      },
      {
        id: "b",
        module: "Sleep",
        amount: 401 / 60,
        label: "y",
        createdAt: "d",
      },
      { id: "c", module: "Learning", amount: 40, label: "z", createdAt: "d" },
      { id: "d", module: "Habits", amount: 1, label: "w", createdAt: "d" },
    ]);

    for (const item of summary.moduleSummaries) {
      expect(Number.isInteger(item.total)).toBe(true);
    }
    expect(
      summary.moduleSummaries.find(item => item.module === "Sleep")?.total
    ).toBe(2);
    expect(Number.isInteger(summary.trackedMinutes)).toBe(true);
  });

  it("still totals real minutes for the timed areas", () => {
    const summary = localActivitySummary([
      {
        id: "a",
        module: "Study Sessions",
        amount: 25,
        label: "x",
        createdAt: "d",
      },
      {
        id: "b",
        module: "Study Sessions",
        amount: 45,
        label: "y",
        createdAt: "d",
      },
    ]);
    expect(summary.moduleSummaries[0]).toMatchObject({
      total: 70,
      unit: "minutes",
    });
  });
});
