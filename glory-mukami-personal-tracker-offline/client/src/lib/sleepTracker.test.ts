import { describe, expect, it } from "vitest";
import {
  formatSleepDuration,
  sleepDateInputValue,
  sleepDurationBand,
  sleepDurationCheck,
  sleepDurationHours,
  sleepNightStart,
} from "./sleepTracker";

describe("sleep tracker helpers", () => {
  it("files an overnight sleep under the morning it ended, starting the day before", () => {
    const start = sleepNightStart("2026-09-12", "23:15", "07:10");
    expect(sleepDateInputValue(start)).toBe("2026-09-11");
    expect(start.getHours()).toBe(23);
    expect(start.getMinutes()).toBe(15);
  });

  it("keeps a daytime nap on the same day", () => {
    const start = sleepNightStart("2026-09-12", "14:00", "15:30");
    expect(sleepDateInputValue(start)).toBe("2026-09-12");
    expect(sleepDurationHours("14:00", "15:30")).toBe(1.5);
  });

  it("uses the local calendar date for the date input, not UTC", () => {
    const lateEvening = new Date(2026, 8, 12, 23, 30);
    expect(sleepDateInputValue(lateEvening)).toBe("2026-09-12");
  });

  it("flags a blank field and swapped times instead of trusting the arithmetic", () => {
    expect(sleepDurationCheck("", "07:10", 0).kind).toBe("missing");
    expect(sleepDurationCheck("07:10", "06:00", sleepDurationHours("07:10", "06:00")).kind).toBe(
      "implausible"
    );
    expect(sleepDurationCheck("23:15", "07:10", 7.9).kind).toBe("ok");
  });

  it("calculates an overnight sleep duration from bedtime and wake time", () => {
    expect(sleepDurationHours("23:15", "07:10")).toBeCloseTo(7.916, 2);
    expect(formatSleepDuration(sleepDurationHours("23:15", "07:10"))).toBe(
      "7 h 55 min"
    );
  });

  it("maps saved sleep lengths to the annual duration bands", () => {
    expect(sleepDurationBand(4.5).label).toBe("Under 5 h");
    expect(sleepDurationBand(6.5).label).toBe("5–6 h 59");
    expect(sleepDurationBand(7.5).label).toBe("7–8 h 59");
    expect(sleepDurationBand(9).label).toBe("9 h or more");
  });

});
