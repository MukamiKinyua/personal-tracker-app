import { describe, expect, it } from "vitest";
import {
  examDueStatus,
  nextAcademicItem,
  weeklyRevisionMinutes,
  weightedStanding,
} from "./academicTracker";

describe("academic planning helpers", () => {
  it("calculates a factual weighted standing only from graded components", () => {
    expect(
      weightedStanding([
        { id: "a", name: "Quiz", weight: 20, score: 80 },
        { id: "b", name: "Essay", weight: 30, score: 60 },
        { id: "c", name: "Exam", weight: 50, score: null },
      ])
    ).toBe(68);
  });

  it("finds the next unfinished academic item and describes exam timing", () => {
    expect(
      nextAcademicItem([
        { id: "late", label: "Later", due: "2026-09-04", done: false },
        { id: "early", label: "Earlier", due: "2026-08-27", done: false },
      ])?.id
    ).toBe("early");
    expect(examDueStatus("2026-08-27", "2026-08-25")).toBe("2 days to go");
  });

  it("totals revision time for the factual rolling seven-day view", () => {
    expect(
      weeklyRevisionMinutes(
        [
          {
            id: "1",
            date: "2026-08-25",
            minutes: 30,
            method: "Practice",
            note: "",
          },
          {
            id: "2",
            date: "2026-08-19",
            minutes: 45,
            method: "Recall",
            note: "",
          },
          {
            id: "3",
            date: "2026-08-18",
            minutes: 60,
            method: "Review",
            note: "",
          },
        ],
        "2026-08-25"
      )
    ).toBe(75);
  });
});
