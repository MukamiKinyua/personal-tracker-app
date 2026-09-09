export type FocusSession = {
  id: string;
  date: string;
  minutes: number;
  taskId: string;
  taskLabel: string;
  nextStep: string;
  outcome: "completed" | "continued" | "next-step";
};

export function focusSummary(
  sessions: FocusSession[],
  referenceDate: string
): { sessions: number; minutes: number; completed: number } {
  const cutoff = new Date(`${referenceDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const weekly = sessions.filter(
    session => session.date >= cutoffDate && session.date <= referenceDate
  );
  return {
    sessions: weekly.length,
    minutes: weekly.reduce((total, session) => total + session.minutes, 0),
    completed: weekly.filter(session => session.outcome === "completed").length,
  };
}
