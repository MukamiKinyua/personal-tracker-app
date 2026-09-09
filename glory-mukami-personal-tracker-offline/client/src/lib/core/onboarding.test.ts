import { describe, expect, it } from "vitest";
import {
  answer,
  applyOnboarding,
  back,
  completionSummary,
  currentStep,
  firstHabitDraft,
  needsOnboarding,
  next,
  progress,
  skipAll,
  skipStep,
  startOnboarding,
  visibleSteps,
} from "./onboarding";
import { isTracking, resolvePreferences } from "./preferences";

describe("the flow", () => {
  it("starts at the welcome step", () => {
    expect(currentStep(startOnboarding())?.id).toBe("welcome");
  });

  it("only asks about goals for areas the user kept", () => {
    const state = answer(startOnboarding(), { areas: ["water"] });
    const ids = visibleSteps(state).map(step => step.id);

    expect(ids).toContain("water-goal");
    // No sleep tracking, so no sleep goal question.
    expect(ids).not.toContain("sleep-goal");
    expect(ids).not.toContain("first-habit");
  });

  it("moves forwards and back without losing answers", () => {
    let state = answer(startOnboarding(), { displayName: "Glory" });
    state = next(state);
    state = next(state);
    state = back(state);

    expect(state.stepIndex).toBe(1);
    expect(state.answers.displayName).toBe("Glory");
  });

  it("reports progress against the steps this user actually sees", () => {
    const state = answer(startOnboarding(), { areas: ["water"] });
    const shown = visibleSteps(state).length;
    expect(progress(state)).toEqual({
      step: 1,
      total: shown,
      percent: Math.round((1 / shown) * 100),
    });
  });

  it("completes at the last step", () => {
    let state = startOnboarding();
    for (let index = 0; index < visibleSteps(state).length; index += 1) {
      state = next(state);
    }
    expect(state.completed).toBe(true);
  });
});

describe("skipping", () => {
  it("records a skipped step and moves on", () => {
    const state = skipStep(next(startOnboarding()));
    expect(state.skipped).toContain("name");
  });

  it("never records the non-skippable steps as skipped", () => {
    // Welcome cannot be skipped; asking to skip it just advances.
    const state = skipStep(startOnboarding());
    expect(state.skipped).toEqual([]);
    expect(state.stepIndex).toBe(1);
  });

  it("leaves the whole flow in one action", () => {
    const state = skipAll(startOnboarding());
    expect(state.completed).toBe(true);
    expect(state.skipped.length).toBeGreaterThan(0);
  });
});

describe("applying the answers", () => {
  it("gives a user who skipped everything a working configuration", () => {
    const preferences = applyOnboarding(skipAll(startOnboarding()));

    expect(preferences.onboardingCompleted).toBe(true);
    expect(preferences.waterGoalMl).toBe(2000);
    expect(preferences.sleepGoalHours).toBe(8);
    expect(preferences.areas.length).toBeGreaterThan(0);
  });

  it("switches off the areas the user did not choose", () => {
    const state = answer(startOnboarding(), { areas: ["water", "sleep"] });
    const preferences = applyOnboarding(state);

    expect(isTracking(preferences, "water")).toBe(true);
    expect(isTracking(preferences, "sleep")).toBe(true);
    // Tracked by default, but not chosen — so it goes away.
    expect(isTracking(preferences, "habits")).toBe(false);
  });

  it("keeps the sensitive areas off unless deliberately chosen", () => {
    const preferences = applyOnboarding(
      answer(startOnboarding(), { areas: ["water"] })
    );
    expect(isTracking(preferences, "finances")).toBe(false);
    expect(isTracking(preferences, "period")).toBe(false);
  });

  it("stores the goals the user set", () => {
    const state = answer(startOnboarding(), {
      sleepGoalHours: 7.5,
      waterGoalMl: 2500,
    });
    const preferences = applyOnboarding(state);
    expect(preferences.sleepGoalHours).toBe(7.5);
    expect(preferences.waterGoalMl).toBe(2500);
  });

  it("clamps a goal a slipped decimal point would make nonsense", () => {
    const wild = applyOnboarding(
      answer(startOnboarding(), { sleepGoalHours: 800, waterGoalMl: 1 })
    );
    expect(wild.sleepGoalHours).toBe(14);
    expect(wild.waterGoalMl).toBe(250);
  });

  it("ignores a blank name rather than storing one", () => {
    const preferences = applyOnboarding(
      answer(startOnboarding(), { displayName: "   " })
    );
    expect(preferences.displayName).toBe("");
  });
});

describe("what comes out of it", () => {
  it("hands over the first habit ready to create", () => {
    const state = answer(startOnboarding(), { firstHabit: " Stretch " });
    expect(firstHabitDraft(state)).toEqual({
      title: "Stretch",
      schedule: { kind: "daily" },
    });
  });

  it("hands over nothing when no habit was named", () => {
    expect(firstHabitDraft(startOnboarding())).toBeNull();
  });

  it("says what was set up, and that it can all be changed", () => {
    const state = answer(startOnboarding(), {
      areas: ["water"],
      firstHabit: "Stretch",
      waterGoalMl: 2000,
    });
    const lines = completionSummary(state);

    expect(lines.join(" ")).toContain("1 area switched on");
    expect(lines.join(" ")).toContain("Stretch");
    expect(lines[lines.length - 1]).toContain("changed in settings");
  });
});

describe("whether to run at all", () => {
  it("runs for a new user and not for a returning one", () => {
    expect(needsOnboarding(resolvePreferences())).toBe(true);
    expect(
      needsOnboarding(resolvePreferences({ onboardingCompleted: true }))
    ).toBe(false);
  });
});
