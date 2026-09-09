import { describe, expect, it } from "vitest";
import type { ScopeTotal } from "./aggregate";
import {
  answerPrompt,
  buildReview,
  createReviewEntry,
  describeChange,
  dueReviews,
  hasContent,
  previousWindow,
  REVIEW_PERIODS,
  REVIEW_PROMPTS,
  reviewWindow,
  windowLabel,
} from "./reviews";

const TODAY = "2026-03-14";

function total(scope: string, count: number): ScopeTotal {
  return { scope, count, activeDays: count };
}

describe("review windows", () => {
  it("anchors to real calendar boundaries", () => {
    expect(reviewWindow("daily", TODAY)).toMatchObject({
      from: TODAY,
      to: TODAY,
    });
    // 2026-03-14 is a Saturday; a Monday-start week runs the 9th to the 15th.
    expect(reviewWindow("weekly", TODAY, 1)).toMatchObject({
      from: "2026-03-09",
      to: "2026-03-15",
    });
    expect(reviewWindow("monthly", TODAY)).toMatchObject({
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(reviewWindow("quarterly", TODAY)).toMatchObject({
      from: "2026-01-01",
      to: "2026-03-31",
    });
    expect(reviewWindow("yearly", TODAY)).toMatchObject({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("gets the right quarter for each month", () => {
    expect(reviewWindow("quarterly", "2026-05-20").from).toBe("2026-04-01");
    expect(reviewWindow("quarterly", "2026-08-01").from).toBe("2026-07-01");
    expect(reviewWindow("quarterly", "2026-12-31")).toMatchObject({
      from: "2026-10-01",
      to: "2026-12-31",
    });
  });

  it("handles February in a leap year", () => {
    expect(reviewWindow("monthly", "2024-02-10").to).toBe("2024-02-29");
    expect(reviewWindow("monthly", "2026-02-10").to).toBe("2026-02-28");
  });

  it("honours the configured week start", () => {
    expect(reviewWindow("weekly", TODAY, 0).from).toBe("2026-03-08");
  });

  it("steps back a whole window at a time", () => {
    const week = reviewWindow("weekly", TODAY, 1);
    expect(previousWindow(week, 1)).toMatchObject({
      from: "2026-03-02",
      to: "2026-03-08",
    });

    const month = reviewWindow("monthly", TODAY);
    expect(previousWindow(month)).toMatchObject({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("labels a single day without a range", () => {
    expect(windowLabel(reviewWindow("daily", TODAY))).not.toContain("–");
    expect(windowLabel(reviewWindow("weekly", TODAY))).toContain("–");
  });
});

describe("building a review", () => {
  it("does not count days that have not happened yet", () => {
    // Reviewing the current week on the Saturday: six days have elapsed.
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [],
    });
    expect(review.window.to).toBe("2026-03-15");
    expect(review.daysElapsed).toBe(6);
  });

  it("counts the whole window once it is in the past", () => {
    const review = buildReview({
      period: "weekly",
      day: "2026-03-02",
      today: TODAY,
      totals: [],
    });
    expect(review.daysElapsed).toBe(7);
  });

  it("reports gaps up to today only", () => {
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [],
      recordedDays: ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12"],
    });
    // The 13th and 14th are missing; the 15th has not happened.
    expect(review.gaps).toEqual(["2026-03-13", "2026-03-14"]);
  });

  it("surfaces only unfinished items due inside the window", () => {
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [],
      unfinished: [
        { id: "in", title: "In window", dueDay: "2026-03-10" },
        { id: "out", title: "Outside", dueDay: "2026-02-01" },
        { id: "undated", title: "No date" },
      ],
    });
    expect(review.unfinished.map(item => item.id)).toEqual(["in"]);
  });

  it("offers prompts for the period, and they are optional", () => {
    const review = buildReview({
      period: "monthly",
      day: TODAY,
      today: TODAY,
      totals: [],
    });
    expect(review.prompts).toEqual(REVIEW_PROMPTS.monthly);
    expect(review.prompts.length).toBeGreaterThan(0);
  });

  it("never produces a score for the user's life", () => {
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [total("water", 12), total("habit", 5)],
    });
    // The requirement rules out an automatic overall rating.
    expect(review).not.toHaveProperty("score");
    expect(review).not.toHaveProperty("rating");
    expect(review).not.toHaveProperty("grade");
  });
});

describe("comparing with the previous window", () => {
  it("reports a plain difference per scope", () => {
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [total("water", 12)],
      previousTotals: [total("water", 8)],
    });
    expect(review.changes).toEqual([
      { scope: "water", current: 12, previous: 8, delta: 4 },
    ]);
  });

  it("treats a scope absent last time as zero", () => {
    const review = buildReview({
      period: "weekly",
      day: TODAY,
      today: TODAY,
      totals: [total("focus", 3)],
      previousTotals: [],
    });
    expect(review.changes[0].previous).toBe(0);
  });

  it("describes a change without ranking it", () => {
    expect(
      describeChange({ scope: "water", current: 12, previous: 8, delta: 4 })
    ).toBe("4 more than last time");
    expect(
      describeChange({ scope: "water", current: 4, previous: 8, delta: -4 })
    ).toBe("4 fewer than last time");
    expect(
      describeChange({ scope: "water", current: 8, previous: 8, delta: 0 })
    ).toBe("the same as last time");

    const wording = describeChange({
      scope: "water",
      current: 4,
      previous: 8,
      delta: -4,
    });
    expect(wording.toLowerCase()).not.toMatch(/worse|dropped|slipped|failed/);
  });
});

describe("review entries", () => {
  it("starts empty and stays empty until the user writes something", () => {
    const entry = createReviewEntry(reviewWindow("weekly", TODAY));
    expect(hasContent(entry)).toBe(false);

    const blank = answerPrompt(entry, "What went well?", "   ");
    expect(hasContent(blank)).toBe(false);

    const written = answerPrompt(
      entry,
      "What went well?",
      "The quiet mornings."
    );
    expect(hasContent(written)).toBe(true);
  });

  it("keeps one entry per window", () => {
    const a = createReviewEntry(reviewWindow("weekly", TODAY));
    const b = createReviewEntry(reviewWindow("weekly", "2026-03-15"));
    // Both days fall in the same week.
    expect(a.id).toBe(b.id);
  });

  it("counts a conclusion as content", () => {
    const entry = createReviewEntry(reviewWindow("daily", TODAY));
    expect(hasContent({ ...entry, conclusion: "A slow but decent day." })).toBe(
      true
    );
  });
});

describe("which reviews are due", () => {
  it("offers every review to someone who has never done one", () => {
    expect(dueReviews(TODAY)).toEqual(REVIEW_PERIODS);
  });

  it("stops offering one that was completed for the last closed window", () => {
    // The week just gone began on 2026-03-02.
    const due = dueReviews(TODAY, { weekly: "2026-03-02" }, 1);
    expect(due).not.toContain("weekly");
    expect(due).toContain("monthly");
  });
});
