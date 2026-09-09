import { describe, expect, it } from "vitest";
import {
  complete,
  createTimer,
  elapsedMs,
  formatRemaining,
  isExpired,
  pause,
  phaseLabel,
  rehydrate,
  remainingMs,
  reset,
  resume,
  skip,
  start,
  startBreak,
} from "./focusTimer";

const T0 = 1_700_000_000_000;
const MIN = 60_000;

describe("running a focus block", () => {
  it("counts down from the configured length", () => {
    const timer = start(createTimer(25, 5), T0);
    expect(remainingMs(timer, T0)).toBe(25 * MIN);
    expect(remainingMs(timer, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(formatRemaining(timer, T0 + 10 * MIN)).toBe("15:00");
  });

  it("reports the right elapsed time after the tab was backgrounded", () => {
    // No ticks happen while the tab sleeps; the clock is the only source.
    const timer = start(createTimer(25, 5), T0);
    const wokeAt = T0 + 18 * MIN + 30_000;
    expect(elapsedMs(timer, wokeAt)).toBe(18 * MIN + 30_000);
    expect(formatRemaining(timer, wokeAt)).toBe("6:30");
  });

  it("never counts past the end of the block", () => {
    const timer = start(createTimer(25, 5), T0);
    expect(remainingMs(timer, T0 + 90 * MIN)).toBe(0);
    expect(isExpired(timer, T0 + 90 * MIN)).toBe(true);
    expect(formatRemaining(timer, T0 + 90 * MIN)).toBe("0:00");
  });
});

describe("pausing and resuming", () => {
  it("banks the elapsed time and stops the clock while paused", () => {
    let timer = start(createTimer(25, 5), T0);
    timer = pause(timer, T0 + 10 * MIN);

    expect(timer.phase).toBe("paused");
    // Time passing while paused must not consume the block.
    expect(elapsedMs(timer, T0 + 60 * MIN)).toBe(10 * MIN);
    expect(remainingMs(timer, T0 + 60 * MIN)).toBe(15 * MIN);
  });

  it("carries the banked time into the resumed segment", () => {
    let timer = start(createTimer(25, 5), T0);
    timer = pause(timer, T0 + 10 * MIN);
    timer = resume(timer, T0 + 60 * MIN);

    expect(timer.phase).toBe("focus");
    // Ten minutes were already spent, plus five since resuming.
    expect(elapsedMs(timer, T0 + 65 * MIN)).toBe(15 * MIN);
    expect(remainingMs(timer, T0 + 65 * MIN)).toBe(10 * MIN);
  });

  it("survives several pause and resume cycles without drifting", () => {
    let timer = start(createTimer(25, 5), T0);
    timer = pause(timer, T0 + 5 * MIN);
    timer = resume(timer, T0 + 20 * MIN);
    timer = pause(timer, T0 + 25 * MIN);
    timer = resume(timer, T0 + 40 * MIN);

    expect(elapsedMs(timer, T0 + 42 * MIN)).toBe(12 * MIN);
  });

  it("returns to a break rather than to focus when the break was paused", () => {
    let timer = startBreak(createTimer(25, 5), T0);
    timer = pause(timer, T0 + MIN);
    expect(phaseLabel(timer)).toBe("Break paused");

    timer = resume(timer, T0 + 2 * MIN);
    expect(timer.phase).toBe("break");
    expect(remainingMs(timer, T0 + 2 * MIN)).toBe(4 * MIN);
  });

  it("ignores resume on a timer that is not paused", () => {
    const timer = start(createTimer(25, 5), T0);
    expect(resume(timer, T0 + MIN)).toBe(timer);
  });
});

describe("finishing a block", () => {
  it("logs the block length, not the wall time since it started", () => {
    // The tab was asleep long past the end of the block.
    const timer = start(createTimer(25, 5), T0);
    const { timer: done, loggedMinutes } = complete(timer, T0 + 200 * MIN);

    expect(loggedMinutes).toBe(25);
    expect(done.completedBlocks).toBe(1);
    expect(done.phase).toBe("finished");
  });

  it("logs the partial time when a block is skipped early", () => {
    const timer = start(createTimer(25, 5), T0);
    const { timer: stopped, loggedMinutes } = skip(timer, T0 + 8 * MIN);

    expect(loggedMinutes).toBe(8);
    expect(stopped.phase).toBe("idle");
    // A skipped block is not a completed one.
    expect(stopped.completedBlocks).toBe(0);
  });

  it("shows a finished break at zero rather than borrowing the focus length", () => {
    const timer = startBreak(createTimer(25, 5), T0);
    const { timer: done } = complete(timer, T0 + 5 * MIN);
    // Regression: the block kind used to be inferred from the phase, so a
    // finished break fell back to the 25-minute focus length and displayed a
    // fresh 20:00 countdown.
    expect(remainingMs(done, T0 + 5 * MIN)).toBe(0);
    expect(formatRemaining(done, T0 + 5 * MIN)).toBe("0:00");
    expect(phaseLabel(done)).toBe("Break finished");
  });

  it("does not count a break as focus time", () => {
    const timer = startBreak(createTimer(25, 5), T0);
    const { timer: done, loggedMinutes } = complete(timer, T0 + 5 * MIN);

    expect(loggedMinutes).toBe(0);
    expect(done.completedBlocks).toBe(0);
  });
});

describe("coming back to a stored timer", () => {
  it("surfaces a block that expired while the app was closed as finished", () => {
    const timer = start(createTimer(25, 5), T0);
    const restored = rehydrate(timer, T0 + 3 * 60 * MIN);

    expect(restored.phase).toBe("finished");
    expect(restored.completedBlocks).toBe(1);
    // Never a negative countdown.
    expect(remainingMs(restored, T0 + 3 * 60 * MIN)).toBe(0);
  });

  it("leaves a still-running block running", () => {
    const timer = start(createTimer(25, 5), T0);
    const restored = rehydrate(timer, T0 + 10 * MIN);
    expect(restored.phase).toBe("focus");
    expect(remainingMs(restored, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it("leaves a paused timer alone", () => {
    const paused = pause(start(createTimer(25, 5), T0), T0 + MIN);
    expect(rehydrate(paused, T0 + 500 * MIN)).toBe(paused);
  });
});

describe("attribution and state names", () => {
  it("keeps what the session was for", () => {
    const timer = start(createTimer(25, 5), T0, {
      kind: "task",
      id: "t1",
      label: "Draft chapter 3",
    });
    expect(timer.attribution?.label).toBe("Draft chapter 3");
    // Attribution outlives a reset, since the next block is usually the same work.
    expect(reset(timer).attribution?.id).toBe("t1");
  });

  it("names each state plainly rather than leaving it to be inferred", () => {
    const idle = createTimer();
    expect(phaseLabel(idle)).toBe("Ready");
    expect(phaseLabel(start(idle, T0))).toBe("Focusing");
    expect(phaseLabel(pause(start(idle, T0), T0 + MIN))).toBe("Paused");
    expect(phaseLabel(startBreak(idle, T0))).toBe("On a break");
    expect(phaseLabel(complete(start(idle, T0), T0 + 25 * MIN).timer)).toBe(
      "Block finished"
    );
  });

  it("clears the clock on reset", () => {
    const timer = reset(start(createTimer(25, 5), T0));
    expect(timer.phase).toBe("idle");
    expect(timer.completedBlocks).toBe(0);
    expect(elapsedMs(timer, T0 + 99 * MIN)).toBe(0);
  });
});
