export type RenewalState =
  | "Not started"
  | "In progress"
  | "Renewed"
  | "Archived";
import type { FileRef } from "./fileRefs";

export type DocumentAttachment = {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};
export type RenewalRecord = {
  id: string;
  title: string;
  type: string;
  reviewDate: string;
  reviewWindow: string;
  nextAction: string;
  note: string;
  state: RenewalState;
  renewals: string[];
  /** Uploaded to the server before files were kept on the device. */
  attachment?: DocumentAttachment;
  /** Documents and photos, stored on this device and backed up to the account. */
  attachments?: FileRef[];
};
export type DocumentReviewStatus =
  | "No date"
  | "Past due"
  | "Approaching"
  | "Upcoming"
  | "Renewed"
  | "Archived";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function documentReviewStatus(
  record: RenewalRecord,
  reference = new Date()
): DocumentReviewStatus {
  if (record.state === "Archived") return "Archived";
  if (record.state === "Renewed") return "Renewed";
  if (!record.reviewDate) return "No date";
  const days = Math.round(
    (startOfDay(new Date(`${record.reviewDate}T12:00:00`)).getTime() -
      startOfDay(reference).getTime()) /
      86_400_000
  );
  if (days < 0) return "Past due";
  if (days <= 30) return "Approaching";
  return "Upcoming";
}

export function sortDocumentsForReview(
  records: RenewalRecord[],
  reference = new Date()
) {
  const order: Record<DocumentReviewStatus, number> = {
    "Past due": 0,
    Approaching: 1,
    "No date": 2,
    Upcoming: 3,
    Renewed: 4,
    Archived: 5,
  };
  return [...records].sort((a, b) => {
    const statusDifference =
      order[documentReviewStatus(a, reference)] -
      order[documentReviewStatus(b, reference)];
    if (statusDifference !== 0) return statusDifference;
    return (a.reviewDate || "9999-12-31").localeCompare(
      b.reviewDate || "9999-12-31"
    );
  });
}

export function documentReviewSummary(
  records: RenewalRecord[],
  reference = new Date()
) {
  return records.reduce(
    (summary, record) => {
      const status = documentReviewStatus(record, reference);
      if (status === "Past due") summary.pastDue += 1;
      if (status === "Approaching") summary.approaching += 1;
      if (status === "Upcoming") summary.upcoming += 1;
      if (status === "No date") summary.noDate += 1;
      if (status === "Renewed") summary.renewed += 1;
      if (status === "Archived") summary.archived += 1;
      return summary;
    },
    {
      pastDue: 0,
      approaching: 0,
      upcoming: 0,
      noDate: 0,
      renewed: 0,
      archived: 0,
    }
  );
}
