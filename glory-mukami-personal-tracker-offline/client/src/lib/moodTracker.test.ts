import { describe, expect, it } from "vitest";
import {
  moodPatternSummary,
  toggleMoodContext,
  type MoodEntry,
} from "./moodTracker";

const entries: MoodEntry[] = [
  {
    id: "1",
    date: "2026-08-25",
    mood: "Steady",
    energy: 3,
    note: "",
    contexts: [],
  },
  {
    id: "2",
    date: "2026-08-24",
    mood: "Bright",
    energy: 4,
    note: "",
    contexts: ["Outside time"],
  },
  {
    id: "3",
    date: "2026-08-23",
    mood: "Steady",
    energy: 2,
    note: "",
    contexts: ["Rest"],
  },
];

describe("mood tracker helpers", () => {
  it("adds and removes optional local context tags", () => {
    expect(toggleMoodContext(["Rest"], "People")).toEqual(["Rest", "People"]);
    expect(toggleMoodContext(["Rest", "People"], "Rest")).toEqual(["People"]);
  });

  it("summarises the latest check-ins without making health claims", () => {
    expect(moodPatternSummary(entries)).toEqual({
      count: 3,
      commonMood: "Steady",
      averageEnergy: 3,
    });
    expect(moodPatternSummary([])).toBeNull();
  });
});
