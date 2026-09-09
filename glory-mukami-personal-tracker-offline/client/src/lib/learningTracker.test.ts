import { describe, expect, it } from "vitest";
import { learningPracticeSummary, mostRecentPractice } from "./learningTracker";

const skills = [
  {
    id: "language",
    logs: [
      { date: "2026-08-26", minutes: 20, note: "Phrases" },
      { date: "2026-08-24", minutes: 15, note: "Review" },
    ],
  },
  { id: "drawing", logs: [{ date: "2026-08-25", minutes: 30, note: "Study" }] },
];

describe("learning practice helpers", () => {
  it("summarises only user-recorded practice by factual time window", () => {
    expect(learningPracticeSummary(skills, new Date(2026, 7, 26))).toEqual({
      sessions: 3,
      minutes: 65,
      todayMinutes: 20,
      weekMinutes: 65,
    });
  });

  it("finds the skill with the most recent local practice", () => {
    expect(mostRecentPractice(skills)?.id).toBe("language");
  });
});
