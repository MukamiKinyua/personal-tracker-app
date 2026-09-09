import { describe, expect, it } from "vitest";
import {
  addPracticeSession,
  adjustManualCountdown,
  activePageAfterNavigation,
  renameNamedEntry,
  reflectionCarryForward,
  resolveJournalView,
  saveReflectionEntry,
  estimateCycle,
  formatHistoryActivityMetric,
  toggleDailySlotFill,
  toggleNamedCompletion,
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
  it("adds and clears an exact daily portrait fill", () => {
    const filled = toggleDailySlotFill({}, 8, "#d238a4");
    expect(filled).toEqual({ 8: "#d238a4" });
    expect(toggleDailySlotFill(filled, 8, "#d238a4")).toEqual({});
  });

  it("toggles the quick-add panel visibility", () => {
    expect(toggleQuickAddVisibility(false)).toBe(true);
    expect(toggleQuickAddVisibility(true)).toBe(false);
  });

  it("adjusts a manual local focus countdown without dropping below zero", () => {
    expect(adjustManualCountdown(60, -5)).toBe(55);
    expect(adjustManualCountdown(3, -5)).toBe(0);
  });

  it("logs and reverses a named workout completion", () => {
    expect(toggleNamedCompletion({}, "Bicycle crunches")).toEqual({
      "Bicycle crunches": true,
    });
    expect(
      toggleNamedCompletion({ "Bicycle crunches": true }, "Bicycle crunches")
    ).toEqual({ "Bicycle crunches": false });
  });

  it("renames just the selected existing entry", () => {
    expect(
      renameNamedEntry(
        [
          { title: "Plan study", done: false },
          { title: "Walk", done: true },
        ],
        0,
        "Plan focused study"
      )
    ).toEqual([
      { title: "Plan focused study", done: false },
      { title: "Walk", done: true },
    ]);
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
    expect(updated.progress).toBe(28);
    expect(updated.logs).toEqual([
      {
        date: "2026-08-24",
        minutes: 40,
        note: "Practised conditional phrases.",
      },
    ]);
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
    });
    expect(estimate?.wording).toBe("Estimated from limited cycle history.");
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
