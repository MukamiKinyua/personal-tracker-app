/**
 * Cross-chapter aggregation.
 *
 * Feeds two things: the live counters beside each entry in the table of
 * contents, and the analytics page's totals across every chapter at once.
 *
 * The rule that shapes all of it: a chapter with no records and a chapter
 * whose records all measure zero are different facts, and a count of 0 tells
 * the reader which only if the two are kept apart. Every total here therefore
 * carries how many records produced it.
 */

import { dayKeyRange, daysBetween, shiftDayKey, type DayKey } from "./datetime";
import type { AnyRecord } from "./recordStore";

export type Timeframe = "today" | "7d" | "30d" | "90d" | "all";

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export function timeframeStart(
  timeframe: Timeframe,
  today: DayKey
): DayKey | null {
  switch (timeframe) {
    case "today":
      return today;
    case "7d":
      return shiftDayKey(today, -6);
    case "30d":
      return shiftDayKey(today, -29);
    case "90d":
      return shiftDayKey(today, -89);
    default:
      // "all" has no lower bound.
      return null;
  }
}

export type ScopeTotal = {
  scope: string;
  /** How many records produced this total. Zero means nothing was logged. */
  count: number;
  /** Distinct local days with at least one record. */
  activeDays: number;
  /** Sum of a numeric measure, when the scope has one. */
  measure?: number;
  /** Absent rather than zero when the scope has no numeric measure. */
  measureUnit?: string;
  lastRecordedOn?: DayKey;
};

/** Which body field carries the scope's headline number, and its unit. */
const MEASURES: Record<string, { field: string; unit: string }> = {
  water: { field: "amountMl", unit: "ml" },
  sleep: { field: "minutes", unit: "minutes" },
  focus: { field: "minutes", unit: "minutes" },
  movement: { field: "minutes", unit: "minutes" },
  "learning-session": { field: "minutes", unit: "minutes" },
};

export function aggregateScope(
  records: AnyRecord[],
  scope: string,
  dayOf: (record: AnyRecord) => DayKey
): ScopeTotal {
  const mine = records.filter(
    record => record.scope === scope && !record.deletedAt
  );
  const days = new Set<DayKey>();
  let measure = 0;
  let sawMeasure = false;

  const spec = MEASURES[scope];

  for (const record of mine) {
    days.add(dayOf(record));
    if (spec) {
      const value = record.body[spec.field];
      if (typeof value === "number") {
        measure += value;
        sawMeasure = true;
      }
    }
  }

  const sortedDays = Array.from(days).sort();

  return {
    scope,
    count: mine.length,
    activeDays: days.size,
    // Left undefined when nothing numeric was found, so a real zero total and
    // "this scope has no number" never render the same way.
    measure: sawMeasure ? measure : undefined,
    measureUnit: sawMeasure ? spec?.unit : undefined,
    lastRecordedOn: sortedDays[sortedDays.length - 1],
  };
}

export function aggregateAll(
  records: AnyRecord[],
  dayOf: (record: AnyRecord) => DayKey
): Record<string, ScopeTotal> {
  const scopes = Array.from(
    new Set(records.filter(r => !r.deletedAt).map(record => record.scope))
  );
  const totals: Record<string, ScopeTotal> = {};
  for (const scope of scopes) {
    totals[scope] = aggregateScope(records, scope, dayOf);
  }
  return totals;
}

export function withinTimeframe(
  records: AnyRecord[],
  timeframe: Timeframe,
  today: DayKey,
  dayOf: (record: AnyRecord) => DayKey
): AnyRecord[] {
  const from = timeframeStart(timeframe, today);
  if (!from) return records;
  return records.filter(record => {
    const day = dayOf(record);
    return day >= from && day <= today;
  });
}

export type ChapterCount = {
  chapter: string;
  /** Items needing attention now — the number worth putting on a badge. */
  needsAttention: number;
  /** Everything held under the chapter. */
  total: number;
};

/**
 * The counters shown beside each chapter. Only `needsAttention` should drive a
 * badge: a chapter holding 400 completed records is not asking for anything,
 * and badging it teaches the user to ignore badges.
 */
export function chapterCounts(
  chapters: Record<string, string[]>,
  totals: Record<string, ScopeTotal>,
  attention: Record<string, number> = {}
): ChapterCount[] {
  return Object.entries(chapters).map(([chapter, scopes]) => ({
    chapter,
    total: scopes.reduce((sum, scope) => sum + (totals[scope]?.count ?? 0), 0),
    needsAttention: scopes.reduce(
      (sum, scope) => sum + (attention[scope] ?? 0),
      0
    ),
  }));
}

/**
 * Completion across a pixel grid over a date range.
 *
 * `expected` counts the days in the range that have already happened. Counting
 * future days would make every month look like a failure until its last day.
 */
export function matrixCompletion({
  filledDays,
  from,
  to,
  today,
}: {
  filledDays: Iterable<DayKey>;
  from: DayKey;
  to: DayKey;
  today: DayKey;
}): { filled: number; expected: number; percent: number } {
  const filledSet = new Set(filledDays);
  const lastCountable = daysBetween(today, to) > 0 ? today : to;

  if (daysBetween(from, lastCountable) < 0) {
    return { filled: 0, expected: 0, percent: 0 };
  }

  const days = dayKeyRange(from, lastCountable);
  const filled = days.filter(day => filledSet.has(day)).length;

  return {
    filled,
    expected: days.length,
    percent: days.length === 0 ? 0 : Math.round((filled / days.length) * 100),
  };
}

/**
 * A plain-language summary of a total, used as the accessible text alternative
 * beside every chart and grid.
 */
export function describeTotal(total: ScopeTotal): string {
  if (total.count === 0) return `${total.scope}: nothing logged`;

  const parts = [
    `${total.count} record${total.count === 1 ? "" : "s"}`,
    `${total.activeDays} day${total.activeDays === 1 ? "" : "s"}`,
  ];
  if (total.measure !== undefined) {
    parts.push(`${total.measure} ${total.measureUnit} in total`);
  }
  return `${total.scope}: ${parts.join(", ")}`;
}

/**
 * Days in a range with no record at all — what the requirements call a
 * missing-data summary. Reported as fact, without suggesting the user failed.
 */
export function missingDays({
  recordedDays,
  from,
  to,
  today,
}: {
  recordedDays: Iterable<DayKey>;
  from: DayKey;
  to: DayKey;
  today: DayKey;
}): DayKey[] {
  const recorded = new Set(recordedDays);
  const lastCountable = daysBetween(today, to) > 0 ? today : to;
  if (daysBetween(from, lastCountable) < 0) return [];
  return dayKeyRange(from, lastCountable).filter(day => !recorded.has(day));
}
