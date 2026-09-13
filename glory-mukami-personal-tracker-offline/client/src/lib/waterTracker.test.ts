import { describe, expect, it } from "vitest";
import {
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

});
