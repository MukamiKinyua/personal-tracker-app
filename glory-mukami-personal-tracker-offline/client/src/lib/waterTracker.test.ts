import { describe, expect, it } from "vitest";
import {
  removeWaterEntry,
  waterProgress,
  waterRemaining,
} from "./waterTracker";

describe("water tracker helpers", () => {
  it("calculates bounded daily progress and the remaining amount", () => {
    expect(waterProgress(1250, 2000)).toBe(63);
    expect(waterProgress(2500, 2000)).toBe(100);
    expect(waterRemaining(1250, 2000)).toBe(750);
    expect(waterRemaining(2500, 2000)).toBe(0);
  });

  it("removes only the selected water entry when entries share an amount", () => {
    const entries = [
      { amount: 250, time: "09:00" },
      { amount: 250, time: "10:00" },
    ];
    expect(removeWaterEntry(entries, entries[1])).toEqual([
      { amount: 250, time: "09:00" },
    ]);
  });
});
