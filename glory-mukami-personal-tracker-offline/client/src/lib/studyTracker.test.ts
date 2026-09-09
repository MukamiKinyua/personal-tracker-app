import { describe, expect, it } from "vitest";
import {
  formatStudyTimer,
  studyTimeSummary,
  type StudySessionRecord,
} from "./studyTracker";

describe("study session helpers", () => {
  it("formats the active timer consistently", () => {
    expect(formatStudyTimer(1505)).toBe("25:05");
    expect(formatStudyTimer(-4)).toBe("00:00");
  });

  it("summarises local daily and seven-day study time", () => {
    const sessions: StudySessionRecord[] = [
      {
        id: "1",
        date: "2026-08-25",
        minutes: 25,
        topic: "Trees",
        contextType: "Exam",
        contextName: "Algorithms",
        method: "Practice questions",
        outcome: "Finished",
        nextStep: "",
        interruption: "",
      },
      {
        id: "2",
        date: "2026-08-22",
        minutes: 45,
        topic: "ERD",
        contextType: "Assignment",
        contextName: "Database brief",
        method: "Active recall",
        outcome: "Continue later",
        nextStep: "",
        interruption: "",
      },
      {
        id: "3",
        date: "2026-08-18",
        minutes: 60,
        topic: "Old",
        contextType: "Course",
        contextName: "History",
        method: "Reading",
        outcome: "Finished",
        nextStep: "",
        interruption: "",
      },
    ];
    expect(studyTimeSummary(sessions, "2026-08-25")).toEqual({
      todayMinutes: 25,
      weekMinutes: 70,
      dominantContext: "Assignment",
    });
  });
});
