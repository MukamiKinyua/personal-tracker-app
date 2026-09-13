import { describe, expect, it } from "vitest";
import {
  dayKeyOf,
  dayKeyRange,
  daysBetween,
  durationMinutes,
  formatDuration,
  isValidDayKey,
  relativeDayLabel,
  resolveOvernightSession,
  shiftDayKey,
  weekStartKey,
  zonedTimeToInstant,
} from "./datetime";

describe("local calendar day", () => {
  it("files a late-evening entry under the day the user is living in", () => {
    // 23:50 in Nairobi is already 20:50 UTC the same day.
    const instant = new Date("2026-03-14T20:50:00.000Z");
    expect(dayKeyOf(instant, "Africa/Nairobi")).toBe("2026-03-14");
  });

  it("keeps an entry made after midnight local on the new day, not the UTC one", () => {
    // 00:30 on the 15th in Nairobi is still 21:30 on the 14th in UTC.
    const instant = new Date("2026-03-14T21:30:00.000Z");
    expect(dayKeyOf(instant, "Africa/Nairobi")).toBe("2026-03-15");
    expect(dayKeyOf(instant, "UTC")).toBe("2026-03-14");
  });

  it("rejects a date that does not exist and accepts a leap day", () => {
    expect(isValidDayKey("2026-02-29")).toBe(false);
    expect(isValidDayKey("2024-02-29")).toBe(true);
    expect(isValidDayKey("2026-13-01")).toBe(false);
  });
});

describe("calendar arithmetic", () => {
  it("advances one day across a daylight-saving change", () => {
    // US DST began 2026-03-08; the day is 23 hours long.
    expect(shiftDayKey("2026-03-07", 1)).toBe("2026-03-08");
    expect(shiftDayKey("2026-03-08", 1)).toBe("2026-03-09");
  });

  it("advances across a month and a leap year boundary", () => {
    expect(shiftDayKey("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDayKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-03-01", "2026-03-08")).toBe(7);
    expect(daysBetween("2026-03-08", "2026-03-01")).toBe(-7);
  });

  it("builds an inclusive range for a pixel grid", () => {
    expect(dayKeyRange("2026-03-06", "2026-03-09")).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
    ]);
  });

  it("honours the configured week-start day", () => {
    // 2026-03-11 is a Wednesday.
    expect(weekStartKey("2026-03-11", 1)).toBe("2026-03-09");
    expect(weekStartKey("2026-03-11", 0)).toBe("2026-03-08");
  });
});

describe("overnight sessions", () => {
  it("gives the correct duration for sleep crossing midnight", () => {
    const session = resolveOvernightSession(
      "2026-03-14",
      "23:30",
      "07:00",
      "Africa/Nairobi"
    );
    expect(session.crossedMidnight).toBe(true);
    expect(session.minutes).toBe(450);
    expect(session.dayKey).toBe("2026-03-14");
    expect(formatDuration(session.minutes)).toBe("7h 30m");
  });

  it("does not treat an ordinary daytime nap as overnight", () => {
    const session = resolveOvernightSession(
      "2026-03-14",
      "13:00",
      "14:20",
      "Africa/Nairobi"
    );
    expect(session.crossedMidnight).toBe(false);
    expect(session.minutes).toBe(80);
  });

  it("reports real elapsed time when the clocks go forward mid-session", () => {
    // New York lost an hour at 02:00 on 2026-03-08, so 23:00 to 07:00 is 7h.
    const session = resolveOvernightSession(
      "2026-03-07",
      "23:00",
      "07:00",
      "America/New_York"
    );
    expect(session.crossedMidnight).toBe(true);
    expect(session.minutes).toBe(420);
  });

  it("reports real elapsed time when the clocks go back mid-session", () => {
    // New York gained an hour at 02:00 on 2026-11-01, so 23:00 to 07:00 is 9h.
    const session = resolveOvernightSession(
      "2026-10-31",
      "23:00",
      "07:00",
      "America/New_York"
    );
    expect(session.minutes).toBe(540);
  });
});

describe("wall clock to instant", () => {
  it("resolves a local time to the right absolute moment", () => {
    const instant = zonedTimeToInstant("2026-06-01", "09:00", "Africa/Nairobi");
    // Nairobi is UTC+3 year round.
    expect(instant.toISOString()).toBe("2026-06-01T06:00:00.000Z");
  });

  it("resolves the same wall clock differently either side of a DST change", () => {
    const winter = zonedTimeToInstant(
      "2026-01-15",
      "12:00",
      "America/New_York"
    );
    const summer = zonedTimeToInstant(
      "2026-07-15",
      "12:00",
      "America/New_York"
    );
    expect(winter.toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(summer.toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });
});

describe("durations and labels", () => {
  it("measures elapsed minutes between two instants", () => {
    expect(
      durationMinutes("2026-03-14T20:30:00.000Z", "2026-03-15T04:00:00.000Z")
    ).toBe(450);
  });

  it("formats durations without a bare minute count", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(455)).toBe("7h 35m");
  });

  it("labels nearby days relatively", () => {
    expect(relativeDayLabel("2026-03-14", "2026-03-14")).toBe("Today");
    expect(relativeDayLabel("2026-03-16", "2026-03-14")).toBe("In 2 days");
    expect(relativeDayLabel("2026-03-13", "2026-03-14")).toBe("Yesterday");
    expect(relativeDayLabel("2026-03-12", "2026-03-14")).toBe("2 days ago");
  });
});

describe("localCalendarDay", () => {
  it("names the device's local day, not the UTC one", async () => {
    const { localCalendarDay } = await import("./datetime");
    // 23:30 local on the 12th. In any zone east of UTC this instant's
    // toISOString() can already read the 13th; the local day must not.
    expect(localCalendarDay(new Date(2026, 8, 12, 23, 30))).toBe("2026-09-12");
    expect(localCalendarDay(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});
