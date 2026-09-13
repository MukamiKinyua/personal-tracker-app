import { localCalendarDay } from "./core/datetime";
export type DigitalEntry = {
  id: string;
  date: string;
  minutes: number;
  category: string;
  purpose: string;
  note: string;
};

export function digitalSummary(
  entries: DigitalEntry[],
  referenceDate: string
): { todayMinutes: number; weekMinutes: number; topCategory: string | null } {
  const cutoff = new Date(`${referenceDate}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffDate = localCalendarDay(cutoff);
  const weekly = entries.filter(
    entry => entry.date >= cutoffDate && entry.date <= referenceDate
  );
  const categoryTotals = weekly.reduce<Record<string, number>>(
    (total, entry) => ({
      ...total,
      [entry.category]: (total[entry.category] || 0) + entry.minutes,
    }),
    {}
  );
  const topCategory =
    Object.entries(categoryTotals).sort(
      ([, firstMinutes], [, secondMinutes]) => secondMinutes - firstMinutes
    )[0]?.[0] || null;
  return {
    todayMinutes: entries
      .filter(entry => entry.date === referenceDate)
      .reduce((total, entry) => total + entry.minutes, 0),
    weekMinutes: weekly.reduce((total, entry) => total + entry.minutes, 0),
    topCategory,
  };
}
