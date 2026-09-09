/**
 * The unified calendar.
 *
 * One surface showing assignments, tasks, workouts, habits, sleep, reminders,
 * appointments, and planned focus sessions together — with the user choosing
 * which categories appear.
 *
 * Everything here is derived. The calendar owns no records of its own; it
 * projects records that already exist onto days. That is what keeps a task's
 * due date and its calendar entry from ever disagreeing, and it means hiding a
 * category is a display choice that can never delete anything.
 */

import {
  dayKeyOf,
  dayKeyRange,
  daysBetween,
  monthStartKey,
  shiftDayKey,
  weekStartKey,
  type DayKey,
} from "./datetime";

/** The categories the user can show or hide independently. */
export type CalendarCategory =
  | "assignment"
  | "task"
  | "workout"
  | "habit"
  | "sleep"
  | "reminder"
  | "appointment"
  | "focus"
  | "bill";

export const ALL_CATEGORIES: CalendarCategory[] = [
  "assignment",
  "task",
  "workout",
  "habit",
  "sleep",
  "reminder",
  "appointment",
  "focus",
  "bill",
];

export type CalendarEvent = {
  id: string;
  category: CalendarCategory;
  title: string;
  /** The local day the event is filed under. */
  day: DayKey;
  /** Wall clock start, when the event has one. All-day events omit it. */
  time?: string;
  /** Last day of a multi-day event; absent for single-day events. */
  endDay?: DayKey;
  /** Already happened, submitted, or ticked off. */
  done?: boolean;
  /**
   * True when this is a projection of a recurring rule rather than a stored
   * record. Editing one needs to ask about the series, so the distinction has
   * to survive into the interface.
   */
  projected?: boolean;
  /** The record this came from, so a click can open the real thing. */
  sourceId?: string;
};

export type CategoryVisibility = Partial<Record<CalendarCategory, boolean>>;

/** Hidden only when explicitly switched off, so a new category shows by default. */
export function isVisible(
  category: CalendarCategory,
  visibility: CategoryVisibility
): boolean {
  return visibility[category] !== false;
}

export function filterVisible(
  events: CalendarEvent[],
  visibility: CategoryVisibility
): CalendarEvent[] {
  return events.filter(event => isVisible(event.category, visibility));
}

/**
 * Every day an event occupies. A sleep session or a trip spans days, and a
 * calendar that only marked the first one would hide the rest.
 */
export function eventDays(event: CalendarEvent): DayKey[] {
  if (!event.endDay || event.endDay === event.day) return [event.day];
  if (daysBetween(event.day, event.endDay) < 0) return [event.day];
  return dayKeyRange(event.day, event.endDay);
}

/** Events touching a given day, including multi-day ones passing through it. */
export function eventsOnDay(
  events: CalendarEvent[],
  day: DayKey
): CalendarEvent[] {
  return sortDayEvents(events.filter(event => eventDays(event).includes(day)));
}

/**
 * All-day items first, then timed items in clock order. Putting a 09:00
 * meeting above "Submit essay (due today)" would bury the thing that matters.
 */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (!a.time && b.time) return -1;
    if (a.time && !b.time) return 1;
    if (a.time && b.time && a.time !== b.time)
      return a.time.localeCompare(b.time);
    return a.title.localeCompare(b.title);
  });
}

export type CalendarDay = {
  day: DayKey;
  events: CalendarEvent[];
  /** False for the leading and trailing days of a month grid. */
  inPeriod: boolean;
  isToday: boolean;
};

/**
 * A month grid padded to whole weeks.
 *
 * The padding days are real days carrying real events, marked `inPeriod:
 * false` so they can be dimmed. Blanking them would hide an assignment due on
 * the 1st from someone looking at the previous month's last week.
 */
export function monthGrid({
  events,
  month,
  today,
  weekStartsOn = 1,
  visibility = {},
}: {
  events: CalendarEvent[];
  /** Any day in the wanted month. */
  month: DayKey;
  today: DayKey;
  weekStartsOn?: number;
  visibility?: CategoryVisibility;
}): CalendarDay[] {
  const visible = filterVisible(events, visibility);
  const first = monthStartKey(month);
  const nextMonthFirst = monthStartKey(shiftDayKey(first, 32));
  const last = shiftDayKey(nextMonthFirst, -1);

  const gridStart = weekStartKey(first, weekStartsOn);
  let gridEnd = weekStartKey(last, weekStartsOn);
  gridEnd = shiftDayKey(gridEnd, 6);

  const monthPrefix = first.slice(0, 7);

  return dayKeyRange(gridStart, gridEnd).map(day => ({
    day,
    events: eventsOnDay(visible, day),
    inPeriod: day.slice(0, 7) === monthPrefix,
    isToday: day === today,
  }));
}

/** A flat agenda over a range — the list view, and what Today reads from. */
export function agenda({
  events,
  from,
  to,
  today,
  visibility = {},
}: {
  events: CalendarEvent[];
  from: DayKey;
  to: DayKey;
  today: DayKey;
  visibility?: CategoryVisibility;
}): CalendarDay[] {
  const visible = filterVisible(events, visibility);
  return dayKeyRange(from, to).map(day => ({
    day,
    events: eventsOnDay(visible, day),
    inPeriod: true,
    isToday: day === today,
  }));
}

/** Agenda with empty days dropped, for a compact "what's coming" list. */
export function upcoming({
  events,
  today,
  days = 7,
  visibility = {},
}: {
  events: CalendarEvent[];
  today: DayKey;
  days?: number;
  visibility?: CategoryVisibility;
}): CalendarDay[] {
  return agenda({
    events,
    from: today,
    to: shiftDayKey(today, Math.max(0, days - 1)),
    today,
    visibility,
  }).filter(entry => entry.events.length > 0);
}

/**
 * Builds events from records of one scope.
 *
 * Each page hands over a small mapping rather than a calendar-shaped copy of
 * its data, so adding a page to the calendar never means duplicating its
 * records.
 */
export function projectRecords<T>({
  records,
  category,
  title,
  day,
  time,
  endDay,
  done,
  id,
}: {
  records: T[];
  category: CalendarCategory;
  title: (record: T) => string;
  day: (record: T) => DayKey | undefined;
  time?: (record: T) => string | undefined;
  endDay?: (record: T) => DayKey | undefined;
  done?: (record: T) => boolean;
  id: (record: T) => string;
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const record of records) {
    const on = day(record);
    // A task with no due date belongs on no day; it is not a calendar entry.
    if (!on) continue;

    events.push({
      id: `${category}:${id(record)}`,
      sourceId: id(record),
      category,
      title: title(record),
      day: on,
      time: time?.(record),
      endDay: endDay?.(record),
      done: done?.(record),
    });
  }

  return events;
}

/** Turns a record's start and end instants into a possibly multi-day event. */
export function projectPeriod({
  id,
  category,
  title,
  start,
  end,
  timezone,
}: {
  id: string;
  category: CalendarCategory;
  title: string;
  start: string;
  end?: string;
  timezone: string;
}): CalendarEvent {
  const day = dayKeyOf(start, timezone);
  const endDay = end ? dayKeyOf(end, timezone) : undefined;
  return {
    id: `${category}:${id}`,
    sourceId: id,
    category,
    title,
    day,
    endDay: endDay && endDay !== day ? endDay : undefined,
  };
}

/** How many of each category fall in a range, for the visibility toggles. */
export function categoryCounts(
  events: CalendarEvent[],
  from: DayKey,
  to: DayKey
): Record<CalendarCategory, number> {
  const counts = Object.fromEntries(
    ALL_CATEGORIES.map(category => [category, 0])
  ) as Record<CalendarCategory, number>;

  for (const event of events) {
    if (eventDays(event).some(day => day >= from && day <= to)) {
      counts[event.category] += 1;
    }
  }
  return counts;
}
