import { describe, expect, it } from "vitest";
import {
  factualGoalProgress,
  goalStateSummary,
  reviewGoals,
} from "./goalTracker";

describe("goalTracker", () => {
  it("uses completed milestones for factual progress when milestones exist", () => {
    expect(
      factualGoalProgress(
        [
          { id: "a", title: "Outline", done: true },
          { id: "b", title: "Draft", done: false },
          { id: "c", title: "Review", done: true },
        ],
        15
      )
    ).toBe(67);
  });

  it("keeps manual progress bounded for goals without milestones", () => {
    expect(factualGoalProgress([], 124)).toBe(100);
    expect(factualGoalProgress([], -4)).toBe(0);
  });

  it("separates active goals from local review states", () => {
    const goals = [
      {
        id: "a",
        title: "One",
        state: "active" as const,
        manualProgress: 0,
        milestones: [],
      },
      {
        id: "b",
        title: "Two",
        state: "paused" as const,
        manualProgress: 0,
        milestones: [],
      },
      {
        id: "c",
        title: "Three",
        state: "completed" as const,
        manualProgress: 0,
        milestones: [],
      },
    ];
    expect(goalStateSummary(goals)).toEqual({
      active: 1,
      paused: 1,
      completed: 1,
      archived: 0,
    });
    expect(reviewGoals(goals).map(goal => goal.id)).toEqual(["b", "c"]);
  });
});
