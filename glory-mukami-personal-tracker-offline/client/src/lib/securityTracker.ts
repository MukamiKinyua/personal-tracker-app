export type SecurityReviewStatus =
  | "No date"
  | "Review window"
  | "Later"
  | "Past date";

export type SecurityReviewRecord = {
  reviewDate: string;
  state: "Review now" | "In progress" | "Reviewed" | "Archived";
};

export type SecurityReviewLog = { date: string; note: string };

function localDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function securityReviewStatus(
  reviewDate: string,
  now = new Date()
): SecurityReviewStatus {
  if (!reviewDate) return "No date";
  const today = localDateKey(now);
  if (reviewDate < today) return "Past date";
  const reviewWindow = new Date(now);
  reviewWindow.setDate(reviewWindow.getDate() + 30);
  if (reviewDate <= localDateKey(reviewWindow)) return "Review window";
  return "Later";
}

export function securityReviewSummary(
  records: SecurityReviewRecord[],
  now = new Date()
) {
  return records.reduce(
    (summary, record) => {
      if (record.state === "Archived") {
        summary.archived += 1;
        return summary;
      }
      if (record.state === "Reviewed") {
        summary.reviewed += 1;
        return summary;
      }
      const status = securityReviewStatus(record.reviewDate, now);
      if (
        status === "Past date" ||
        status === "Review window" ||
        status === "No date"
      )
        summary.reviewNow += 1;
      else summary.later += 1;
      return summary;
    },
    { reviewNow: 0, later: 0, reviewed: 0, archived: 0 }
  );
}

export function appendSecurityReviewLog(
  log: SecurityReviewLog[],
  note: string,
  now = new Date()
): SecurityReviewLog[] {
  const cleanNote = note.trim() || "Marked reviewed locally.";
  return [...log, { date: localDateKey(now), note: cleanNote }];
}
