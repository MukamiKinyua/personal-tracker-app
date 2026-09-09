export type MoodEntry = {
  id: string;
  date: string;
  mood: string;
  energy: number;
  note: string;
  contexts: string[];
};

export const moodContextOptions = [
  "Rest",
  "Movement",
  "People",
  "Workload",
  "Cycle",
  "Outside time",
];

export function toggleMoodContext(
  contexts: string[],
  context: string
): string[] {
  return contexts.includes(context)
    ? contexts.filter(item => item !== context)
    : [...contexts, context];
}

export function moodPatternSummary(
  entries: MoodEntry[],
  limit = 7
): { count: number; commonMood: string; averageEnergy: number } | null {
  const recent = entries.slice(0, limit);
  if (recent.length === 0) return null;

  const counts = recent.reduce<Record<string, number>>(
    (total, entry) => ({
      ...total,
      [entry.mood]: (total[entry.mood] || 0) + 1,
    }),
    {}
  );
  const commonMood = Object.entries(counts).sort(
    ([, firstCount], [, secondCount]) => secondCount - firstCount
  )[0]![0];
  const averageEnergy =
    recent.reduce((total, entry) => total + entry.energy, 0) / recent.length;
  return { count: recent.length, commonMood, averageEnergy };
}
