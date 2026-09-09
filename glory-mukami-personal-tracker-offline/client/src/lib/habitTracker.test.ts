import { describe, expect, it } from "vitest";
import {
  habitWeekSummary,
  setHabitDayState,
  type HabitRecord,
} from "./habitTracker";

describe("habit tracker helpers", () => {
  it("replaces one habit state for the same local day", () => {
    const existing: HabitRecord[] = [
      {
        id: "read-2026-08-25",
        habitId: "read",
        date: "2026-08-25",
        state: "partial",
      },
    ];
    expect(
      setHabitDayState(existing, "read", "2026-08-25", "complete")
    ).toEqual([
      {
        id: "read-2026-08-25",
        habitId: "read",
        date: "2026-08-25",
        state: "complete",
      },
    ]);
  });

  it("counts factual state totals without treating rest as failure", () => {
    const records: HabitRecord[] = [
      { id: "1", habitId: "read", date: "2026-08-25", state: "complete" },
      { id: "2", habitId: "stretch", date: "2026-08-25", state: "partial" },
      { id: "3", habitId: "reset", date: "2026-08-25", state: "rest" },
    ];
    expect(habitWeekSummary(records)).toEqual({
      complete: 1,
      partial: 1,
      rest: 1,
      skipped: 0,
    });
  });
});
