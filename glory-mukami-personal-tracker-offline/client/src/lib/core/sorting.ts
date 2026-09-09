/**
 * The priority sorting matrix and the item status machine.
 *
 * Two requirements meet here: sorting tasks on several variables at once
 * (due date, area, priority), and moving items between active lists and a
 * completed archive on a defined transition rather than ad hoc.
 *
 * Sorting is expressed as an ordered list of comparators so the precedence
 * between "due soonest" and "highest priority" is a stated decision rather
 * than an accident of how the comparator happened to be written.
 */

import { daysBetween, isFutureDay, type DayKey } from "./datetime";

export type Priority = "urgent" | "high" | "normal" | "low";

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export type ItemStatus =
  | "not-started"
  | "in-progress"
  | "submitted"
  | "completed"
  | "deferred"
  | "archived";

export type SortableItem = {
  id: string;
  title: string;
  status: ItemStatus;
  priority?: Priority;
  dueDay?: DayKey;
  area?: string;
  createdAt?: string;
  completedAt?: string;
};

/**
 * Which statuses count as still needing the user's attention. `submitted` is
 * open on purpose: the work has left the user's hands but the item is not
 * resolved, and hiding it would lose the fact that it is awaiting a result.
 */
const OPEN_STATUSES = new Set<ItemStatus>([
  "not-started",
  "in-progress",
  "submitted",
]);

export function isOpen(item: SortableItem): boolean {
  return OPEN_STATUSES.has(item.status);
}

/**
 * Overdue is derived, never stored. A status field holding "overdue" goes
 * stale the moment the clock passes midnight and nobody re-saves the record.
 */
export function isOverdue(item: SortableItem, today: DayKey): boolean {
  if (!item.dueDay || !isOpen(item)) return false;
  return daysBetween(today, item.dueDay) < 0;
}

export type SortKey = "due" | "priority" | "area" | "title" | "created";

type Comparator = (a: SortableItem, b: SortableItem) => number;

const byDue: Comparator = (a, b) => {
  // An item with no due date is not urgent, so it sorts after dated ones
  // rather than to the top as an empty string would.
  if (!a.dueDay && !b.dueDay) return 0;
  if (!a.dueDay) return 1;
  if (!b.dueDay) return -1;
  return a.dueDay.localeCompare(b.dueDay);
};

const byPriority: Comparator = (a, b) =>
  PRIORITY_ORDER[a.priority ?? "normal"] -
  PRIORITY_ORDER[b.priority ?? "normal"];

const byArea: Comparator = (a, b) => (a.area ?? "").localeCompare(b.area ?? "");
const byTitle: Comparator = (a, b) => a.title.localeCompare(b.title);
const byCreated: Comparator = (a, b) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

const COMPARATORS: Record<SortKey, Comparator> = {
  due: byDue,
  priority: byPriority,
  area: byArea,
  title: byTitle,
  created: byCreated,
};

/**
 * Sorts on several keys in the given order of precedence, falling back to the
 * title so the order is stable and does not shuffle between renders.
 */
export function sortItems<T extends SortableItem>(
  items: T[],
  keys: SortKey[] = ["due", "priority", "title"]
): T[] {
  const comparators = keys.map(key => COMPARATORS[key]);
  return [...items].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return byTitle(a, b);
  });
}

export type ItemGroup =
  | "overdue"
  | "today"
  | "upcoming"
  | "someday"
  | "completed";

/**
 * The groups the requirements ask to be clearly separated. Overdue is listed
 * first because it is the only group where something has already gone wrong.
 */
export function groupItem(item: SortableItem, today: DayKey): ItemGroup {
  if (!isOpen(item)) return "completed";
  if (!item.dueDay) return "someday";
  if (isOverdue(item, today)) return "overdue";
  if (item.dueDay === today) return "today";
  return "upcoming";
}

export function groupItems<T extends SortableItem>(
  items: T[],
  today: DayKey,
  keys?: SortKey[]
): Record<ItemGroup, T[]> {
  const groups: Record<ItemGroup, T[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    someday: [],
    completed: [],
  };
  for (const item of sortItems(items, keys)) {
    groups[groupItem(item, today)].push(item);
  }
  return groups;
}

/**
 * Allowed status transitions.
 *
 * Completion is reversible: the acceptance criteria require completing a task,
 * undoing it, and restoring it, which is impossible if `completed` is a dead
 * end. Only `archived` is close to terminal, and even it can be brought back.
 */
const TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  "not-started": [
    "in-progress",
    "submitted",
    "completed",
    "deferred",
    "archived",
  ],
  "in-progress": [
    "not-started",
    "submitted",
    "completed",
    "deferred",
    "archived",
  ],
  submitted: ["in-progress", "completed", "archived"],
  completed: ["in-progress", "not-started", "archived"],
  deferred: ["not-started", "in-progress", "completed", "archived"],
  archived: ["not-started", "in-progress"],
};

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Applies a status change, keeping `completedAt` truthful in both directions.
 * Reopening an item clears the completion stamp — leaving it behind is how a
 * "completed on" date ends up shown against an open task.
 */
export function transition<T extends SortableItem>(
  item: T,
  to: ItemStatus,
  now: string = new Date().toISOString()
): T {
  if (item.status === to) return item;
  if (!canTransition(item.status, to)) {
    throw new Error(`Cannot move an item from ${item.status} to ${to}.`);
  }

  const next = { ...item, status: to } as T;
  if (to === "completed") {
    next.completedAt = now;
  } else if (item.status === "completed") {
    delete next.completedAt;
  }
  return next;
}

/** Items whose completion is old enough to move out of the active list. */
export function archivable<T extends SortableItem>(
  items: T[],
  today: DayKey,
  afterDays = 30
): T[] {
  return items.filter(item => {
    if (item.status !== "completed" || !item.completedAt) return false;
    const day = item.completedAt.slice(0, 10);
    return daysBetween(day, today) >= afterDays;
  });
}

/**
 * The exact date paired with a relative label. The requirements ask for both:
 * a relative label alone hides which day is meant, and a date alone makes the
 * reader work out how soon it is.
 */
export function dueLabel(
  item: SortableItem,
  today: DayKey
): { relative: string; overdue: boolean; exact?: DayKey } {
  if (!item.dueDay) return { relative: "No date", overdue: false };

  const delta = daysBetween(today, item.dueDay);
  const overdue = isOverdue(item, today);

  let relative: string;
  if (overdue) {
    const late = Math.abs(delta);
    relative = `${late} day${late === 1 ? "" : "s"} overdue`;
  } else if (delta === 0) {
    relative = "Due today";
  } else if (delta === 1) {
    relative = "Due tomorrow";
  } else if (isFutureDay(item.dueDay, today)) {
    relative = `Due in ${delta} days`;
  } else {
    relative = "Due";
  }

  return { relative, overdue, exact: item.dueDay };
}
