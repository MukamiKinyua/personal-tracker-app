/**
 * What the home-screen widgets are allowed to say.
 *
 * Every widget is drawn by native code from one small summary the app writes.
 * The decision about *how much to reveal* is made here, in the app, before the
 * summary is written - so the native side can never leak more than this
 * function chose to give it. A home screen is looked at by anyone holding the
 * phone, so the defaults lean private: task and reminder titles appear only
 * when "what a reminder reveals" is set to show everything and Privacy mode is
 * off. Otherwise a widget says "Task" or "Assignment", and still shows the
 * dates and counts that make it useful.
 */

import type { PreviewMode, UpcomingItem } from "./eventReminders";
import { parseLocal } from "./eventReminders";

export type WidgetUpcoming = { label: string; when: string };

export type WidgetExtras = {
  /** Up to four open tasks, today's first. Titles only when allowed. */
  tasks: string[];
  /** Up to three dated items, soonest first. */
  upcoming: WidgetUpcoming[];
  /** Last night's sleep, or null when there is none or it is hidden. */
  sleep: { hours: number; quality: string } | null;
  /** True when Privacy mode is hiding detail, so a widget can say so. */
  hidden: boolean;
};

export type WidgetTaskInput = { title: string; done: boolean; when: string };
export type WidgetSleepInput = { hours: number; quality: string; start: string };

export const MAX_WIDGET_TASKS = 4;
export const MAX_WIDGET_UPCOMING = 3;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "Today", "Tomorrow", "Thu 15", then "15 Nov" once it is a week or more away. */
export function relativeDay(target: Date, now: Date): string {
  const days = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / 86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `${WEEKDAYS[target.getDay()]} ${target.getDate()}`;
  return `${target.getDate()} ${MONTHS[target.getMonth()]}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** When an item falls, and whether it carries a clock time to show. */
function itemMoment(item: UpcomingItem): { at: Date; time: boolean } | null {
  if (item.source === "reminder") {
    return typeof item.atMs === "number"
      ? { at: new Date(item.atMs), time: true }
      : null;
  }
  const parsed = parseLocal(item.date);
  if (!parsed) return null;
  return {
    at: new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d,
      parsed.time?.hour ?? 0,
      parsed.time?.minute ?? 0
    ),
    time: Boolean(parsed.time),
  };
}

const NOUN: Record<UpcomingItem["source"], string> = {
  assignment: "Assignment",
  document: "Document",
  reminder: "Reminder",
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildWidgetExtras({
  tasks,
  sleep,
  items,
  previewMode,
  privacyMode,
  now = new Date(),
}: {
  tasks: WidgetTaskInput[];
  sleep: WidgetSleepInput[];
  items: UpcomingItem[];
  previewMode: PreviewMode;
  privacyMode: boolean;
  now?: Date;
}): WidgetExtras {
  const showTitles = !privacyMode && previewMode === "Show everything";

  const open = tasks.filter(task => !task.done);
  // Today's first, then the rest in the order they were given.
  const ordered = [
    ...open.filter(task => task.when === "today"),
    ...open.filter(task => task.when !== "today"),
  ];
  const taskLines = privacyMode
    ? []
    : ordered
        .slice(0, MAX_WIDGET_TASKS)
        .map(task => (showTitles ? truncate(task.title.trim() || "Task", 40) : "Task"));

  const today = startOfDay(now).getTime();
  const upcoming = items
    .map(item => ({ item, moment: itemMoment(item) }))
    .filter(
      (entry): entry is { item: UpcomingItem; moment: { at: Date; time: boolean } } =>
        entry.moment !== null && startOfDay(entry.moment.at).getTime() >= today
    )
    .sort((a, b) => a.moment.at.getTime() - b.moment.at.getTime())
    .slice(0, MAX_WIDGET_UPCOMING)
    .map(({ item, moment }) => ({
      label: showTitles ? truncate(item.title.trim() || NOUN[item.source], 40) : NOUN[item.source],
      when:
        relativeDay(moment.at, now) +
        (moment.time ? ` ${pad(moment.at.getHours())}:${pad(moment.at.getMinutes())}` : ""),
    }));

  const latest = [...sleep].sort((a, b) => b.start.localeCompare(a.start))[0];
  const lastNight =
    privacyMode || !latest || !(latest.hours > 0)
      ? null
      : { hours: Math.round(latest.hours * 10) / 10, quality: latest.quality };

  return { tasks: taskLines, upcoming, sleep: lastNight, hidden: privacyMode };
}
