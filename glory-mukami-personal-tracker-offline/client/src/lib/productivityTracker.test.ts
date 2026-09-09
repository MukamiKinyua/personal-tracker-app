import { describe, expect, it } from "vitest";
import { focusSummary, type FocusSession } from "./productivityTracker";

describe("productivity tracker helpers", () => {
  it("summarises the local seven-day focus window", () => {
    const sessions: FocusSession[] = [
      {
        id: "1",
        date: "2026-08-25",
        minutes: 25,
        taskId: "task",
        taskLabel: "Draft outline",
        nextStep: "Review notes",
        outcome: "completed",
      },
      {
        id: "2",
        date: "2026-08-20",
        minutes: 45,
        taskId: "task",
        taskLabel: "Draft outline",
        nextStep: "Review notes",
        outcome: "continued",
      },
      {
        id: "3",
        date: "2026-08-18",
        minutes: 60,
        taskId: "task",
        taskLabel: "Draft outline",
        nextStep: "Review notes",
        outcome: "next-step",
      },
    ];
    expect(focusSummary(sessions, "2026-08-25")).toEqual({
      sessions: 2,
      minutes: 70,
      completed: 1,
    });
  });
});
