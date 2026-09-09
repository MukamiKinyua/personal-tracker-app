/**
 * The life timeline, and the end-of-day recap.
 *
 * A chronological view the user can scroll backwards through — 08:00 school,
 * 16:30 workout, 20:30 journal entry — plus the "what happened today?" recap
 * that gathers the same material into a few sentences and asks how the day
 * felt.
 *
 * The timeline is built from records that already exist, exactly like the
 * calendar. What it adds is *time of day*: the calendar answers "what day is
 * this on", the timeline answers "what order did my day happen in".
 */

import {
  dayKeyOf,
  formatDayKey,
  formatDuration,
  type DayKey,
} from "./datetime";

export type TimelineEntry = {
  id: string;
  scope: string;
  /** What the user sees on the line. */
  title: string;
  /** Local wall clock, "HH:mm". Absent for things with no moment. */
  time?: string;
  /** The instant it happened, used for ordering. */
  at: string;
  /** For things that lasted, like a workout or a focus block. */
  durationMinutes?: number;
  note?: string;
  sourceId?: string;
};

const TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function clockTime(instant: string, timezone: string): string {
  let formatter = TIME_FORMATTERS.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    TIME_FORMATTERS.set(timezone, formatter);
  }
  return formatter.format(new Date(instant));
}

/**
 * Turns records into timeline entries, filed under the local day they happened
 * on. The timezone matters twice here: once to pick the day, once to render
 * the clock time, and they have to agree or a late entry appears at the wrong
 * end of the wrong day.
 */
export function toTimelineEntries<T>({
  records,
  scope,
  timezone,
  id,
  title,
  at,
  durationMinutes,
  note,
}: {
  records: T[];
  scope: string;
  timezone: string;
  id: (record: T) => string;
  title: (record: T) => string;
  at: (record: T) => string;
  durationMinutes?: (record: T) => number | undefined;
  note?: (record: T) => string | undefined;
}): TimelineEntry[] {
  return records.map(record => {
    const instant = at(record);
    return {
      id: `${scope}:${id(record)}`,
      sourceId: id(record),
      scope,
      title: title(record),
      at: instant,
      time: clockTime(instant, timezone),
      durationMinutes: durationMinutes?.(record),
      note: note?.(record),
    };
  });
}

export type TimelineDay = {
  day: DayKey;
  label: string;
  entries: TimelineEntry[];
};

/**
 * Groups entries into days, newest day first and each day in clock order.
 *
 * Days run forwards inside themselves but backwards between themselves,
 * because scrolling back through your life means meeting yesterday before last
 * week, while reading a single day means starting in the morning.
 */
export function buildTimeline({
  entries,
  timezone,
  locale = "en-GB",
  from,
  to,
}: {
  entries: TimelineEntry[];
  timezone: string;
  locale?: string;
  from?: DayKey;
  to?: DayKey;
}): TimelineDay[] {
  const byDay = new Map<DayKey, TimelineEntry[]>();

  for (const entry of entries) {
    const day = dayKeyOf(entry.at, timezone);
    if (from && day < from) continue;
    if (to && day > to) continue;

    const bucket = byDay.get(day);
    if (bucket) bucket.push(entry);
    else byDay.set(day, [entry]);
  }

  return Array.from(byDay.keys())
    .sort((a, b) => b.localeCompare(a))
    .map(day => ({
      day,
      label: formatDayKey(day, locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      entries: byDay
        .get(day)!
        .slice()
        .sort(
          (a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title)
        ),
    }));
}

export function entriesOnDay(
  entries: TimelineEntry[],
  day: DayKey,
  timezone: string
): TimelineEntry[] {
  return (
    buildTimeline({ entries, timezone, from: day, to: day })[0]?.entries ?? []
  );
}

export type DayRecap = {
  day: DayKey;
  /** One sentence per thing that happened, in the user's own terms. */
  lines: string[];
  /** How many records the day holds in total. */
  count: number;
  /** Distinct areas touched. */
  scopes: string[];
  /** The closing question. Optional to answer. */
  question: string;
  /** True when the day genuinely holds nothing. */
  isEmpty: boolean;
};

/** Plural-aware phrasing for one scope's contribution to the recap. */
const RECAP_PHRASES: Record<
  string,
  (count: number, minutes: number) => string
> = {
  workout: count =>
    count === 1 ? "You worked out." : `You worked out ${count} times.`,
  task: count => `You completed ${count} task${count === 1 ? "" : "s"}.`,
  water: () => "You logged your water.",
  sleep: (_count, minutes) =>
    minutes > 0
      ? `You slept ${formatDuration(minutes)}.`
      : "You logged your sleep.",
  reflection: count =>
    count === 1
      ? "You wrote a journal entry."
      : `You wrote ${count} journal entries.`,
  wellbeing: () => "You checked in on how you were feeling.",
  focus: (count, minutes) =>
    minutes > 0
      ? `You focused for ${formatDuration(minutes)} across ${count} session${count === 1 ? "" : "s"}.`
      : `You ran ${count} focus session${count === 1 ? "" : "s"}.`,
  habit: count => `You kept ${count} habit${count === 1 ? "" : "s"}.`,
  meal: count => `You logged ${count} meal${count === 1 ? "" : "s"}.`,
  movement: (_count, minutes) =>
    minutes > 0
      ? `You moved for ${formatDuration(minutes)}.`
      : "You logged movement.",
};

/**
 * The "review my day" recap.
 *
 * Reports what is there and asks one question. It deliberately does not
 * mention what is missing: a closing ritual that lists everything you failed
 * to log is one nobody performs twice.
 */
export function buildDayRecap({
  entries,
  day,
  timezone,
}: {
  entries: TimelineEntry[];
  day: DayKey;
  timezone: string;
}): DayRecap {
  const dayEntries = entriesOnDay(entries, day, timezone);

  const counts = new Map<string, { count: number; minutes: number }>();
  for (const entry of dayEntries) {
    const current = counts.get(entry.scope) ?? { count: 0, minutes: 0 };
    counts.set(entry.scope, {
      count: current.count + 1,
      minutes: current.minutes + (entry.durationMinutes ?? 0),
    });
  }

  const lines: string[] = [];
  for (const [scope, totals] of Array.from(counts)) {
    const phrase = RECAP_PHRASES[scope];
    lines.push(
      phrase
        ? phrase(totals.count, totals.minutes)
        : `You recorded ${totals.count} ${scope} entr${totals.count === 1 ? "y" : "ies"}.`
    );
  }

  return {
    day,
    lines,
    count: dayEntries.length,
    scopes: Array.from(counts.keys()),
    question: "How did today feel?",
    isEmpty: dayEntries.length === 0,
  };
}

/**
 * What the recap says on a day with nothing in it. A blank day is allowed to
 * be blank; it is not a prompt to go and fill something in.
 */
export function emptyRecapMessage(): string {
  return "Nothing recorded today. That is allowed too.";
}

/** Days that hold at least one record, newest first — the scroll-back index. */
export function recordedDays(
  entries: TimelineEntry[],
  timezone: string
): DayKey[] {
  const days = new Set<DayKey>();
  for (const entry of entries) days.add(dayKeyOf(entry.at, timezone));
  return Array.from(days).sort((a, b) => b.localeCompare(a));
}
