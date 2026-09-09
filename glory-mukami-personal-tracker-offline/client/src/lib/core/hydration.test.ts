import { describe, expect, it } from "vitest";
import {
  dayPartOf,
  DEFAULT_TARGET_ML,
  hydrationPattern,
  hydrationPatternNote,
  hydrationSummary,
  progress,
  quickAdd,
  remainingMl,
  removeEntry,
  restoreEntry,
  suggestTarget,
  totalMl,
  type WaterEntry,
} from "./hydration";

function addAll(amounts: number[]): WaterEntry[] {
  let entries: WaterEntry[] = [];
  for (const amount of amounts) {
    entries = quickAdd(entries, amount).entries;
  }
  return entries;
}

describe("the additive engine", () => {
  it("accumulates each quick-add into the day's total", () => {
    const entries = addAll([250, 500, 250]);
    expect(totalMl(entries)).toBe(1000);
    expect(remainingMl(entries, DEFAULT_TARGET_ML)).toBe(1000);
  });

  it("gives every entry its own id so one can be undone", () => {
    const entries = addAll([250, 250, 250]);
    expect(new Set(entries.map(e => e.id)).size).toBe(3);
  });

  it("removes exactly the mis-tapped entry and no other of the same size", () => {
    const entries = addAll([250, 250, 500]);
    const after = removeEntry(entries, entries[1].id);
    expect(after).toHaveLength(2);
    expect(totalMl(after)).toBe(750);
  });

  it("restores an undone entry back into time order", () => {
    const entries = addAll([250, 500]);
    const removed = entries[0];
    const after = restoreEntry(removeEntry(entries, removed.id), removed);
    expect(after.map(e => e.id)).toEqual(entries.map(e => e.id));
  });

  it("does not restore the same entry twice", () => {
    const entries = addAll([250]);
    expect(restoreEntry(entries, entries[0])).toHaveLength(1);
  });

  it("rounds and refuses a negative quantity rather than subtracting", () => {
    const { entry } = quickAdd([], -250);
    expect(entry.amountMl).toBe(0);
  });
});

describe("progress towards the target", () => {
  it("reports the percentage", () => {
    expect(progress(addAll([500]), 2000).percent).toBe(25);
  });

  it("does not treat going over the target as an error", () => {
    const state = progress(addAll([2500]), 2000);
    expect(state.overTarget).toBe(true);
    // The bar stays within its track, but the real figure is still available.
    expect(state.percent).toBe(100);
    expect(state.percentRaw).toBe(125);
  });

  it("never divides by a zero or missing target", () => {
    expect(progress(addAll([500]), 0)).toEqual({
      percent: 0,
      percentRaw: 0,
      overTarget: false,
    });
  });

  it("never reports a negative remaining amount", () => {
    expect(remainingMl(addAll([3000]), 2000)).toBe(0);
  });
});

describe("suggesting a higher target after movement", () => {
  it("leaves the target alone on a day with no logged movement", () => {
    const suggestion = suggestTarget({ baseTargetMl: 2000 });
    expect(suggestion).toEqual({ targetMl: 2000, addedMl: 0 });
  });

  it("suggests more after a vigorous session", () => {
    const suggestion = suggestTarget({
      baseTargetMl: 2000,
      movementMinutes: 60,
      intensity: "vigorous",
    });
    expect(suggestion.addedMl).toBe(1000);
    expect(suggestion.targetMl).toBe(3000);
    expect(suggestion.reason).toContain("60 minutes");
  });

  it("scales with how hard the session was", () => {
    const gentle = suggestTarget({ movementMinutes: 30, intensity: "gentle" });
    const vigorous = suggestTarget({
      movementMinutes: 30,
      intensity: "vigorous",
    });
    expect(gentle.addedMl).toBeLessThan(vigorous.addedMl);
  });

  it("returns a suggestion rather than applying it", () => {
    // The caller keeps the decision; the base target is never mutated.
    const base = 2000;
    const suggestion = suggestTarget({
      baseTargetMl: base,
      movementMinutes: 45,
    });
    expect(base).toBe(2000);
    expect(suggestion.targetMl).toBeGreaterThan(base);
  });
});

describe("the summary line", () => {
  it("says plainly when nothing is logged", () => {
    expect(hydrationSummary([], 2000, "ml")).toBe("Nothing logged yet today");
  });

  it("counts down to the target in the user's unit", () => {
    expect(hydrationSummary(addAll([500]), 2000, "ml")).toBe(
      "500 ml — 1500 ml to go"
    );
    expect(hydrationSummary(addAll([500]), 2000, "l")).toBe(
      "0.5 l — 1.5 l to go"
    );
  });

  it("reports passing the target without praise or reproach", () => {
    const line = hydrationSummary(addAll([2500]), 2000, "ml");
    expect(line).toBe("2500 ml — past your 2000 ml target");
    expect(line.toLowerCase()).not.toMatch(/great|well done|too much|failed/);
  });
});

describe("when during the day the water goes in", () => {
  const TZ = "Africa/Nairobi";

  function at(instant: string, amountMl = 250): WaterEntry {
    return { id: instant, amountMl, at: instant, seq: 0 };
  }

  it("buckets by the user's local clock, not UTC", () => {
    // 06:00 UTC is 09:00 in Nairobi — morning, not dawn.
    expect(dayPartOf("2026-03-14T06:00:00.000Z", TZ)).toBe("morning");
    expect(dayPartOf("2026-03-14T06:00:00.000Z", "UTC")).toBe("morning");
    // 21:30 UTC is 00:30 in Nairobi.
    expect(dayPartOf("2026-03-14T21:30:00.000Z", TZ)).toBe("night");
  });

  it("totals each part of the day", () => {
    const pattern = hydrationPattern(
      [
        at("2026-03-14T06:00:00.000Z", 500),
        at("2026-03-14T07:00:00.000Z", 500),
        at("2026-03-14T13:00:00.000Z", 250),
      ],
      TZ
    );
    expect(pattern.byPart.morning).toBe(1000);
    expect(pattern.byPart.afternoon).toBe(250);
    expect(pattern.total).toBe(1250);
  });

  it("names a dominant part only when it holds a clear majority", () => {
    const clear = hydrationPattern(
      [
        at("2026-03-14T06:00:00.000Z", 1500),
        at("2026-03-14T13:00:00.000Z", 250),
      ],
      TZ
    );
    expect(clear.dominant).toBe("morning");

    // An even spread has no winner; naming one would invent a pattern.
    // In Nairobi these land at 09:00, 14:00, 19:00 and 00:00 — one per part.
    const even = hydrationPattern(
      [
        at("2026-03-14T06:00:00.000Z", 250),
        at("2026-03-14T11:00:00.000Z", 250),
        at("2026-03-14T16:00:00.000Z", 250),
        at("2026-03-14T21:00:00.000Z", 250),
      ],
      TZ
    );
    expect(even.dominant).toBeUndefined();
  });

  it("handles a day with nothing logged", () => {
    expect(hydrationPattern([], TZ)).toMatchObject({
      total: 0,
      dominantShare: 0,
    });
  });

  it("says nothing until there are enough entries to be a pattern", () => {
    const few = [
      at("2026-03-14T06:00:00.000Z"),
      at("2026-03-14T07:00:00.000Z"),
    ];
    expect(hydrationPatternNote(few, TZ)).toBeNull();
  });

  it("states the pattern without instructing the user", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      at(`2026-03-${String(index + 1).padStart(2, "0")}T06:00:00.000Z`, 500)
    );
    const note = hydrationPatternNote(many, TZ);

    expect(note).toBe("You tend to drink most of your water before noon.");
    // An observation, not a nag or a target.
    expect(note?.toLowerCase()).not.toMatch(
      /should|try to|drink more|need to|!/
    );
  });
});
