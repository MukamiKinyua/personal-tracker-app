/**
 * The personal review system.
 *
 * Daily, weekly, monthly, quarterly, and yearly reviews that summarise what
 * was recorded, surface what was left unfinished, offer optional reflection
 * questions, and let the user write their own conclusions.
 *
 * The requirement ends with a prohibition that shapes the whole module: the
 * system must avoid presenting an automatic score for the user's life. So
 * nothing here returns a rating, a grade, or a percentage-of-life-lived. It
 * returns counts, gaps, and questions — the raw material for a judgement the
 * person makes themselves.
 */

import {
  dayKeyRange,
  daysBetween,
  formatDayKey,
  monthStartKey,
  shiftDayKey,
  weekStartKey,
  type DayKey,
} from "./datetime";
import { missingDays, type ScopeTotal } from "./aggregate";

export type ReviewPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export const REVIEW_PERIODS: ReviewPeriod[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

export type ReviewWindow = {
  period: ReviewPeriod;
  from: DayKey;
  to: DayKey;
};

function quarterStart(day: DayKey): DayKey {
  const [year, month] = day.split("-").map(Number);
  const firstMonthOfQuarter = Math.floor((month - 1) / 3) * 3 + 1;
  return `${String(year).padStart(4, "0")}-${String(firstMonthOfQuarter).padStart(2, "0")}-01`;
}

/**
 * The window a review covers, ending on the given day.
 *
 * Windows are anchored to real calendar boundaries rather than to "the last N
 * days", because a weekly review that starts on a different weekday each time
 * cannot be compared with the one before it.
 */
export function reviewWindow(
  period: ReviewPeriod,
  day: DayKey,
  weekStartsOn = 1
): ReviewWindow {
  switch (period) {
    case "daily":
      return { period, from: day, to: day };

    case "weekly": {
      const from = weekStartKey(day, weekStartsOn);
      return { period, from, to: shiftDayKey(from, 6) };
    }

    case "monthly": {
      const from = monthStartKey(day);
      const nextMonth = monthStartKey(shiftDayKey(from, 32));
      return { period, from, to: shiftDayKey(nextMonth, -1) };
    }

    case "quarterly": {
      const from = quarterStart(day);
      let next = from;
      for (let index = 0; index < 3; index += 1) {
        next = monthStartKey(shiftDayKey(next, 32));
      }
      return { period, from, to: shiftDayKey(next, -1) };
    }

    case "yearly": {
      const year = day.slice(0, 4);
      return { period, from: `${year}-01-01`, to: `${year}-12-31` };
    }

    default:
      return { period, from: day, to: day };
  }
}

/** The previous window of the same kind, for an honest side-by-side. */
export function previousWindow(
  window: ReviewWindow,
  weekStartsOn = 1
): ReviewWindow {
  return reviewWindow(
    window.period,
    shiftDayKey(window.from, -1),
    weekStartsOn
  );
}

export function windowLabel(window: ReviewWindow, locale = "en-GB"): string {
  const from = formatDayKey(window.from, locale, { dateStyle: "medium" });
  if (window.from === window.to) return from;
  const to = formatDayKey(window.to, locale, { dateStyle: "medium" });
  return `${from} – ${to}`;
}

/**
 * Reflection prompts. Optional by design — the requirement says a review
 * "should ask optional reflection questions", and a prompt that must be
 * answered turns a review into a form.
 */
export const REVIEW_PROMPTS: Record<ReviewPeriod, string[]> = {
  daily: [
    "What is worth remembering about today?",
    "Was there anything you kept putting off?",
  ],
  weekly: [
    "What went better than you expected this week?",
    "What was hardest, and did anything help?",
    "What would you like next week to make room for?",
  ],
  monthly: [
    "What changed this month that you did not plan for?",
    "Which of your goals actually moved?",
    "What would you like to stop carrying into next month?",
  ],
  quarterly: [
    "Looking back three months, what has genuinely shifted?",
    "Is anything you are tracking no longer worth tracking?",
    "What deserves more of your attention than it is getting?",
  ],
  yearly: [
    "What did this year ask of you?",
    "What are you glad you kept doing?",
    "What would you like the next year to look like?",
  ],
};

export type ReviewEntry = {
  id: string;
  period: ReviewPeriod;
  from: DayKey;
  to: DayKey;
  /** The user's own words, keyed by prompt. Nothing is required. */
  answers: Record<string, string>;
  /** Free conclusion, written after reading the summary. */
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewSummary = {
  window: ReviewWindow;
  label: string;
  /** Per-scope counts over the window. */
  totals: ScopeTotal[];
  /** Days in the window with nothing recorded at all. */
  gaps: DayKey[];
  /** Items still open that were due inside the window. */
  unfinished: Array<{ id: string; title: string; dueDay?: DayKey }>;
  /** Days in the window that have already happened. */
  daysElapsed: number;
  prompts: string[];
  /**
   * Comparisons with the previous window, as plain differences. Never framed
   * as better or worse — a quieter month is not a failed one.
   */
  changes: Array<{
    scope: string;
    current: number;
    previous: number;
    delta: number;
  }>;
};

export function buildReview({
  period,
  day,
  today,
  totals,
  previousTotals = [],
  recordedDays = [],
  unfinished = [],
  weekStartsOn = 1,
  locale = "en-GB",
}: {
  period: ReviewPeriod;
  day: DayKey;
  today: DayKey;
  totals: ScopeTotal[];
  previousTotals?: ScopeTotal[];
  recordedDays?: DayKey[];
  unfinished?: Array<{ id: string; title: string; dueDay?: DayKey }>;
  weekStartsOn?: number;
  locale?: string;
}): ReviewSummary {
  const window = reviewWindow(period, day, weekStartsOn);

  // A review of the current week should not count days that have not happened.
  const lastCountable = daysBetween(today, window.to) > 0 ? today : window.to;
  const daysElapsed =
    daysBetween(window.from, lastCountable) < 0
      ? 0
      : dayKeyRange(window.from, lastCountable).length;

  const previousByScope = new Map(
    previousTotals.map(total => [total.scope, total.count])
  );

  const changes = totals.map(total => {
    const previous = previousByScope.get(total.scope) ?? 0;
    return {
      scope: total.scope,
      current: total.count,
      previous,
      delta: total.count - previous,
    };
  });

  return {
    window,
    label: windowLabel(window, locale),
    totals,
    gaps: missingDays({
      recordedDays,
      from: window.from,
      to: window.to,
      today,
    }),
    unfinished: unfinished.filter(item => {
      if (!item.dueDay) return false;
      return item.dueDay >= window.from && item.dueDay <= window.to;
    }),
    daysElapsed,
    prompts: REVIEW_PROMPTS[period],
    changes,
  };
}

export function createReviewEntry(
  window: ReviewWindow,
  now: Date = new Date()
): ReviewEntry {
  const at = now.toISOString();
  return {
    id: `review_${window.period}_${window.from}`,
    period: window.period,
    from: window.from,
    to: window.to,
    answers: {},
    createdAt: at,
    updatedAt: at,
  };
}

export function answerPrompt(
  entry: ReviewEntry,
  prompt: string,
  answer: string,
  now: Date = new Date()
): ReviewEntry {
  return {
    ...entry,
    answers: { ...entry.answers, [prompt]: answer },
    updatedAt: now.toISOString(),
  };
}

/** A review the user has actually put something into. */
export function hasContent(entry: ReviewEntry): boolean {
  if (entry.conclusion?.trim()) return true;
  return Object.values(entry.answers).some(answer => answer.trim().length > 0);
}

/**
 * Describes a change without ranking it.
 *
 * "12 more than last week" is a fact the user can interpret. "You improved by
 * 40%" is a verdict, and the requirement rules that out.
 */
export function describeChange(
  change: ReviewSummary["changes"][number]
): string {
  if (change.previous === 0 && change.current === 0)
    return "nothing either time";
  if (change.delta === 0) return "the same as last time";
  const size = Math.abs(change.delta);
  return change.delta > 0
    ? `${size} more than last time`
    : `${size} fewer than last time`;
}

/** Which review is due, given when the user last completed each kind. */
export function dueReviews(
  today: DayKey,
  lastCompleted: Partial<Record<ReviewPeriod, DayKey>> = {},
  weekStartsOn = 1
): ReviewPeriod[] {
  return REVIEW_PERIODS.filter(period => {
    const window = reviewWindow(period, today, weekStartsOn);
    const previous = previousWindow(window, weekStartsOn);
    const last = lastCompleted[period];
    // The review that is due is the one for the window that has just closed.
    return !last || last < previous.from;
  });
}
