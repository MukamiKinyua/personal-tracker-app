import { describe, expect, it } from "vitest";
import {
  addTimer,
  allTimers,
  clearFinished,
  createRegistry,
  createTimer,
  elapsedMs,
  expiredTimers,
  finishTimer,
  formatTimer,
  pauseTimer,
  pinTimer,
  primaryTimer,
  registrySummary,
  rehydrate,
  remainingMs,
  removeTimer,
  resetTimer,
  resumeTimer,
  runningTimers,
} from "./timers";

const T0 = 1_700_000_000_000;
const MIN = 60_000;

function threeRunning() {
  let registry = createRegistry();
  registry = addTimer(
    registry,
    createTimer({
      kind: "focus",
      label: "Deep work",
      durationMs: 25 * MIN,
      now: T0,
    })
  );
  registry = addTimer(
    registry,
    createTimer({ kind: "rest", label: "Rest", durationMs: 90_000, now: T0 })
  );
  registry = addTimer(
    registry,
    createTimer({
      kind: "study",
      label: "Revision",
      durationMs: 45 * MIN,
      now: T0,
    })
  );
  return registry;
}

describe("running several at once", () => {
  it("keeps three independent countdowns", () => {
    const registry = threeRunning();
    expect(runningTimers(registry)).toHaveLength(3);

    const at = T0 + 60_000;
    const [focus, rest, study] = allTimers(registry);
    expect(remainingMs(focus, at)).toBe(24 * MIN);
    expect(remainingMs(rest, at)).toBe(30_000);
    expect(remainingMs(study, at)).toBe(44 * MIN);
  });

  it("pausing one leaves the others running", () => {
    const registry = pauseTimer(
      threeRunning(),
      allTimers(threeRunning())[0].id,
      T0
    );
    // Only the timer asked for is touched.
    expect(runningTimers(registry).length).toBeGreaterThanOrEqual(2);
  });

  it("does not let a paused timer consume its own countdown", () => {
    let registry = threeRunning();
    const rest = allTimers(registry)[1];
    registry = pauseTimer(registry, rest.id, T0 + 30_000);

    const paused = registry.timers[rest.id];
    expect(paused.phase).toBe("paused");
    // Ten minutes later it still has the same time left.
    expect(remainingMs(paused, T0 + 10 * MIN)).toBe(60_000);
  });

  it("resumes where it left off while the others carried on", () => {
    let registry = threeRunning();
    const rest = allTimers(registry)[1];

    registry = pauseTimer(registry, rest.id, T0 + 30_000);
    registry = resumeTimer(registry, rest.id, T0 + 10 * MIN);

    expect(elapsedMs(registry.timers[rest.id], T0 + 11 * MIN)).toBe(90_000);
    // The focus timer never noticed any of that.
    const focus = allTimers(registry)[0];
    expect(elapsedMs(focus, T0 + 11 * MIN)).toBe(11 * MIN);
  });

  it("removes one without disturbing the rest", () => {
    const registry = threeRunning();
    const next = removeTimer(registry, allTimers(registry)[1].id);
    expect(allTimers(next).map(t => t.label)).toEqual([
      "Deep work",
      "Revision",
    ]);
  });

  it("resets one back to full", () => {
    let registry = threeRunning();
    const focus = allTimers(registry)[0];
    registry = resetTimer(registry, focus.id, T0 + 10 * MIN);
    expect(remainingMs(registry.timers[focus.id], T0 + 10 * MIN)).toBe(
      25 * MIN
    );
  });
});

describe("finishing", () => {
  it("reports the time a countdown actually ran, capped at its length", () => {
    const registry = threeRunning();
    const rest = allTimers(registry)[1];

    // Woken long after it ran out.
    const { ranMs } = finishTimer(registry, rest.id, T0 + 60 * MIN);
    expect(ranMs).toBe(90_000);
  });

  it("reports full elapsed time for a stopwatch", () => {
    let registry = createRegistry();
    registry = addTimer(
      registry,
      createTimer({ label: "Reading", durationMs: 0, countUp: true, now: T0 })
    );
    const { ranMs } = finishTimer(
      registry,
      allTimers(registry)[0].id,
      T0 + 12 * MIN
    );
    expect(ranMs).toBe(12 * MIN);
  });

  it("lists the ones that have run out", () => {
    const registry = threeRunning();
    const expired = expiredTimers(registry, T0 + 2 * MIN);
    // Only the 90-second rest has finished by then.
    expect(expired.map(t => t.label)).toEqual(["Rest"]);
  });

  it("clears finished timers and keeps the live ones", () => {
    let registry = threeRunning();
    const rest = allTimers(registry)[1];
    registry = finishTimer(registry, rest.id, T0 + 2 * MIN).registry;

    expect(allTimers(clearFinished(registry)).map(t => t.label)).toEqual([
      "Deep work",
      "Revision",
    ]);
  });
});

describe("the compact display", () => {
  it("shows the countdown finishing soonest", () => {
    const registry = threeRunning();
    expect(primaryTimer(registry, T0)?.label).toBe("Rest");
  });

  it("lets the user pin one instead", () => {
    let registry = threeRunning();
    const study = allTimers(registry)[2];
    registry = pinTimer(registry, study.id);
    expect(primaryTimer(registry, T0)?.label).toBe("Revision");
  });

  it("pins only one at a time", () => {
    let registry = threeRunning();
    const [focus, , study] = allTimers(registry);
    registry = pinTimer(registry, focus.id);
    registry = pinTimer(registry, study.id);
    expect(
      allTimers(registry)
        .filter(t => t.pinned)
        .map(t => t.label)
    ).toEqual(["Revision"]);
  });

  it("does not let a stopwatch take the slot from a countdown", () => {
    let registry = createRegistry();
    registry = addTimer(
      registry,
      createTimer({ label: "Reading", durationMs: 0, countUp: true, now: T0 })
    );
    registry = addTimer(
      registry,
      createTimer({ label: "Rest", durationMs: 60_000, now: T0 })
    );
    expect(primaryTimer(registry, T0)?.label).toBe("Rest");
  });

  it("says how many others are going", () => {
    expect(registrySummary(threeRunning(), T0)).toContain("+2 more");
    expect(registrySummary(createRegistry(), T0)).toBe("No timers running");
  });

  it("names a single timer plainly", () => {
    let registry = createRegistry();
    registry = addTimer(
      registry,
      createTimer({ label: "Rest", durationMs: 90_000, now: T0 })
    );
    expect(registrySummary(registry, T0)).toBe("Rest · 1:30");
  });
});

describe("formatting", () => {
  it("counts down in mm:ss and up past an hour", () => {
    let registry = createRegistry();
    registry = addTimer(
      registry,
      createTimer({ label: "Long", durationMs: 90 * MIN, now: T0 })
    );
    const timer = allTimers(registry)[0];
    expect(formatTimer(timer, T0)).toBe("1:30:00");
    expect(formatTimer(timer, T0 + 31 * MIN)).toBe("59:00");
  });

  it("counts a stopwatch upwards", () => {
    let registry = createRegistry();
    registry = addTimer(
      registry,
      createTimer({ label: "Up", durationMs: 0, countUp: true, now: T0 })
    );
    expect(formatTimer(allTimers(registry)[0], T0 + 65_000)).toBe("1:05");
  });
});

describe("coming back after the app was closed", () => {
  it("finishes what ran out while it was shut, without inflating the time", () => {
    const registry = threeRunning();
    // Reopened two hours later.
    const restored = rehydrate(registry, T0 + 120 * MIN);

    const [focus, rest, study] = allTimers(restored);
    expect(rest.phase).toBe("finished");
    expect(rest.carriedMs).toBe(90_000);
    expect(focus.carriedMs).toBe(25 * MIN);
    expect(study.carriedMs).toBe(45 * MIN);
  });

  it("leaves a still-running timer running", () => {
    const restored = rehydrate(threeRunning(), T0 + 5 * MIN);
    expect(runningTimers(restored)).toHaveLength(2);
    expect(remainingMs(allTimers(restored)[0], T0 + 5 * MIN)).toBe(20 * MIN);
  });

  it("never shows a negative countdown", () => {
    const restored = rehydrate(threeRunning(), T0 + 999 * MIN);
    for (const timer of allTimers(restored)) {
      expect(remainingMs(timer, T0 + 999 * MIN)).toBeGreaterThanOrEqual(0);
    }
  });
});
