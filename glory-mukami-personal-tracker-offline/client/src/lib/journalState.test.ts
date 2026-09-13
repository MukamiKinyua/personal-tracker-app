import { describe, expect, it } from "vitest";
import {
  addPracticeSession,
  practiceProgress,
  practiceTotals,
  activePageAfterNavigation,
  reflectionCarryForward,
  resolveJournalView,
  saveReflectionEntry,
  estimateCycle,
  formatHistoryActivityMetric,
  toggleQuickAddVisibility,
} from "./journalState";

describe("journal view selection", () => {
  it("opens a supported page requested in the journal URL", () => {
    expect(resolveJournalView("?view=workouts")).toBe("workouts");
  });

  it("falls back to the cover for an unknown requested page", () => {
    expect(resolveJournalView("?view=missing-page")).toBe("cover");
  });

  it("keeps the last active destination while visiting cover and contents", () => {
    expect(activePageAfterNavigation("assignments", "contents")).toBe(
      "assignments"
    );
    expect(activePageAfterNavigation("assignments", "learning")).toBe(
      "learning"
    );
  });
});

describe("journal prototype interactions", () => {
  it("toggles the quick-add panel visibility", () => {
    expect(toggleQuickAddVisibility(false)).toBe(true);
    expect(toggleQuickAddVisibility(true)).toBe(false);
  });

  it("adds a dated practice session with duration and note to the selected skill history", () => {
    const updated = addPracticeSession(
      { practice: 3, progress: 24, logs: [] },
      {
        date: "2026-08-24",
        minutes: 40,
        note: "Practised conditional phrases.",
      }
    );

    expect(updated.practice).toBe(4);
    // A logged session is evidence of practice, not of progress; the
    // estimate the user typed stays exactly what they typed.
    expect(updated.progress).toBe(24);
    expect(updated.logs).toEqual([
      {
        date: "2026-08-24",
        minutes: 40,
        note: "Practised conditional phrases.",
      },
    ]);
  });

  it("derives progress from milestones when any exist, else uses the estimate", () => {
    expect(practiceProgress({ practice: 0, progress: 37, logs: [] })).toEqual({
      source: "estimate",
      percent: 37,
    });
    expect(
      practiceProgress({
        practice: 0,
        progress: 37,
        logs: [],
        milestones: [
          { id: "a", label: "Read chapter 1", done: true },
          { id: "b", label: "Build a demo", done: true },
          { id: "c", label: "Teach it to someone", done: false },
        ],
      })
    ).toEqual({ source: "milestones", percent: 67, done: 2, total: 3 });
  });

  it("totals practice minutes and finds the most recent date", () => {
    expect(
      practiceTotals({
        practice: 2,
        progress: 0,
        logs: [
          { date: "2026-08-20", minutes: 25, note: "" },
          { date: "2026-08-24", minutes: 40, note: "" },
        ],
      })
    ).toEqual({ sessions: 2, minutes: 65, lastDate: "2026-08-24" });
  });

  it("saves complete structured weekly and monthly reflection fields", () => {
    const weekly = saveReflectionEntry([], {
      period: "weekly",
      date: "2026-08-24",
      fields: {
        highlights: "Finished my project",
        challenges: "Needed more rest",
        notes: "Energy rose after walking",
        intentions: "Protect Friday evening",
      },
    });
    const both = saveReflectionEntry(weekly, {
      period: "monthly",
      date: "2026-08-24",
      fields: {
        progress: "Three skills advanced",
        highlights: "Shared my art",
        lessons: "Pace matters",
        gratitude: "For my friends",
        intentions: "Practise gently",
      },
    });

    expect(both).toHaveLength(2);
    expect(both[0]?.fields.gratitude).toBe("For my friends");
    expect(both[1]?.fields.intentions).toBe("Protect Friday evening");
  });

  it("builds a concise monthly carry-forward from recent weekly reflections", () => {
    const entries = saveReflectionEntry(
      saveReflectionEntry([], {
        period: "weekly",
        date: "2026-08-11",
        fields: { highlights: "Finished a painting" },
      }),
      {
        period: "weekly",
        date: "2026-08-18",
        fields: { notes: "Evenings were calmer" },
      }
    );
    expect(reflectionCarryForward(entries)).toEqual([
      { date: "2026-08-18", text: "Evenings were calmer" },
      { date: "2026-08-11", text: "Finished a painting" },
    ]);
  });

  it("labels shared History activity by the recorded activity type", () => {
    expect(formatHistoryActivityMetric("Productivity", 25)).toBe("25 min");
    expect(formatHistoryActivityMetric("Learning", 40)).toBe("40 min");
    expect(formatHistoryActivityMetric("Sleep", 7.5)).toBe("7.5 h");
    expect(formatHistoryActivityMetric("Habits", 1)).toBe("completion");
    expect(formatHistoryActivityMetric("Reflections", 1)).toBe("reflection");
  });

  it("calculates cycle phase, next period, and limited-history wording from recorded entries", () => {
    const estimate = estimateCycle(
      [{ start: "2026-08-03" }, { start: "2026-07-06" }],
      new Date("2026-08-10T12:00:00")
    );
    expect(estimate).toMatchObject({
      cycleDay: 8,
      phase: "Follicular",
      estimatedNextPeriod: "2026-08-31",
      averageCycle: 28,
      averagePeriodLength: 5,
      cyclesUsed: 1,
    });
    expect(estimate?.wording).toBe("Estimated from limited cycle history.");
  });

  it("averages logged period lengths when entries have an end date", () => {
    const estimate = estimateCycle(
      [
        { start: "2026-08-03", end: "2026-08-06" },
        { start: "2026-07-06", end: "2026-07-11" },
      ],
      new Date("2026-08-10T12:00:00")
    );
    // 4 days and 6 days, so 5 on average.
    expect(estimate?.averagePeriodLength).toBe(5);
  });

  it("uses variability-aware wording when recorded cycle intervals differ", () => {
    const estimate = estimateCycle(
      [
        { start: "2026-08-03" },
        { start: "2026-07-02" },
        { start: "2026-05-20" },
      ],
      new Date("2026-08-10T12:00:00")
    );
    expect(estimate?.wording).toBe("Estimated from a variable cycle pattern.");
  });
});
