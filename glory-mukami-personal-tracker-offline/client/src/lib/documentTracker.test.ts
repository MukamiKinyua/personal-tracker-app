import { describe, expect, it } from "vitest";
import {
  documentReviewStatus,
  documentReviewSummary,
  sortDocumentsForReview,
  type RenewalRecord,
} from "./documentTracker";

const reference = new Date(2026, 7, 26);
const records: RenewalRecord[] = [
  {
    id: "later",
    title: "Passport",
    type: "Identity",
    reviewDate: "2026-11-01",
    reviewWindow: "30 days before",
    nextAction: "",
    note: "",
    state: "Not started",
    renewals: [],
  },
  {
    id: "soon",
    title: "Student card",
    type: "Education",
    reviewDate: "2026-09-05",
    reviewWindow: "30 days before",
    nextAction: "",
    note: "",
    state: "In progress",
    renewals: [],
  },
  {
    id: "past",
    title: "Warranty",
    type: "Home",
    reviewDate: "2026-08-01",
    reviewWindow: "30 days before",
    nextAction: "",
    note: "",
    state: "Not started",
    renewals: [],
  },
  {
    id: "none",
    title: "Reference",
    type: "Other",
    reviewDate: "",
    reviewWindow: "Review when ready",
    nextAction: "",
    note: "",
    state: "Not started",
    renewals: [],
  },
];

describe("document renewal helpers", () => {
  it("derives factual review status from user-entered date and local state", () => {
    expect(documentReviewStatus(records[0], reference)).toBe("Upcoming");
    expect(documentReviewStatus(records[1], reference)).toBe("Approaching");
    expect(documentReviewStatus(records[2], reference)).toBe("Past due");
    expect(documentReviewStatus(records[3], reference)).toBe("No date");
  });

  it("sorts renewal work by factual urgency and summarises local records", () => {
    expect(
      sortDocumentsForReview(records, reference).map(record => record.id)
    ).toEqual(["past", "soon", "none", "later"]);
    expect(documentReviewSummary(records, reference)).toEqual({
      pastDue: 1,
      approaching: 1,
      upcoming: 1,
      noDate: 1,
      renewed: 0,
      archived: 0,
    });
  });
});
