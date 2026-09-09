/**
 * The habit streak engine.
 *
 * Two requirements pull in opposite directions here, and reconciling them is
 * the whole job of this module. The streak requirement asks for consecutive
 * completion days that reset when a ritual is missed. The habit requirements
 * ask that a missed day not automatically mark the user as failed and that a
 * planned rest never punish them.
 *
 * The resolution: a day is only ever counted against the user if the habit was
 * actually *due* that day and they neither logged it nor spent a freeze. Rest,
 * skip, and not-applicable are deliberate choices and pass through untouched;
 * a day the habit was not scheduled for is not part of the streak at all.
 */

import {
  dayKeyRange,
  dayOfWeek,
  daysBetween,
  shiftDayKey,
  type DayKey,
} from "./datetime";

/**
 * Accepts both the vocabulary already used by `lib/habitTracker.ts`
 * ("rest") and the fuller set the requirements describe ("planned",
 * "not-applicable"), so this can be adopted without a data migration.
 */
export type HabitDayState =
  | "complete"
  | "partial"
  | "planned"
  | "rest"
  | "skipped"
  | "not-applicable";

/** What a given day does to a streak. */
export type StreakOutcome =
  /** Counts towards the streak. */
  | "kept"
  /** Deliberately neither counts nor breaks — rest, skip, unscheduled. */
  | "neutral"
  /** Due, unlogged, and no freeze left. */
  | "broken";

export function classifyDay(state: HabitDayState | undefined): StreakOutcome {
  switch (state) {
    case "complete":
    case "partial":
      return "kept";
    case "rest":
    case "skipped":
    case "planned":
    case "not-applicable":
      return "neutral";
    default:
      return "broken";
  }
}

export type Schedule =
  | { kind: "daily" }
  /** Specific weekdays, 0 = Sunday. */
  | { kind: "days"; days: number[] }
  /** Every N days counted from a start day. */
  | { kind: "interval"; everyDays: number; from: DayKey };

/**
 * Whether the habit was expected on a day. A habit due on Mondays cannot be
 * broken by a Tuesday, which is the difference between a streak that reflects
 * the user's actual commitment and one that punishes them for their own plan.
 */
export function isDueOn(schedule: Schedule, day: DayKey): boolean {
  switch (schedule.kind) {
    case "daily":
      return true;
    case "days":
      return schedule.days.includes(dayOfWeek(day));
    case "interval": {
      const delta = daysBetween(schedule.from, day);
      if (delta < 0) return false;
      return schedule.everyDays > 0 && delta % schedule.everyDays === 0;
    }
    default:
      return false;
  }
}

export type StreakInput = {
  /** Logged outcomes, keyed by local calendar day. */
  states: Record<DayKey, HabitDayState>;
  today: DayKey;
  schedule?: Schedule;
  /**
   * Freezes the user may spend to protect a missed due day. This is what lets
   * a streak survive a genuinely bad week without pretending the day was done.
   */
  freezesAvailable?: number;
  /** How far back to look. */
  since?: DayKey;
};

export type StreakResult = {
  current: number;
  longest: number;
  freezesUsed: number;
  /** The day the current streak stopped, when it has. */
  brokenOn?: DayKey;
  /** Due days with no entry that a freeze covered. */
  frozenDays: DayKey[];
};

/**
 * Walks backwards from today over scheduled days only.
 *
 * Today itself is never counted as broken: the day is still in progress, and
 * telling someone at 9am that they have lost a 40-day streak is both wrong and
 * unkind. It simply does not extend the streak until it is logged.
 */
export function computeStreak({
  states,
  today,
  schedule = { kind: "daily" },
  freezesAvailable = 0,
  since,
}: StreakInput): StreakResult {
  let current = 0;
  let freezesUsed = 0;
  const frozenDays: DayKey[] = [];
  let brokenOn: DayKey | undefined;
  let freezesLeft = freezesAvailable;

  const earliest = since ?? oldestDay(states, today);

  for (
    let day = today;
    daysBetween(earliest, day) >= 0;
    day = shiftDayKey(day, -1)
  ) {
    if (!isDueOn(schedule, day)) continue;

    const outcome = classifyDay(states[day]);

    if (outcome === "kept") {
      current += 1;
      continue;
    }
    if (outcome === "neutral") continue;

    // Broken from here down.
    if (day === today) {
      // Still today's to log; it just has not extended the streak yet.
      continue;
    }
    if (freezesLeft > 0) {
      freezesLeft -= 1;
      freezesUsed += 1;
      frozenDays.push(day);
      continue;
    }
    brokenOn = day;
    break;
  }

  return {
    current,
    longest: longestStreak({ states, today, schedule, since: earliest }),
    freezesUsed,
    brokenOn,
    frozenDays,
  };
}

/** The best run in the recorded history, for context beside the current one. */
export function longestStreak({
  states,
  today,
  schedule = { kind: "daily" },
  since,
}: Omit<StreakInput, "freezesAvailable">): number {
  const earliest = since ?? oldestDay(states, today);
  if (daysBetween(earliest, today) < 0) return 0;

  let best = 0;
  let run = 0;

  for (const day of dayKeyRange(earliest, today)) {
    if (!isDueOn(schedule, day)) continue;

    const outcome = classifyDay(states[day]);
    if (outcome === "kept") {
      run += 1;
      best = Math.max(best, run);
    } else if (outcome === "broken") {
      // Today is not yet a failure, so it cannot end the best run either.
      if (day !== today) run = 0;
    }
    // "neutral" carries the run across without extending it.
  }

  return best;
}

function oldestDay(
  states: Record<DayKey, HabitDayState>,
  fallback: DayKey
): DayKey {
  const days = Object.keys(states).sort();
  return days[0] ?? fallback;
}

/**
 * Wording for the streak. Deliberately avoids "you failed" and "you lost":
 * the requirements ask for missed-day handling that does not mark the user as
 * having failed, and the label is where that promise is either kept or broken.
 */
export function streakLabel(result: StreakResult): string {
  if (result.current === 0) return "Ready when you are";
  const days = `${result.current} day${result.current === 1 ? "" : "s"}`;
  if (result.freezesUsed > 0) {
    return `${days}, with ${result.freezesUsed} freeze${
      result.freezesUsed === 1 ? "" : "s"
    } used`;
  }
  return `${days} in a row`;
}

/**
 * The completion rate over a window, counting only days the habit was due.
 * Rest and skip days are excluded from the denominator rather than counted as
 * misses, so choosing to rest cannot lower the number.
 */
export function completionRate({
  states,
  from,
  to,
  schedule = { kind: "daily" },
}: {
  states: Record<DayKey, HabitDayState>;
  from: DayKey;
  to: DayKey;
  schedule?: Schedule;
}): { kept: number; expected: number; percent: number } {
  let kept = 0;
  let expected = 0;

  for (const day of dayKeyRange(from, to)) {
    if (!isDueOn(schedule, day)) continue;
    const outcome = classifyDay(states[day]);
    if (outcome === "neutral") continue;
    expected += 1;
    if (outcome === "kept") kept += 1;
  }

  return {
    kept,
    expected,
    percent: expected === 0 ? 0 : Math.round((kept / expected) * 100),
  };
}
