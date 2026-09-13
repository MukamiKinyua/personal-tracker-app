/**
 * Timezone-aware calendar helpers.
 *
 * Requirement 2.5 asks every date-dependent page to work in the user's own
 * timezone and to survive daylight-saving changes, leap years, overnight
 * events, and cross-midnight sessions. Those cases are only correct if wall
 * clock time and absolute instants are kept apart, so this module never uses
 * the host machine's local time implicitly: the timezone is always a parameter.
 */

/** A local calendar day, "YYYY-MM-DD". The key every day-scoped page groups by. */
export type DayKey = string;

/** A wall clock time of day, "HH:mm" on a 24-hour clock. */
export type ClockTime = string;

const DAY_MS = 86_400_000;

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Reads an instant as wall clock parts in a given zone. */
function zonedParts(instant: Date, timeZone: string): Parts {
  const parsed: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") parsed[part.type] = Number(part.value);
  }
  return {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    // Some engines render midnight as hour 24 under hour12:false.
    hour: parsed.hour === 24 ? 0 : parsed.hour,
    minute: parsed.minute,
    second: parsed.second,
  };
}

/** The zone's offset from UTC, in ms, at a particular instant. */
function offsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - instant.getTime();
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/**
 * The local calendar day an instant falls on. This is what decides whether a
 * 23:50 glass of water belongs to today or tomorrow (3.6 requires entries roll
 * into the correct local day).
 */
export function dayKeyOf(instant: Date | string, timeZone: string): DayKey {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = zonedParts(date, timeZone);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function todayKey(timeZone: string, now: Date = new Date()): DayKey {
  return dayKeyOf(now, timeZone);
}

export function parseDayKey(day: DayKey): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return { year, month, day: dayOfMonth };
}

export function isValidDayKey(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const { year, month, day: dayOfMonth } = parseDayKey(day);
  if (month < 1 || month > 12) return false;
  // Round-tripping through UTC rejects 2025-02-29 while accepting 2024-02-29.
  const probe = new Date(Date.UTC(year, month - 1, dayOfMonth));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === dayOfMonth
  );
}

/**
 * Turns a wall clock time on a local day into an absolute instant.
 *
 * The offset is probed twice because the offset that applies depends on the
 * instant we are still solving for: on a DST boundary the first guess can sit
 * on the wrong side of the transition.
 */
export function zonedTimeToInstant(
  day: DayKey,
  time: ClockTime,
  timeZone: string
): Date {
  const { year, month, day: dayOfMonth } = parseDayKey(day);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, dayOfMonth, hour, minute, 0);

  const firstGuess = new Date(naive - offsetMs(new Date(naive), timeZone));
  const corrected = new Date(naive - offsetMs(firstGuess, timeZone));
  return corrected;
}

/** Midnight that opens a local day, as an absolute instant. */
export function startOfDayInstant(day: DayKey, timeZone: string): Date {
  return zonedTimeToInstant(day, "00:00", timeZone);
}

/** The instant the local day ends — i.e. the next day's midnight. */
export function endOfDayInstant(day: DayKey, timeZone: string): Date {
  return startOfDayInstant(shiftDayKey(day, 1), timeZone);
}

/**
 * Calendar arithmetic on day keys. Done on the calendar rather than by adding
 * 86,400,000 ms, so a DST day (23 or 25 hours long) still advances by one day.
 */
export function shiftDayKey(day: DayKey, delta: number): DayKey {
  const { year, month, day: dayOfMonth } = parseDayKey(day);
  const shifted = new Date(Date.UTC(year, month - 1, dayOfMonth + delta));
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(
    shifted.getUTCMonth() + 1
  )}-${pad(shifted.getUTCDate())}`;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) -
      Date.UTC(a.year, a.month - 1, a.day)) /
      DAY_MS
  );
}

/** Every day key in an inclusive range — the backbone of the pixel grids. */
export function dayKeyRange(from: DayKey, to: DayKey): DayKey[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  const keys: DayKey[] = [];
  for (let index = 0; index <= span; index += 1) {
    keys.push(shiftDayKey(from, index));
  }
  return keys;
}

/** 0 = Sunday through 6 = Saturday, for the local calendar day. */
export function dayOfWeek(day: DayKey): number {
  const { year, month, day: dayOfMonth } = parseDayKey(day);
  return new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
}

/** Honours the week-start day chosen during setup (2.1). */
export function weekStartKey(day: DayKey, weekStartsOn = 1): DayKey {
  const offset = (dayOfWeek(day) - weekStartsOn + 7) % 7;
  return shiftDayKey(day, -offset);
}

export function monthStartKey(day: DayKey): DayKey {
  const { year, month } = parseDayKey(day);
  return `${pad(year, 4)}-${pad(month)}-01`;
}

/**
 * Elapsed minutes between two instants. Correct across a DST change and across
 * midnight because instants are absolute: the wall clock may jump, the elapsed
 * time does not.
 */
export function durationMinutes(
  start: Date | string,
  end: Date | string
): number {
  const from = typeof start === "string" ? new Date(start) : start;
  const to = typeof end === "string" ? new Date(end) : end;
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

export type OvernightSession = {
  startInstant: string;
  endInstant: string;
  /** The day the session is filed under — its start day. */
  dayKey: DayKey;
  minutes: number;
  crossedMidnight: boolean;
};

/**
 * Resolves a session entered as two wall clock times, such as a sleep record
 * of 23:30 to 07:00. When the end is at or before the start it belongs to the
 * following day; requirement 3.7 and acceptance scenario 8 both depend on this
 * returning 450 minutes rather than a negative duration.
 */
export function resolveOvernightSession(
  day: DayKey,
  startTime: ClockTime,
  endTime: ClockTime,
  timeZone: string
): OvernightSession {
  const startInstant = zonedTimeToInstant(day, startTime, timeZone);
  const sameDayEnd = zonedTimeToInstant(day, endTime, timeZone);
  const crossedMidnight = sameDayEnd.getTime() <= startInstant.getTime();
  const endInstant = crossedMidnight
    ? zonedTimeToInstant(shiftDayKey(day, 1), endTime, timeZone)
    : sameDayEnd;

  return {
    startInstant: startInstant.toISOString(),
    endInstant: endInstant.toISOString(),
    dayKey: day,
    minutes: durationMinutes(startInstant, endInstant),
    crossedMidnight,
  };
}

/** "7h 30m" — durations are shown, never left as a raw minute count. */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * A relative label such as "Due in 2 days". Requirement 3.14 asks for these
 * *alongside* the exact date, never instead of it, so callers pair this with
 * `formatDayKey`.
 */
export function relativeDayLabel(target: DayKey, today: DayKey): string {
  const delta = daysBetween(today, target);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta > 1 && delta < 7) return `In ${delta} days`;
  if (delta < -1 && delta > -7) return `${Math.abs(delta)} days ago`;
  if (delta >= 7 && delta < 14) return "Next week";
  if (delta <= -7 && delta > -14) return "Last week";
  return delta > 0 ? `In ${delta} days` : `${Math.abs(delta)} days ago`;
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** Renders a day key in the user's locale (2.5). */
export function formatDayKey(
  day: DayKey,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const cacheKey = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatterCache.get(cacheKey);
  if (!formatter) {
    // UTC, because a day key names a calendar day and carries no instant.
    formatter = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: "UTC",
    });
    dateFormatterCache.set(cacheKey, formatter);
  }
  const { year, month, day: dayOfMonth } = parseDayKey(day);
  return formatter.format(new Date(Date.UTC(year, month - 1, dayOfMonth)));
}

/** The zone the browser reports, used as the setup default and never assumed. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isFutureDay(day: DayKey, today: DayKey): boolean {
  return daysBetween(today, day) > 0;
}

/**
 * The device's local calendar day as YYYY-MM-DD. For "what day is it for
 * the person typing", not for cross-timezone record keys (use dayKeyOf).
 * Never derive this from toISOString(), which names the UTC day and is a
 * day early for anyone east of Greenwich in the evening.
 */
export function localCalendarDay(date: Date = new Date()): DayKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
