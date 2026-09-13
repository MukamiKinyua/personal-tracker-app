export const journalViews = [
  "cover",
  "contents",
  "dashboard",
  "portraits",
  "workouts",
  "assignments",
  "courses",
  "exams",
  "studySessions",
  "goals",
  "time",
  "finances",
  "documents",
  "security",
  "environment",
  "purchases",
  "responsibilities",
  "career",
  "portfolio",
  "projects",
  "certifications",
  "cv",
  "internships",
  "analytics",
  "insights",
  "recommendations",
  "privacy",
  "notifications",
  "exportData",
  "history",
  "social",
  "family",
  "hobbies",
  "experiences",
  "achievements",
  "personalGrowth",
  "tasks",
  "wellbeing",
  "sleep",
  "habits",
  "productivity",
  "digitalLife",
  "learning",
  "cycle",
  "nutrition",
  "water",
  "reflections",
  "utilities",
  "integrations",
] as const;

export type JournalView = (typeof journalViews)[number];

const journalViewSet = new Set<JournalView>(journalViews);

export function resolveJournalView(search: string): JournalView {
  const requestedView = new URLSearchParams(search).get("view");
  return requestedView && journalViewSet.has(requestedView as JournalView)
    ? (requestedView as JournalView)
    : "cover";
}

export function activePageAfterNavigation(
  currentPage: JournalView,
  nextPage: JournalView
): JournalView {
  return nextPage === "cover" || nextPage === "contents"
    ? currentPage
    : nextPage;
}

export function toggleDailySlotFill(
  fills: Record<number, string>,
  day: number,
  selectedColor: string
): Record<number, string> {
  if (fills[day]) {
    const { [day]: _cleared, ...remaining } = fills;
    return remaining;
  }

  return { ...fills, [day]: selectedColor };
}

export function toggleQuickAddVisibility(isOpen: boolean): boolean {
  return !isOpen;
}

export function adjustManualCountdown(minutes: number, delta: number): number {
  return Math.max(0, minutes + delta);
}

export function toggleNamedCompletion(
  completed: Record<string, boolean>,
  name: string
): Record<string, boolean> {
  return { ...completed, [name]: !completed[name] };
}

export function renameNamedEntry<T extends { title: string }>(
  entries: T[],
  index: number,
  title: string
): T[] {
  return entries.map((entry, position) =>
    position === index ? { ...entry, title } : entry
  );
}

export type PracticeSession = {
  date: string;
  minutes: number;
  note: string;
  /** Optional evidence — a link to the thing that was made or read. */
  link?: string;
};

export type PracticeMilestone = { id: string; label: string; done: boolean };

export type PracticeTrack = {
  practice: number;
  /** The user's own estimate; used only when no milestones are defined. */
  progress: number;
  logs: PracticeSession[];
  milestones?: PracticeMilestone[];
};

/**
 * Logging a session no longer nudges the progress number. Progress is either
 * the user's stated estimate or a count of ticked milestones — never a hidden
 * increment that makes the figure look more measured than it is.
 */
export function addPracticeSession<T extends PracticeTrack>(
  skill: T,
  session: PracticeSession
): T {
  return {
    ...skill,
    practice: skill.practice + 1,
    logs: [session, ...skill.logs],
  };
}

export type PracticeProgress =
  | { source: "milestones"; percent: number; done: number; total: number }
  | { source: "estimate"; percent: number };

export function practiceProgress(skill: PracticeTrack): PracticeProgress {
  const milestones = skill.milestones ?? [];
  if (milestones.length > 0) {
    const done = milestones.filter(item => item.done).length;
    return {
      source: "milestones",
      percent: Math.round((done / milestones.length) * 100),
      done,
      total: milestones.length,
    };
  }
  return {
    source: "estimate",
    percent: Math.min(100, Math.max(0, Math.round(skill.progress))),
  };
}

export function practiceTotals(skill: PracticeTrack) {
  const minutes = skill.logs.reduce((total, log) => total + log.minutes, 0);
  const last = [...skill.logs].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];
  return { sessions: skill.logs.length, minutes, lastDate: last?.date ?? null };
}

export type ReflectionEntry = {
  period: "weekly" | "monthly";
  date: string;
  fields: Record<string, string>;
};

export function saveReflectionEntry(
  entries: ReflectionEntry[],
  entry: ReflectionEntry
): ReflectionEntry[] {
  return [entry, ...entries];
}

export function reflectionCarryForward(
  entries: ReflectionEntry[],
  limit = 3
): Array<{ date: string; text: string }> {
  return entries
    .filter(entry => entry.period === "weekly")
    .map(entry => ({
      date: entry.date,
      text:
        entry.fields.highlights ||
        entry.fields.notes ||
        entry.fields.intentions ||
        "",
    }))
    .filter(entry => entry.text)
    .slice(0, limit);
}

export type HistoryActivityModule =
  | "Productivity"
  | "Habits"
  | "Learning"
  | "Reflections"
  | "Wellbeing"
  | "Sleep"
  | "Nutrition"
  | "Portrait"
  | "Tasks"
  | "Assignments"
  | "Study Sessions"
  | "Goals"
  | "Time"
  | "Finances";

export function formatHistoryActivityMetric(
  module: HistoryActivityModule,
  amount: number
): string {
  if (
    module === "Productivity" ||
    module === "Learning" ||
    module === "Study Sessions" ||
    module === "Time"
  )
    return `${amount} min`;
  if (module === "Sleep") return `${amount.toFixed(1)} h`;
  if (module === "Reflections") return "reflection";
  return module === "Portrait" ? "scene mark" : "completion";
}

export type CycleLog = { start: string; end?: string };

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dayDifference(later: Date, earlier: Date) {
  return Math.max(
    0,
    Math.round((later.getTime() - earlier.getTime()) / 86_400_000)
  );
}

function localDayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function estimateCycle(
  logs: CycleLog[],
  today = new Date()
): {
  cycleDay: number;
  phase: string;
  estimatedNextPeriod: string;
  /** Average days from one start to the next; 28 until two starts exist. */
  averageCycle: number;
  /** Average logged period length in days; 5 until an entry has an end. */
  averagePeriodLength: number;
  /** How many start-to-start intervals the estimate rests on. */
  cyclesUsed: number;
  wording: string;
} | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) => b.start.localeCompare(a.start));
  const cycleLengths = sorted
    .slice(0, -1)
    .map((entry, index) =>
      dayDifference(
        dateAtNoon(entry.start),
        dateAtNoon(sorted[index + 1]!.start)
      )
    );
  const averageCycle = cycleLengths.length
    ? Math.round(
        cycleLengths.reduce((total, length) => total + length, 0) /
          cycleLengths.length
      )
    : 28;
  const periodLengths = sorted
    .filter(entry => entry.end && entry.end >= entry.start)
    .map(
      entry => dayDifference(dateAtNoon(entry.end!), dateAtNoon(entry.start)) + 1
    );
  const averagePeriodLength = periodLengths.length
    ? Math.round(
        periodLengths.reduce((total, length) => total + length, 0) /
          periodLengths.length
      )
    : 5;
  const lastStart = dateAtNoon(sorted[0]!.start);
  const cycleDay = dayDifference(today, lastStart) + 1;
  const ovulationDay = Math.max(10, averageCycle - 14);
  const phase =
    cycleDay <= 5
      ? "Menstrual"
      : cycleDay < ovulationDay - 1
        ? "Follicular"
        : cycleDay <= ovulationDay + 1
          ? "Estimated ovulation window"
          : "Luteal";
  const nextStart = new Date(lastStart);
  nextStart.setDate(nextStart.getDate() + averageCycle);
  const variation =
    cycleLengths.length > 1
      ? Math.max(...cycleLengths) - Math.min(...cycleLengths)
      : 0;
  const wording =
    cycleLengths.length < 2
      ? "Estimated from limited cycle history."
      : variation > 5
        ? "Estimated from a variable cycle pattern."
        : "Estimated from your recent cycle pattern.";
  return {
    cycleDay,
    phase,
    estimatedNextPeriod: localDayKey(nextStart),
    averageCycle,
    averagePeriodLength,
    cyclesUsed: cycleLengths.length,
    wording,
  };
}

const portraitMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function portraitMonthsForYear(
  year: number
): Array<readonly [string, number]> {
  return portraitMonthNames.map(
    (name, index) => [name, new Date(year, index + 1, 0).getDate()] as const
  );
}

export function toggleAnnualSlotFill(
  fills: Record<string, string>,
  monthIndex: number,
  day: number,
  selectedColor: string
): Record<string, string> {
  const key = `${monthIndex}-${day}`;
  if (fills[key]) {
    const { [key]: _cleared, ...remaining } = fills;
    return remaining;
  }
  return { ...fills, [key]: selectedColor };
}
