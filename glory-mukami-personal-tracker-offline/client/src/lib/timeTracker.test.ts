import { describe, expect, it } from "vitest";
import {
  formatClockSeconds,
  isTimerRun,
  localTimingSummary,
  type LocalTimerRecord,
} from "./timeTracker";

describe("local time clock helpers", () => {
  it("formats count-up and countdown clock values", () => {
    expect(formatClockSeconds(5)).toBe("00:05");
    expect(formatClockSeconds(3723)).toBe("01:02:03");
  });

  it("accepts valid persisted timer runs and rejects malformed state", () => {
    expect(
      isTimerRun({
        mode: "countdown",
        baseSeconds: 1500,
        startedAt: 1_000,
        targetSeconds: 1500,
      })
    ).toBe(true);
    expect(
      isTimerRun({ mode: "countup", baseSeconds: 0, startedAt: 1_000 })
    ).toBe(true);
    expect(
      isTimerRun({ mode: "countdown", baseSeconds: -1, startedAt: 1 })
    ).toBe(false);
    expect(isTimerRun({ mode: "countdown", baseSeconds: 10 })).toBe(false);
    expect(isTimerRun(null)).toBe(false);
  });

  it("summarises only local timing records from the selected day", () => {
    const records: LocalTimerRecord[] = [
      {
        id: "1",
        date: "2026-08-25",
        label: "Read",
        mode: "countdown",
        seconds: 1500,
        category: "Study",
      },
      {
        id: "2",
        date: "2026-08-25",
        label: "Admin",
        mode: "countup",
        seconds: 600,
        category: "Life admin",
      },
      {
        id: "3",
        date: "2026-08-24",
        label: "Walk",
        mode: "countup",
        seconds: 1200,
        category: "Movement",
      },
    ];
    expect(localTimingSummary(records, "2026-08-25")).toEqual({
      todaySeconds: 2100,
      todaySessions: 2,
      countdownSeconds: 1500,
      countupSeconds: 600,
    });
  });
});
