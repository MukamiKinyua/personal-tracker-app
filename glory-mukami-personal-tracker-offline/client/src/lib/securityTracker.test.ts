import { describe, expect, it } from "vitest";
import {
  appendSecurityReviewLog,
  securityReviewStatus,
  securityReviewSummary,
} from "./securityTracker";

describe("securityTracker", () => {
  const now = new Date("2026-08-26T09:00:00Z");

  it("labels locally entered review dates without making a security claim", () => {
    expect(securityReviewStatus("", now)).toBe("No date");
    expect(securityReviewStatus("2026-08-20", now)).toBe("Past date");
    expect(securityReviewStatus("2026-09-04", now)).toBe("Review window");
    expect(securityReviewStatus("2026-11-01", now)).toBe("Later");
  });

  it("summarises only the local review states and dates", () => {
    expect(
      securityReviewSummary(
        [
          { reviewDate: "", state: "Review now" },
          { reviewDate: "2026-10-01", state: "In progress" },
          { reviewDate: "2026-08-20", state: "Reviewed" },
          { reviewDate: "2026-08-20", state: "Archived" },
        ],
        now
      )
    ).toEqual({ reviewNow: 1, later: 1, reviewed: 1, archived: 1 });
  });

  it("adds only a dated local note when a review is completed", () => {
    expect(
      appendSecurityReviewLog([], "Reviewed sharing choices", now)
    ).toEqual([{ date: "2026-08-26", note: "Reviewed sharing choices" }]);
    expect(appendSecurityReviewLog([], "", now)).toEqual([
      { date: "2026-08-26", note: "Marked reviewed locally." },
    ]);
  });
});

describe("next review scheduling", () => {
  it("advances by the cadence from the review day and clamps month ends", async () => {
    const { nextSecurityReviewDate } = await import("./securityTracker");
    expect(nextSecurityReviewDate("Every 3 months", new Date(2026, 8, 13))).toBe("2026-12-13");
    expect(nextSecurityReviewDate("Monthly", new Date(2026, 0, 31))).toBe("2026-02-28");
    expect(nextSecurityReviewDate("Yearly", new Date(2026, 8, 13))).toBe("2027-09-13");
  });
});
