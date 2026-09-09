export type LocalLearningLog = { date: string; minutes: number; note: string };
export type LocalLearningSkill = { id: string; logs: LocalLearningLog[] };

function mondayStart(reference: Date) {
  const start = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  );
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function learningPracticeSummary(
  skills: LocalLearningSkill[],
  reference = new Date()
) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  const today = `${year}-${month}-${day}`;
  const weekStart = mondayStart(reference);
  const entries = skills.flatMap(skill => skill.logs);
  const minutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  const todayMinutes = entries
    .filter(entry => entry.date === today)
    .reduce((total, entry) => total + entry.minutes, 0);
  const weekMinutes = entries
    .filter(entry => new Date(`${entry.date}T12:00:00`) >= weekStart)
    .reduce((total, entry) => total + entry.minutes, 0);
  return { sessions: entries.length, minutes, todayMinutes, weekMinutes };
}

export function mostRecentPractice<T extends LocalLearningSkill>(
  skills: T[]
): T | null {
  return (
    [...skills].sort((a, b) => {
      const aDate = a.logs[0]?.date || "";
      const bDate = b.logs[0]?.date || "";
      return bDate.localeCompare(aDate);
    })[0] || null
  );
}
