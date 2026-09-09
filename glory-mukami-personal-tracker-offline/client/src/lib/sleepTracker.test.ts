import { describe, expect, it } from "vitest";
import {
  formatSleepDuration,
  replaceSleepLog,
  sleepDurationBand,
  sleepDurationHours,
} from "./sleepTracker";

describe("sleep tracker helpers", () => {
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

  it("replaces only the edited sleep log", () => {
    const original = {
      id: "night-1",
      date: "Mon, Aug 24",
      bedtime: "23:15",
      wakeTime: "07:10",
      hours: 7.9,
      quality: "Restful",
      windDown: true,
      note: "",
    };
    const other = { ...original, id: "night-2", date: "Sun, Aug 23" };
    const updated = {
      ...original,
      quality: "Deep",
      note: "No late screen time",
    };
    const previous = [original, other];
    const next = replaceSleepLog(previous, updated);
    expect(next).toEqual([updated, other]);
    expect(next).not.toBe(previous);
    expect(previous).toEqual([original, other]);
  });
});
