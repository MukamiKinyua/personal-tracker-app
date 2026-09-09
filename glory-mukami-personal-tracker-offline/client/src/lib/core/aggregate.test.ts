import { describe, expect, it } from "vitest";
import {
  aggregateAll,
  aggregateScope,
  chapterCounts,
  describeTotal,
  matrixCompletion,
  missingDays,
  timeframeStart,
  withinTimeframe,
} from "./aggregate";
import { createRecord, deleteRecord } from "./record";
import type { AnyRecord } from "./recordStore";

const TODAY = "2026-03-14";

function rec(
  scope: string,
  day: string,
  body: Record<string, unknown> = {}
): AnyRecord {
  return createRecord({
    scope,
    ownerId: "u1",
    body,
    period: { start: `${day}T09:00:00.000Z` },
  }) as AnyRecord;
}

const dayOf = (record: AnyRecord) => record.period.start.slice(0, 10);

describe("timeframes", () => {
  it("bounds each window inclusively", () => {
    expect(timeframeStart("today", TODAY)).toBe(TODAY);
    // Seven days including today.
    expect(timeframeStart("7d", TODAY)).toBe("2026-03-08");
    expect(timeframeStart("30d", TODAY)).toBe("2026-02-13");
  });

  it("has no lower bound for all time", () => {
    expect(timeframeStart("all", TODAY)).toBeNull();
  });

  it("filters records to the window", () => {
    const records = [
      rec("water", "2026-03-14"),
      rec("water", "2026-03-08"),
      rec("water", "2026-03-01"),
    ];
    expect(withinTimeframe(records, "7d", TODAY, dayOf)).toHaveLength(2);
    expect(withinTimeframe(records, "all", TODAY, dayOf)).toHaveLength(3);
  });
});

describe("scope totals", () => {
  it("counts records, active days, and the measure", () => {
    const total = aggregateScope(
      [
        rec("water", "2026-03-14", { amountMl: 250 }),
        rec("water", "2026-03-14", { amountMl: 500 }),
        rec("water", "2026-03-13", { amountMl: 250 }),
      ],
      "water",
      dayOf
    );
    expect(total.count).toBe(3);
    expect(total.activeDays).toBe(2);
    expect(total.measure).toBe(1000);
    expect(total.measureUnit).toBe("ml");
    expect(total.lastRecordedOn).toBe("2026-03-14");
  });

  it("leaves the measure undefined for a scope that has no number", () => {
    const total = aggregateScope(
      [rec("reflection", TODAY, { notes: "x" })],
      "reflection",
      dayOf
    );
    expect(total.count).toBe(1);
    // Not zero — this scope simply has nothing to sum.
    expect(total.measure).toBeUndefined();
  });

  it("distinguishes nothing logged from a logged zero", () => {
    const nothing = aggregateScope([], "water", dayOf);
    const zero = aggregateScope(
      [rec("water", TODAY, { amountMl: 0 })],
      "water",
      dayOf
    );

    expect(nothing.count).toBe(0);
    expect(nothing.measure).toBeUndefined();

    expect(zero.count).toBe(1);
    expect(zero.measure).toBe(0);
  });

  it("ignores deleted records", () => {
    const kept = rec("water", TODAY, { amountMl: 250 });
    const gone = deleteRecord(
      rec("water", TODAY, { amountMl: 999 })
    ) as AnyRecord;
    expect(aggregateScope([kept, gone], "water", dayOf).measure).toBe(250);
  });

  it("aggregates every scope present", () => {
    const totals = aggregateAll(
      [
        rec("water", TODAY, { amountMl: 250 }),
        rec("task", TODAY, { title: "x" }),
      ],
      dayOf
    );
    expect(Object.keys(totals).sort()).toEqual(["task", "water"]);
  });
});

describe("chapter counters", () => {
  it("adds up the scopes under each chapter", () => {
    const totals = aggregateAll(
      [
        rec("water", TODAY, { amountMl: 250 }),
        rec("sleep", TODAY, { minutes: 430 }),
        rec("task", TODAY, { title: "x" }),
      ],
      dayOf
    );
    const counts = chapterCounts(
      { Body: ["water", "sleep"], Life: ["task"] },
      totals,
      { task: 1 }
    );
    expect(counts).toEqual([
      { chapter: "Body", total: 2, needsAttention: 0 },
      { chapter: "Life", total: 1, needsAttention: 1 },
    ]);
  });

  it("keeps a large archive from producing an attention badge", () => {
    const totals = aggregateAll(
      Array.from({ length: 400 }, () => rec("task", TODAY, { title: "done" })),
      dayOf
    );
    const [life] = chapterCounts({ Life: ["task"] }, totals);
    expect(life.total).toBe(400);
    expect(life.needsAttention).toBe(0);
  });
});

describe("grid completion", () => {
  it("does not count days that have not happened yet", () => {
    const result = matrixCompletion({
      filledDays: ["2026-03-12", "2026-03-13"],
      from: "2026-03-12",
      to: "2026-03-31",
      today: "2026-03-14",
    });
    // Three days have happened, two are filled.
    expect(result).toEqual({ filled: 2, expected: 3, percent: 67 });
  });

  it("counts the whole range once it is in the past", () => {
    const result = matrixCompletion({
      filledDays: ["2026-02-01"],
      from: "2026-02-01",
      to: "2026-02-04",
      today: "2026-03-14",
    });
    expect(result).toEqual({ filled: 1, expected: 4, percent: 25 });
  });

  it("returns zero rather than dividing by zero for a future range", () => {
    expect(
      matrixCompletion({
        filledDays: [],
        from: "2026-04-01",
        to: "2026-04-30",
        today: TODAY,
      })
    ).toEqual({ filled: 0, expected: 0, percent: 0 });
  });
});

describe("missing data", () => {
  it("lists the days with nothing recorded, up to today only", () => {
    expect(
      missingDays({
        recordedDays: ["2026-03-12", "2026-03-14"],
        from: "2026-03-12",
        to: "2026-03-20",
        today: TODAY,
      })
    ).toEqual(["2026-03-13"]);
  });
});

describe("accessible summaries", () => {
  it("says plainly when nothing is logged", () => {
    expect(describeTotal(aggregateScope([], "water", dayOf))).toBe(
      "water: nothing logged"
    );
  });

  it("reads out the numbers behind a grid", () => {
    const total = aggregateScope(
      [
        rec("water", "2026-03-14", { amountMl: 250 }),
        rec("water", "2026-03-13", { amountMl: 250 }),
      ],
      "water",
      dayOf
    );
    expect(describeTotal(total)).toBe(
      "water: 2 records, 2 days, 500 ml in total"
    );
  });
});
