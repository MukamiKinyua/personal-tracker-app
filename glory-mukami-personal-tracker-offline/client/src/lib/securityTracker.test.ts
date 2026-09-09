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
