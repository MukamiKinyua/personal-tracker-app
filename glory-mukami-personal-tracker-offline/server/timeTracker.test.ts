import { describe, expect, it } from "vitest";
import {
  formatClockSeconds,
  timerSecondsAt,
  type TimerRun,
} from "../client/src/lib/timeTracker";

describe("time tracker helpers", () => {
  it("formats hours, minutes, and seconds without negative output", () => {
    expect(formatClockSeconds(-4)).toBe("00:00");
    expect(formatClockSeconds(65)).toBe("01:05");
    expect(formatClockSeconds(3661)).toBe("01:01:01");
  });

  it("calculates countdown remaining time from an absolute start timestamp", () => {
    const run: TimerRun = {
      mode: "countdown",
      baseSeconds: 300,
      targetSeconds: 300,
      startedAt: 10_000,
    };
    expect(timerSecondsAt(run, 10_000)).toBe(300);
    expect(timerSecondsAt(run, 72_500)).toBe(238);
    expect(timerSecondsAt(run, 400_000)).toBe(0);
  });

  it("continues count-up time from the paused base without drift", () => {
    const run: TimerRun = {
      mode: "countup",
      baseSeconds: 42,
      startedAt: 10_000,
    };
    expect(timerSecondsAt(run, 10_000)).toBe(42);
    expect(timerSecondsAt(run, 72_500)).toBe(104);
  });
});
