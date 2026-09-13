export type CourseAssessment = {
  id: string;
  name: string;
  weight: number;
  score: number | null;
};
export type CourseMilestone = {
  id: string;
  label: string;
  due: string;
  done: boolean;
};
export type CourseWork = {
  id: string;
  label: string;
  due: string;
  done: boolean;
};

export function weightedStanding(
  assessments: CourseAssessment[]
): number | null {
  const graded = assessments.filter(
    item => item.score !== null && item.weight > 0
  );
  const totalWeight = graded.reduce((total, item) => total + item.weight, 0);
  if (!totalWeight) return null;
  return (
    Math.round(
      (graded.reduce(
        (total, item) => total + (item.score || 0) * item.weight,
        0
      ) /
        totalWeight) *
        10
    ) / 10
  );
}

/**
 * The standing plus what it rests on: how much of the course's total weight
 * has a score yet. "62.5%" from one 10% quiz is a different fact from
 * "62.5%" across 80% of the course, and the number alone hides which.
 */
export function standingDetail(assessments: CourseAssessment[]): {
  standing: number | null;
  gradedWeight: number;
  totalWeight: number;
  gradedCount: number;
  totalCount: number;
} {
  const weighted = assessments.filter(item => item.weight > 0);
  const graded = weighted.filter(item => item.score !== null);
  return {
    standing: weightedStanding(assessments),
    gradedWeight: graded.reduce((total, item) => total + item.weight, 0),
    totalWeight: weighted.reduce((total, item) => total + item.weight, 0),
    gradedCount: graded.length,
    totalCount: weighted.length,
  };
}

export function nextAcademicItem(
  items: Array<CourseMilestone | CourseWork>
): CourseMilestone | CourseWork | null {
  return (
    [...items]
      .filter(item => !item.done)
      .sort((first, second) =>
        (first.due || "9999").localeCompare(second.due || "9999")
      )[0] || null
  );
}

export type ExamCheckpoint = {
  id: string;
  label: string;
  date: string;
  done: boolean;
  minutes: number;
};
export type RevisionLog = {
  id: string;
  date: string;
  minutes: number;
  method: string;
  note: string;
};

export function weeklyRevisionMinutes(
  logs: RevisionLog[],
  referenceDate: string
): number {
  const cutoff = new Date(`${referenceDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 6);
  // Local calendar day, not toISOString(): the reference is a local day too.
  const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return logs
    .filter(log => log.date >= cutoffDate && log.date <= referenceDate)
    .reduce((total, log) => total + log.minutes, 0);
}
