export type AvoidanceHistoryEntry = {
  id: string;
  resetAt: number;
  note?: string;
};

export type AvoidanceHabit = {
  id: string;
  name: string;
  reason: string;
  startedAt: number;
  history: AvoidanceHistoryEntry[];
  archived: boolean;
};

export function elapsedAvoidanceSeconds(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatAvoidanceDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainder).padStart(2, "0")}s`;
}

export function resetAvoidanceHabit(
  habit: AvoidanceHabit,
  resetAt: number,
  note = ""
): AvoidanceHabit {
  return {
    ...habit,
    startedAt: resetAt,
    history: [
      {
        id: `${habit.id}-${resetAt}`,
        resetAt,
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      ...habit.history,
    ],
  };
}

export function avoidanceMilestone(totalSeconds: number): string {
  const days = Math.floor(Math.max(0, totalSeconds) / 86_400);
  if (days >= 365) return "One year of choosing differently";
  if (days >= 90) return "90-day perspective";
  if (days >= 30) return "One month of steady progress";
  if (days >= 14) return "Two-week foundation";
  if (days >= 7) return "One-week milestone";
  if (days >= 1) return "A full day logged";
  return "Your first day is already in motion";
}
