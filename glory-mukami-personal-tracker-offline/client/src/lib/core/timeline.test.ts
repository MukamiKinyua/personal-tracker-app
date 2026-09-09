import { describe, expect, it } from "vitest";
import {
  buildDayRecap,
  buildTimeline,
  emptyRecapMessage,
  entriesOnDay,
  recordedDays,
  toTimelineEntries,
  type TimelineEntry,
} from "./timeline";

const TZ = "Africa/Nairobi";

function entry(
  over: Partial<TimelineEntry> & { id: string; at: string }
): TimelineEntry {
  return { scope: "task", title: over.id, ...over };
}

describe("building entries", () => {
  it("renders the clock time in the user's zone", () => {
    const [built] = toTimelineEntries({
      records: [{ id: "w1", at: "2026-03-14T05:30:00.000Z" }],
      scope: "workout",
      timezone: TZ,
      id: r => r.id,
      title: () => "Morning workout",
      at: r => r.at,
    });
    // 05:30 UTC is 08:30 in Nairobi.
    expect(built.time).toBe("08:30");
    expect(built.id).toBe("workout:w1");
  });

  it("carries a duration when the thing lasted", () => {
    const [built] = toTimelineEntries({
      records: [{ id: "f1", at: "2026-03-14T09:00:00.000Z", minutes: 25 }],
      scope: "focus",
      timezone: TZ,
      id: r => r.id,
      title: () => "Focus",
      at: r => r.at,
      durationMinutes: r => r.minutes,
    });
    expect(built.durationMinutes).toBe(25);
  });
});

describe("the timeline", () => {
  const entries = [
    entry({ id: "lunch", at: "2026-03-14T09:30:00.000Z" }),
    entry({ id: "school", at: "2026-03-14T05:00:00.000Z" }),
    entry({ id: "yesterday", at: "2026-03-13T05:00:00.000Z" }),
  ];

  it("puts the newest day first", () => {
    const days = buildTimeline({ entries, timezone: TZ });
    expect(days.map(d => d.day)).toEqual(["2026-03-14", "2026-03-13"]);
  });

  it("reads each day forwards, from morning", () => {
    const [today] = buildTimeline({ entries, timezone: TZ });
    expect(today.entries.map(e => e.id)).toEqual(["school", "lunch"]);
  });

  it("labels the day in words", () => {
    const [today] = buildTimeline({ entries, timezone: TZ });
    expect(today.label).toContain("March");
  });

  it("files a late entry under the local day, not the UTC one", () => {
    // 21:30 UTC is 00:30 the next morning in Nairobi.
    const late = [entry({ id: "late", at: "2026-03-14T21:30:00.000Z" })];
    expect(buildTimeline({ entries: late, timezone: TZ })[0].day).toBe(
      "2026-03-15"
    );
    expect(buildTimeline({ entries: late, timezone: "UTC" })[0].day).toBe(
      "2026-03-14"
    );
  });

  it("can be bounded to a range", () => {
    const days = buildTimeline({
      entries,
      timezone: TZ,
      from: "2026-03-14",
      to: "2026-03-14",
    });
    expect(days).toHaveLength(1);
  });

  it("lists the days that hold something, newest first", () => {
    expect(recordedDays(entries, TZ)).toEqual(["2026-03-14", "2026-03-13"]);
  });

  it("returns nothing for a day with no entries", () => {
    expect(entriesOnDay(entries, "2026-01-01", TZ)).toEqual([]);
  });
});

describe("the day recap", () => {
  const entries = [
    entry({ id: "w", scope: "workout", at: "2026-03-14T06:00:00.000Z" }),
    entry({ id: "t1", scope: "task", at: "2026-03-14T07:00:00.000Z" }),
    entry({ id: "t2", scope: "task", at: "2026-03-14T08:00:00.000Z" }),
    entry({ id: "wa", scope: "water", at: "2026-03-14T09:00:00.000Z" }),
    entry({ id: "j", scope: "reflection", at: "2026-03-14T18:00:00.000Z" }),
  ];

  it("says what happened in the user's terms", () => {
    const recap = buildDayRecap({ entries, day: "2026-03-14", timezone: TZ });
    expect(recap.lines).toContain("You worked out.");
    expect(recap.lines).toContain("You completed 2 tasks.");
    expect(recap.lines).toContain("You logged your water.");
    expect(recap.lines).toContain("You wrote a journal entry.");
  });

  it("sums durations into the sentence", () => {
    const focus = [
      entry({
        id: "f1",
        scope: "focus",
        at: "2026-03-14T06:00:00.000Z",
        durationMinutes: 25,
      }),
      entry({
        id: "f2",
        scope: "focus",
        at: "2026-03-14T08:00:00.000Z",
        durationMinutes: 50,
      }),
    ];
    const recap = buildDayRecap({
      entries: focus,
      day: "2026-03-14",
      timezone: TZ,
    });
    expect(recap.lines).toContain("You focused for 1h 15m across 2 sessions.");
  });

  it("never mentions what the user did not log", () => {
    const recap = buildDayRecap({ entries, day: "2026-03-14", timezone: TZ });
    const text = recap.lines.join(" ").toLowerCase();
    // A closing ritual that lists your omissions is one nobody repeats.
    expect(text).not.toMatch(
      /did not|didn't|missing|forgot|no sleep|remember to/
    );
  });

  it("closes with a question rather than a verdict", () => {
    const recap = buildDayRecap({ entries, day: "2026-03-14", timezone: TZ });
    expect(recap.question).toBe("How did today feel?");
    expect(recap.lines.join(" ").toLowerCase()).not.toMatch(
      /good day|bad day|productive|well done/
    );
  });

  it("handles an unknown scope without inventing wording", () => {
    const odd = [
      entry({ id: "x", scope: "gardening", at: "2026-03-14T09:00:00.000Z" }),
    ];
    const recap = buildDayRecap({
      entries: odd,
      day: "2026-03-14",
      timezone: TZ,
    });
    expect(recap.lines).toEqual(["You recorded 1 gardening entry."]);
  });

  it("treats an empty day as allowed", () => {
    const recap = buildDayRecap({
      entries: [],
      day: "2026-03-14",
      timezone: TZ,
    });
    expect(recap.isEmpty).toBe(true);
    expect(recap.lines).toEqual([]);
    expect(emptyRecapMessage()).toContain("That is allowed too");
  });
});
