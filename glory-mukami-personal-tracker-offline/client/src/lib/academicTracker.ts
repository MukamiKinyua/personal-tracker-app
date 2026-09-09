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

export function examDueStatus(date: string, referenceDate: string): string {
  if (!date) return "No date set";
  const examDate = new Date(`${date}T00:00:00`);
  const reference = new Date(`${referenceDate}T00:00:00`);
  const difference = Math.ceil(
    (examDate.getTime() - reference.getTime()) / 86_400_000
  );
  if (difference < 0) return "Date passed";
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  return `${difference} days to go`;
}

export function weeklyRevisionMinutes(
  logs: RevisionLog[],
  referenceDate: string
): number {
  const cutoff = new Date(`${referenceDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  return logs
    .filter(log => log.date >= cutoffDate && log.date <= referenceDate)
    .reduce((total, log) => total + log.minutes, 0);
}
