export type HabitDailyState = "complete" | "partial" | "rest" | "skipped";

export type HabitRecord = {
  id: string;
  habitId: string;
  date: string;
  state: HabitDailyState;
};

export function setHabitDayState(
  records: HabitRecord[],
  habitId: string,
  date: string,
  state: HabitDailyState
): HabitRecord[] {
  const record = { id: `${habitId}-${date}`, habitId, date, state };
  const index = records.findIndex(
    item => item.habitId === habitId && item.date === date
  );
  return index === -1
    ? [record, ...records]
    : records.map((item, itemIndex) => (itemIndex === index ? record : item));
}

export function habitWeekSummary(
  records: HabitRecord[],
  limit = 7
): Record<HabitDailyState, number> {
  const recent = records.slice(0, limit);
  return recent.reduce<Record<HabitDailyState, number>>(
    (summary, record) => ({
      ...summary,
      [record.state]: summary[record.state] + 1,
    }),
    { complete: 0, partial: 0, rest: 0, skipped: 0 }
  );
}
