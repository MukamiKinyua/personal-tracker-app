import { describe, expect, it } from "vitest";
import {
  avoidanceMilestone,
  elapsedAvoidanceSeconds,
  formatAvoidanceDuration,
  resetAvoidanceHabit,
  type AvoidanceHabit,
} from "./avoidanceTracker";

describe("avoidanceTracker", () => {
  it("calculates elapsed seconds from persisted timestamps", () => {
    expect(elapsedAvoidanceSeconds(1_000, 61_999)).toBe(60);
    expect(elapsedAvoidanceSeconds(61_999, 1_000)).toBe(0);
  });

  it("formats count-up time as days, hours, minutes, and seconds", () => {
    expect(formatAvoidanceDuration(90_061)).toBe("1d 01h 01m 01s");
  });

  it("selects a milestone without needing a running interval", () => {
    expect(avoidanceMilestone(0)).toContain("first day");
    expect(avoidanceMilestone(7 * 86_400)).toBe("One-week milestone");
    expect(avoidanceMilestone(365 * 86_400)).toBe(
      "One year of choosing differently"
    );
  });

  it("resets one habit and prepends a private history entry", () => {
    const habit: AvoidanceHabit = {
      id: "avoid-1",
      name: "Late-night scrolling",
      reason: "Protect my sleep",
      startedAt: 100,
      history: [{ id: "avoid-1-100", resetAt: 100 }],
      archived: false,
    };
    const reset = resetAvoidanceHabit(habit, 2_000, "Restarting gently");
    expect(reset.startedAt).toBe(2_000);
    expect(reset.history[0]).toEqual({
      id: "avoid-1-2000",
      resetAt: 2_000,
      note: "Restarting gently",
    });
    expect(reset.history).toHaveLength(2);
  });
});
