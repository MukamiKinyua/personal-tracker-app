export function sleepDurationHours(bedtime: string, wakeTime: string) {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return Number.isInteger(hours) &&
      Number.isInteger(minutes) &&
      hours >= 0 &&
      hours < 24 &&
      minutes >= 0 &&
      minutes < 60
      ? hours * 60 + minutes
      : null;
  };
  const start = toMinutes(bedtime);
  const end = toMinutes(wakeTime);
  if (start === null || end === null) return 0;
  const difference = (end - start + 24 * 60) % (24 * 60);
  return difference === 0 ? 24 : difference / 60;
}

export function formatSleepDuration(hours: number) {
  const totalMinutes = Math.round(Math.max(0, hours) * 60);
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`;
}

/** Local calendar date as a `<input type="date">` value. Not toISOString(),
 * which would shift the day for anyone east or west of UTC late at night. */
export function sleepDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A night is filed under the morning it ends. Bedtime at or after the wake
 * clock time means it began the previous calendar day. */
export function sleepCrossesMidnight(bedtime: string, wakeTime: string) {
  return bedtime >= wakeTime;
}

export function sleepNightStart(
  wakeDate: string,
  bedtime: string,
  wakeTime: string
) {
  const [year, month, day] = wakeDate.split("-").map(Number);
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const start = new Date(year, month - 1, day, bedHour, bedMinute, 0, 0);
  if (sleepCrossesMidnight(bedtime, wakeTime)) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

export type SleepDurationCheck =
  | { kind: "ok" }
  | { kind: "missing"; message: string }
  | { kind: "implausible"; message: string };

/** Catches the two ways clock arithmetic produces a confident wrong answer:
 * a blank field (reads as 0 h) and swapped fields (reads as ~23 h). */
export function sleepDurationCheck(
  bedtime: string,
  wakeTime: string,
  hours: number
): SleepDurationCheck {
  if (!bedtime || !wakeTime) {
    return {
      kind: "missing",
      message: "Enter both a bedtime and a wake time to work out the total.",
    };
  }
  if (hours > 16) {
    return {
      kind: "implausible",
      message: `That comes to ${formatSleepDuration(hours)}. If the times are the wrong way round, swap them — or correct the total below.`,
    };
  }
  return { kind: "ok" };
}

export type SleepLogRecord = {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  hours: number;
  quality: string;
  windDown: boolean;
  note: string;
};

export function replaceSleepLog<T extends SleepLogRecord>(
  logs: T[],
  updated: T
) {
  return logs.map(log => (log.id === updated.id ? updated : log));
}

export function sleepDurationBand(hours: number) {
  if (hours < 5) return { label: "Under 5 h", color: "#df7c9e" };
  if (hours < 7) return { label: "5–6 h 59", color: "#8e7ac0" };
  if (hours < 9) return { label: "7–8 h 59", color: "#4b79b8" };
  return { label: "9 h or more", color: "#29a8ad" };
}
