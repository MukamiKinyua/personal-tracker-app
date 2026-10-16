/**
 * Notifications driven by the journal's own dates.
 *
 * The daily reminders (reminders.ts) say "want to record your water?" at a
 * fixed hour. These are different: they exist only because something in the
 * journal has a date - an assignment due, a document up for review, a
 * reminder the person set for a specific moment - and they are scheduled
 * ahead with the operating system, so they arrive with the app closed.
 *
 * Pure: the date maths, the wording and the quiet-hours rule live here so they
 * can be tested, and so the same decision feeds whatever delivers it.
 */

import { isWithinQuietHours } from "@/lib/core/preferences";

export type UpcomingSource = "assignment" | "document" | "reminder";

/** One thing with a date, published by the page that owns it. */
export type UpcomingItem = {
  /** Unique within its source. */
  id: string;
  source: UpcomingSource;
  title: string;
  /** "YYYY-MM-DD", or a local "YYYY-MM-DDTHH:mm"; a reminder's exact moment is `atMs`. */
  date: string;
  /** Only for a reminder the person set: the exact instant, in epoch ms. */
  atMs?: number;
  /** This item's own lead time ("30 days before"), when it has one. */
  timing?: string;
};

export type PreviewMode =
  | "Show everything"
  | "Hide sensitive names"
  | "Show a general reminder only"
  | "Hide all reminder previews"
  | string;

export type EventNotificationSettings = {
  previewMode: PreviewMode;
  /** The Reminder Preview switches for the areas this feeds. */
  assignments: { enabled: boolean; timing: string };
  documents: { enabled: boolean; timing: string };
  /** The master switch and quiet hours from Settings. */
  notificationsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

/** What the pages know: the preview wording and the per-area switches. */
export type AreaSettings = Pick<
  EventNotificationSettings,
  "previewMode" | "assignments" | "documents"
>;

export type PlannedEvent = {
  id: number;
  title: string;
  body: string;
  at: Date;
};

/** Android keeps a fixed number of pending alarms per app; stay well under it. */
export const MAX_PLANNED_EVENTS = 60;
export const HORIZON_DAYS = 14;

const MORNING = { hour: 9, minute: 0 };
const DUE_DAY = { hour: 8, minute: 0 };

/**
 * "1 day before", "Day before", "30 days before", "Day of estimate" -> days.
 * Anything it cannot read means "the day before", the gentlest default.
 */
export function leadDays(timing: string): number {
  const text = timing.toLowerCase();
  const digits = /(\d+)\s*day/.exec(text);
  if (digits) return Number(digits[1]);
  if (/\bweek/.test(text)) return 7;
  if (/day of|same day|on the day|due day/.test(text)) return 0;
  return 1;
}

/** Parses a bare date or a local date-time into local pieces. */
export function parseLocal(
  value: string
): { y: number; m: number; d: number; time?: { hour: number; minute: number } } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
    time:
      match[4] !== undefined
        ? { hour: Number(match[4]), minute: Number(match[5]) }
        : undefined,
  };
}

function at(
  y: number,
  m: number,
  d: number,
  time: { hour: number; minute: number }
): Date {
  return new Date(y, m - 1, d, time.hour, time.minute, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const pad = (value: number) => String(value).padStart(2, "0");
const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * Inside quiet hours a notification is moved to the moment they end, not
 * dropped: a due date is still worth hearing about, just not at 3am.
 */
export function respectQuietHours(
  when: Date,
  start: string,
  end: string
): Date {
  if (!isWithinQuietHours(clock(when), start, end)) return when;
  const [hour, minute] = end.split(":").map(Number);
  const moved = new Date(when);
  moved.setHours(hour, minute, 0, 0);
  // Quiet hours that wrap midnight end on the next calendar day for a time
  // after the start.
  if (moved.getTime() <= when.getTime()) moved.setDate(moved.getDate() + 1);
  return moved;
}

/**
 * What the notification says, shaped by "what a reminder reveals". The title
 * is always the app's name, never an item's, so a locked screen shows the same
 * thing whatever the mode; only the body ever carries detail.
 */
export function eventBody(
  mode: PreviewMode,
  source: UpcomingSource,
  title: string,
  when: "lead" | "today" | "exact"
): string {
  if (mode === "Hide all reminder previews") return "Reminder due";
  if (mode === "Show a general reminder only") return "You have a private reminder";
  if (mode === "Hide sensitive names") {
    return source === "reminder"
      ? "Reminder"
      : `${source === "assignment" ? "Assignment" : "Document"} reminder`;
  }
  // "Show everything".
  if (source === "reminder") return title;
  const noun = source === "assignment" ? "Due" : "Review";
  return when === "today" ? `${noun} today: ${title}` : `${noun} soon: ${title}`;
}

/** A stable positive int per notification, clear of the daily reminders' 1-8. */
export function notificationId(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return 100_000 + (Math.abs(hash) % 1_000_000_000);
}

export const NOTIFICATION_TITLE = "Personal Tracker";

export function planEventNotifications({
  items,
  settings,
  now = new Date(),
  horizonDays = HORIZON_DAYS,
}: {
  items: UpcomingItem[];
  settings: EventNotificationSettings;
  now?: Date;
  horizonDays?: number;
}): PlannedEvent[] {
  const horizon = addDays(now, horizonDays).getTime();
  const planned = new Map<number, PlannedEvent>();

  const push = (key: string, source: UpcomingSource, title: string, when: Date, kind: "lead" | "today" | "exact") => {
    const time = when.getTime();
    // Already past, or too far ahead to schedule yet; the plan is rebuilt each
    // time the app opens, so a far-off date is picked up when it comes close.
    if (time <= now.getTime() || time > horizon) return;
    const id = notificationId(key);
    planned.set(id, {
      id,
      title: NOTIFICATION_TITLE,
      body: eventBody(settings.previewMode, source, title, kind),
      at: when,
    });
  };

  for (const item of items) {
    // A reminder the person set for a moment is theirs alone: it ignores the
    // master switch and quiet hours, because they chose that exact time.
    if (item.source === "reminder") {
      if (typeof item.atMs === "number") {
        push(`reminder:${item.id}`, "reminder", item.title, new Date(item.atMs), "exact");
      }
      continue;
    }

    if (!settings.notificationsEnabled) continue;
    const area = item.source === "assignment" ? settings.assignments : settings.documents;
    if (!area.enabled) continue;

    const parsed = parseLocal(item.date);
    if (!parsed) continue;
    const dueDay = new Date(parsed.y, parsed.m - 1, parsed.d);
    const lead = leadDays(item.timing ?? area.timing);
    const quiet = (when: Date) =>
      respectQuietHours(when, settings.quietHoursStart, settings.quietHoursEnd);

    if (lead > 0) {
      const ahead = addDays(dueDay, -lead);
      push(
        `${item.source}:${item.id}:lead`,
        item.source,
        item.title,
        quiet(at(ahead.getFullYear(), ahead.getMonth() + 1, ahead.getDate(), MORNING)),
        "lead"
      );
    }
    // And once more on the day itself, a little earlier.
    push(
      `${item.source}:${item.id}:today`,
      item.source,
      item.title,
      quiet(at(dueDay.getFullYear(), dueDay.getMonth() + 1, dueDay.getDate(), DUE_DAY)),
      "today"
    );
  }

  return Array.from(planned.values())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PLANNED_EVENTS);
}
