export function waterProgress(intake: number, goal: number) {
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((Math.max(0, intake) / goal) * 100))
  );
}

export function waterRemaining(intake: number, goal: number) {
  return Math.max(0, goal - Math.max(0, intake));
}

