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
  // The local calendar day; toISOString() would name yesterday for anyone
  // east of UTC before their midnight reached Greenwich.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const cadenceMonths: Record<string, number> = {
  Monthly: 1,
  "Every 3 months": 3,
  "Every 6 months": 6,
  Yearly: 12,
};

/** The next review date implied by a cadence, counted from the day the
 * review happened — so a late review doesn't compound into the next one. */
export function nextSecurityReviewDate(cadence: string, from = new Date()) {
  const months = cadenceMonths[cadence] ?? 3;
  const next = new Date(from.getFullYear(), from.getMonth() + months, from.getDate(), 12);
  // Clamp a 31st to the target month's last day rather than rolling over.
  if (next.getDate() !== from.getDate()) next.setDate(0);
  return localDateKey(next);
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
