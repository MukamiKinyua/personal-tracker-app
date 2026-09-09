export type WaterEntry = { amount: number; time: string };

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

export function removeWaterEntry(entries: WaterEntry[], entry: WaterEntry) {
  const index = entries.findIndex(
    item => item.amount === entry.amount && item.time === entry.time
  );
  return index === -1
    ? entries
    : entries.filter((_, itemIndex) => itemIndex !== index);
}
