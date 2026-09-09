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
