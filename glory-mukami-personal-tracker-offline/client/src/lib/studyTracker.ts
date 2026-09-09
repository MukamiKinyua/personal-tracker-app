export type StudySessionRecord = {
  id: string;
  date: string;
  minutes: number;
  topic: string;
  contextType: string;
  contextName: string;
  method: string;
  outcome: string;
  nextStep: string;
  interruption: string;
};

export function formatStudyTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function studyTimeSummary(
  sessions: StudySessionRecord[],
  referenceDate: string
): {
  todayMinutes: number;
  weekMinutes: number;
  dominantContext: string | null;
} {
  const cutoff = new Date(`${referenceDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const weekly = sessions.filter(
    session => session.date >= cutoffDate && session.date <= referenceDate
  );
  const totals = weekly.reduce<Record<string, number>>(
    (current, session) => ({
      ...current,
      [session.contextType]:
        (current[session.contextType] || 0) + session.minutes,
    }),
    {}
  );
  const dominantContext =
    Object.entries(totals).sort(
      ([, first], [, second]) => second - first
    )[0]?.[0] || null;
  return {
    todayMinutes: sessions
      .filter(session => session.date === referenceDate)
      .reduce((total, session) => total + session.minutes, 0),
    weekMinutes: weekly.reduce((total, session) => total + session.minutes, 0),
    dominantContext,
  };
}
