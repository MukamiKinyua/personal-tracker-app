/**
 * The Today page.
 *
 * The requirement is a page combining "only the information needed now", which
 * is a constraint rather than a feature list: the value of Today is everything
 * it leaves out. Two rules follow, and both are enforced here rather than left
 * to whoever writes the markup.
 *
 * First, nothing appears unless the user could act on it today. A habit not
 * scheduled for today, a task due next month, and a chapter with nothing
 * outstanding all stay off the page.
 *
 * Second, each section is capped. An honest "and 14 more" is more usable than
 * a list nobody reads to the bottom of, and it keeps a bad week from turning
 * Today into a wall of failure.
 */

import { type CalendarEvent, eventsOnDay } from "./calendar";
import { relativeDayLabel, type DayKey } from "./datetime";
import { groupItems, isOverdue, type SortableItem } from "./sorting";
import {
  classifyDay,
  isDueOn,
  type HabitDayState,
  type Schedule,
} from "./streaks";

/** How many items each section shows before it summarises the remainder. */
export const SECTION_LIMIT = 5;

export type TodayHabit = {
  id: string;
  title: string;
  schedule: Schedule;
  /** What was logged for today, if anything. */
  state?: HabitDayState;
};

export type TodaySection<T> = {
  items: T[];
  /** How many were left out by the cap. */
  overflow: number;
  total: number;
};

function cap<T>(items: T[], limit = SECTION_LIMIT): TodaySection<T> {
  return {
    items: items.slice(0, limit),
    overflow: Math.max(0, items.length - limit),
    total: items.length,
  };
}

export type TodayView = {
  day: DayKey;
  overdue: TodaySection<SortableItem>;
  dueToday: TodaySection<SortableItem>;
  habits: TodaySection<TodayHabit>;
  events: TodaySection<CalendarEvent>;
  /** Trackers the user follows that hold nothing for today yet. */
  notLoggedYet: string[];
  /** Nothing outstanding at all — a real state, not an error. */
  isClear: boolean;
};

export function buildToday({
  today,
  items = [],
  habits = [],
  events = [],
  trackedScopes = [],
  loggedScopes = [],
  limit = SECTION_LIMIT,
}: {
  today: DayKey;
  items?: SortableItem[];
  habits?: TodayHabit[];
  events?: CalendarEvent[];
  /** Scopes the user has chosen to track. */
  trackedScopes?: string[];
  /** Scopes with at least one record today. */
  loggedScopes?: string[];
  limit?: number;
}): TodayView {
  const grouped = groupItems(items, today);

  // Only habits actually scheduled for today, and only ones still open.
  const dueHabits = habits.filter(habit => {
    if (!isDueOn(habit.schedule, today)) return false;
    return classifyDay(habit.state) === "broken";
  });

  const todayEvents = eventsOnDay(events, today).filter(event => !event.done);

  const notLoggedYet = trackedScopes.filter(
    scope => !loggedScopes.includes(scope)
  );

  const overdue = cap(grouped.overdue, limit);
  const dueToday = cap(grouped.today, limit);
  const habitSection = cap(dueHabits, limit);
  const eventSection = cap(todayEvents, limit);

  return {
    day: today,
    overdue,
    dueToday,
    habits: habitSection,
    events: eventSection,
    notLoggedYet,
    isClear:
      overdue.total === 0 &&
      dueToday.total === 0 &&
      habitSection.total === 0 &&
      eventSection.total === 0,
  };
}

/** "and 14 more" — shown only when something was actually held back. */
export function overflowLabel(section: TodaySection<unknown>): string | null {
  if (section.overflow === 0) return null;
  return `and ${section.overflow} more`;
}

export type Briefing = {
  greeting: string;
  /** The single most pressing thing, if there is one. */
  headline: string;
  /** Short supporting lines. Never more than a few. */
  lines: string[];
};

/**
 * The daily briefing.
 *
 * Deliberately factual. It counts what is there and says so; it does not
 * grade the day, predict it, or congratulate anyone. A summary that opens with
 * praise or reproach stops being information the second the user disagrees
 * with it.
 */
export function buildBriefing({
  view,
  name,
  hourOfDay,
}: {
  view: TodayView;
  name?: string;
  /** Local hour, 0–23, used only to choose the greeting. */
  hourOfDay: number;
}): Briefing {
  const who = name ? `, ${name}` : "";
  const greeting =
    hourOfDay < 12
      ? `Good morning${who}`
      : hourOfDay < 18
        ? `Good afternoon${who}`
        : `Good evening${who}`;

  const lines: string[] = [];

  if (view.overdue.total > 0) {
    lines.push(
      `${view.overdue.total} overdue item${view.overdue.total === 1 ? "" : "s"}`
    );
  }
  if (view.dueToday.total > 0) {
    lines.push(`${view.dueToday.total} due today`);
  }
  if (view.habits.total > 0) {
    lines.push(
      `${view.habits.total} habit${view.habits.total === 1 ? "" : "s"} still open`
    );
  }
  if (view.events.total > 0) {
    lines.push(
      `${view.events.total} thing${view.events.total === 1 ? "" : "s"} on the calendar`
    );
  }

  const headline = headlineFor(view);

  return { greeting, headline, lines };
}

function headlineFor(view: TodayView): string {
  // Overdue first: it is the only category where something has already slipped.
  const firstOverdue = view.overdue.items[0];
  if (firstOverdue) return firstOverdue.title;

  const firstDue = view.dueToday.items[0];
  if (firstDue) return firstDue.title;

  const firstEvent = view.events.items[0];
  if (firstEvent) return firstEvent.title;

  const firstHabit = view.habits.items[0];
  if (firstHabit) return firstHabit.title;

  return "Nothing is asking for you today.";
}

/**
 * A one-line description of an item for the Today list, pairing what it is
 * with when it is due. The exact date stays available to the caller; this is
 * the compact form for a dense list.
 */
export function todayItemLabel(item: SortableItem, today: DayKey): string {
  if (!item.dueDay) return item.title;
  if (isOverdue(item, today)) {
    return `${item.title} — ${relativeDayLabel(item.dueDay, today).toLowerCase()}`;
  }
  if (item.dueDay === today) return item.title;
  return `${item.title} — ${relativeDayLabel(item.dueDay, today).toLowerCase()}`;
}

/**
 * Wording for the empty page. A clear day is an outcome worth showing plainly,
 * not an absence to apologise for.
 */
export function clearDayMessage(view: TodayView): string {
  if (!view.isClear) return "";
  return view.notLoggedYet.length > 0
    ? "Nothing is due today. You can still log how the day went."
    : "Nothing is due today.";
}
