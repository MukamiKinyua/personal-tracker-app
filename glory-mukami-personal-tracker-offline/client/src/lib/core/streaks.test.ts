import { describe, expect, it } from "vitest";
import {
  classifyDay,
  completionRate,
  computeStreak,
  isDueOn,
  longestStreak,
  streakLabel,
  type HabitDayState,
} from "./streaks";

/** Builds a states map from the most recent day backwards. */
function states(from: DayList): Record<string, HabitDayState> {
  return Object.fromEntries(from) as Record<string, HabitDayState>;
}
type DayList = Array<[string, HabitDayState]>;

describe("what a day does to a streak", () => {
  it("counts a partial day as kept, because partial is not failure", () => {
    expect(classifyDay("complete")).toBe("kept");
    expect(classifyDay("partial")).toBe("kept");
  });

  it("treats a deliberate rest or skip as neither kept nor broken", () => {
    expect(classifyDay("rest")).toBe("neutral");
    expect(classifyDay("skipped")).toBe("neutral");
    expect(classifyDay("planned")).toBe("neutral");
    expect(classifyDay("not-applicable")).toBe("neutral");
  });

  it("treats an unlogged day as broken", () => {
    expect(classifyDay(undefined)).toBe("broken");
  });
});

describe("schedules", () => {
  it("treats a daily habit as due every day", () => {
    expect(isDueOn({ kind: "daily" }, "2026-03-11")).toBe(true);
  });

  it("only counts the chosen weekdays", () => {
    // 2026-03-11 is a Wednesday, 2026-03-12 a Thursday.
    const monWedFri = { kind: "days", days: [1, 3, 5] } as const;
    expect(isDueOn(monWedFri, "2026-03-11")).toBe(true);
    expect(isDueOn(monWedFri, "2026-03-12")).toBe(false);
  });

  it("counts an interval from its start day", () => {
    const everyThird = {
      kind: "interval",
      everyDays: 3,
      from: "2026-03-01",
    } as const;
    expect(isDueOn(everyThird, "2026-03-01")).toBe(true);
    expect(isDueOn(everyThird, "2026-03-04")).toBe(true);
    expect(isDueOn(everyThird, "2026-03-05")).toBe(false);
    // Before the habit existed it was never due.
    expect(isDueOn(everyThird, "2026-02-28")).toBe(false);
  });
});

describe("current streak", () => {
  it("counts consecutive kept days", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-14", "complete"],
        ["2026-03-13", "complete"],
        ["2026-03-12", "partial"],
      ]),
      today: "2026-03-14",
    });
    expect(result.current).toBe(3);
    expect(result.brokenOn).toBeUndefined();
  });

  it("carries the streak across a planned rest day", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-14", "complete"],
        ["2026-03-13", "rest"],
        ["2026-03-12", "complete"],
      ]),
      today: "2026-03-14",
    });
    // The rest day neither adds to nor breaks the run.
    expect(result.current).toBe(2);
    expect(result.brokenOn).toBeUndefined();
  });

  it("does not treat an unlogged today as a broken streak", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-13", "complete"],
        ["2026-03-12", "complete"],
      ]),
      today: "2026-03-14",
    });
    expect(result.current).toBe(2);
    expect(result.brokenOn).toBeUndefined();
  });

  it("stops at a missed due day when no freeze is available", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-14", "complete"],
        // 2026-03-13 missed
        ["2026-03-12", "complete"],
        ["2026-03-11", "complete"],
      ]),
      today: "2026-03-14",
    });
    expect(result.current).toBe(1);
    expect(result.brokenOn).toBe("2026-03-13");
  });

  it("spends a freeze to carry the streak over a missed day", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-14", "complete"],
        // 2026-03-13 missed
        ["2026-03-12", "complete"],
        ["2026-03-11", "complete"],
      ]),
      today: "2026-03-14",
      freezesAvailable: 1,
    });
    expect(result.current).toBe(3);
    expect(result.freezesUsed).toBe(1);
    expect(result.frozenDays).toEqual(["2026-03-13"]);
    expect(result.brokenOn).toBeUndefined();
  });

  it("breaks once the freezes run out", () => {
    const result = computeStreak({
      states: states([
        ["2026-03-14", "complete"],
        // 13th and 12th both missed
        ["2026-03-11", "complete"],
      ]),
      today: "2026-03-14",
      freezesAvailable: 1,
    });
    expect(result.freezesUsed).toBe(1);
    expect(result.brokenOn).toBe("2026-03-12");
    // The freeze bridged the 13th, but the 12th broke the run before the walk
    // reached the 11th — so only the 14th is a kept day in the current streak.
    expect(result.current).toBe(1);
  });

  it("is not broken by a day the habit was never due", () => {
    const result = computeStreak({
      // A Monday/Wednesday/Friday habit, nothing logged Tue or Thu.
      states: states([
        ["2026-03-13", "complete"], // Friday
        ["2026-03-11", "complete"], // Wednesday
        ["2026-03-09", "complete"], // Monday
      ]),
      today: "2026-03-13",
      schedule: { kind: "days", days: [1, 3, 5] },
    });
    expect(result.current).toBe(3);
    expect(result.brokenOn).toBeUndefined();
  });
});

describe("longest streak", () => {
  it("reports the best run in the history, not the current one", () => {
    const best = longestStreak({
      states: states([
        ["2026-03-14", "complete"],
        // 13th missed
        ["2026-03-12", "complete"],
        ["2026-03-11", "complete"],
        ["2026-03-10", "complete"],
      ]),
      today: "2026-03-14",
    });
    expect(best).toBe(3);
  });
});

describe("wording", () => {
  it("never phrases an empty streak as a failure", () => {
    const label = streakLabel({
      current: 0,
      longest: 5,
      freezesUsed: 0,
      frozenDays: [],
    });
    expect(label).toBe("Ready when you are");
    expect(label.toLowerCase()).not.toContain("fail");
    expect(label.toLowerCase()).not.toContain("lost");
  });

  it("says when a freeze is holding the streak up", () => {
    expect(
      streakLabel({ current: 4, longest: 9, freezesUsed: 1, frozenDays: ["x"] })
    ).toBe("4 days, with 1 freeze used");
  });
});

describe("completion rate", () => {
  it("excludes rest days from the denominator rather than counting them as misses", () => {
    const rate = completionRate({
      states: states([
        ["2026-03-10", "complete"],
        ["2026-03-11", "rest"],
        ["2026-03-12", "complete"],
        ["2026-03-13", "rest"],
      ]),
      from: "2026-03-10",
      to: "2026-03-13",
    });
    // Two due days, both kept — resting did not lower the number.
    expect(rate).toEqual({ kept: 2, expected: 2, percent: 100 });
  });

  it("counts an unlogged due day against the rate", () => {
    const rate = completionRate({
      states: states([
        ["2026-03-10", "complete"],
        ["2026-03-12", "complete"],
      ]),
      from: "2026-03-10",
      to: "2026-03-13",
    });
    expect(rate).toEqual({ kept: 2, expected: 4, percent: 50 });
  });

  it("reports zero rather than dividing by zero when nothing was due", () => {
    expect(
      completionRate({
        states: {},
        from: "2026-03-10",
        to: "2026-03-10",
        schedule: { kind: "days", days: [0] },
      })
    ).toEqual({ kept: 0, expected: 0, percent: 0 });
  });
});
