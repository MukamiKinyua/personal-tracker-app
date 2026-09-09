export type LocalTimerRecord = {
  id: string;
  date: string;
  label: string;
  mode: "countdown" | "countup";
  seconds: number;
  category: string;
};

export type TimerRun = {
  mode: "countdown" | "countup";
  baseSeconds: number;
  startedAt: number;
  targetSeconds?: number;
};

export function isTimerRun(value: unknown): value is TimerRun {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TimerRun>;
  return (
    (candidate.mode === "countdown" || candidate.mode === "countup") &&
    typeof candidate.baseSeconds === "number" &&
    Number.isFinite(candidate.baseSeconds) &&
    candidate.baseSeconds >= 0 &&
    typeof candidate.startedAt === "number" &&
    Number.isFinite(candidate.startedAt) &&
    (candidate.targetSeconds === undefined ||
      (typeof candidate.targetSeconds === "number" &&
        Number.isFinite(candidate.targetSeconds) &&
        candidate.targetSeconds >= 0))
  );
}

export function formatClockSeconds(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function timerSecondsAt(run: TimerRun, now: number): number {
  const elapsed = Math.max(0, Math.floor((now - run.startedAt) / 1000));
  if (run.mode === "countdown")
    return Math.max(0, (run.targetSeconds ?? run.baseSeconds) - elapsed);
  return Math.max(0, run.baseSeconds + elapsed);
}

export function localTimingSummary(
  records: LocalTimerRecord[],
  referenceDate: string
): {
  todaySeconds: number;
  todaySessions: number;
  countdownSeconds: number;
  countupSeconds: number;
} {
  const todayRecords = records.filter(record => record.date === referenceDate);
  return {
    todaySeconds: todayRecords.reduce(
      (total, record) => total + record.seconds,
      0
    ),
    todaySessions: todayRecords.length,
    countdownSeconds: todayRecords
      .filter(record => record.mode === "countdown")
      .reduce((total, record) => total + record.seconds, 0),
    countupSeconds: todayRecords
      .filter(record => record.mode === "countup")
      .reduce((total, record) => total + record.seconds, 0),
  };
}
