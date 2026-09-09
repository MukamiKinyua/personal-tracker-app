/**
 * The relationship graph between records.
 *
 * Section 6 makes the case that the product is worth much more when records
 * connect than when each page is a silo, and lists the minimum useful
 * relationships. This module holds that table as data so a link can be
 * validated, followed in either direction, and rendered as a small contextual
 * reference rather than a database screen.
 */

export type EntityKind =
  | "task"
  | "habit"
  | "focus-session"
  | "reflection"
  | "expense"
  | "learning-session"
  | "workout"
  | "sleep"
  | "meal"
  | "water"
  | "assignment"
  | "goal"
  | "project"
  | "course"
  | "skill"
  | "resource"
  | "routine"
  | "reminder"
  | "calendar-event"
  | "category"
  | "account"
  | "recurring-bill"
  | "wellbeing"
  | "movement-goal"
  | "recovery-note"
  | "screen-time"
  | "integration"
  | "sync-job"
  | "permission-scope"
  | "tag";

/**
 * Which kinds may be linked to which. Read as "a task may point at a project,
 * a goal, a habit…". Links are declared in one direction here and resolved in
 * both by `canLink`, because the user thinks of them as one connection.
 */
export const LINK_MATRIX: Record<EntityKind, EntityKind[]> = {
  task: [
    "project",
    "goal",
    "habit",
    "assignment",
    "focus-session",
    "calendar-event",
  ],
  habit: ["goal", "routine", "reminder", "calendar-event", "wellbeing"],
  "focus-session": ["task", "project", "assignment", "skill"],
  reflection: ["wellbeing", "sleep", "tag", "goal", "project"],
  expense: ["category", "account", "project", "recurring-bill"],
  "learning-session": ["skill", "project", "resource", "focus-session"],
  workout: ["movement-goal", "recovery-note", "habit", "calendar-event"],
  sleep: ["wellbeing", "screen-time", "workout"],
  meal: ["wellbeing", "goal"],
  water: ["wellbeing", "goal"],
  assignment: ["course", "task", "calendar-event", "focus-session"],
  goal: ["habit", "task", "project"],
  project: [
    "task",
    "learning-session",
    "expense",
    "focus-session",
    "reflection",
  ],
  course: ["assignment"],
  skill: ["learning-session", "focus-session", "resource", "project"],
  resource: ["skill", "learning-session"],
  routine: ["habit"],
  reminder: ["habit", "task", "recurring-bill", "assignment"],
  "calendar-event": ["task", "habit", "assignment", "workout"],
  category: ["expense"],
  account: ["expense"],
  "recurring-bill": ["expense", "reminder"],
  wellbeing: ["reflection", "sleep", "habit", "meal", "water"],
  "movement-goal": ["workout"],
  "recovery-note": ["workout"],
  "screen-time": ["sleep"],
  integration: ["sync-job", "permission-scope"],
  "sync-job": ["integration"],
  "permission-scope": ["integration"],
  tag: ["reflection"],
};

export type RecordLink = {
  fromKind: EntityKind;
  fromId: string;
  toKind: EntityKind;
  toId: string;
  createdAt: string;
};

/** Links are symmetric to the user, so either declared direction counts. */
export function canLink(from: EntityKind, to: EntityKind): boolean {
  return (
    (LINK_MATRIX[from]?.includes(to) ?? false) ||
    (LINK_MATRIX[to]?.includes(from) ?? false)
  );
}

export function createLink(
  fromKind: EntityKind,
  fromId: string,
  toKind: EntityKind,
  toId: string,
  now: Date = new Date()
): RecordLink {
  if (!canLink(fromKind, toKind)) {
    throw new Error(`A ${fromKind} cannot be linked to a ${toKind}.`);
  }
  return { fromKind, fromId, toKind, toId, createdAt: now.toISOString() };
}

function sameLink(a: RecordLink, b: RecordLink): boolean {
  const forward =
    a.fromKind === b.fromKind &&
    a.fromId === b.fromId &&
    a.toKind === b.toKind &&
    a.toId === b.toId;
  const backward =
    a.fromKind === b.toKind &&
    a.fromId === b.toId &&
    a.toKind === b.fromKind &&
    a.toId === b.fromId;
  return forward || backward;
}

export function addLink(links: RecordLink[], link: RecordLink): RecordLink[] {
  return links.some(existing => sameLink(existing, link))
    ? links
    : [...links, link];
}

export function removeLink(
  links: RecordLink[],
  link: RecordLink
): RecordLink[] {
  return links.filter(existing => !sameLink(existing, link));
}

export type LinkedRef = { kind: EntityKind; id: string };

/**
 * Everything connected to one record, in either direction. This is what a page
 * shows as "Part of: Finish dissertation" under a task without the user
 * needing to think about a join.
 */
export function linksFor(
  links: RecordLink[],
  kind: EntityKind,
  id: string
): LinkedRef[] {
  const refs: LinkedRef[] = [];
  for (const link of links) {
    if (link.fromKind === kind && link.fromId === id) {
      refs.push({ kind: link.toKind, id: link.toId });
    } else if (link.toKind === kind && link.toId === id) {
      refs.push({ kind: link.fromKind, id: link.fromId });
    }
  }
  return refs;
}

/** Links of one particular kind, e.g. every task under a goal. */
export function linkedOfKind(
  links: RecordLink[],
  kind: EntityKind,
  id: string,
  wanted: EntityKind
): string[] {
  return linksFor(links, kind, id)
    .filter(ref => ref.kind === wanted)
    .map(ref => ref.id);
}

/** Drops every link touching a record that has been permanently removed. */
export function pruneLinks(
  links: RecordLink[],
  kind: EntityKind,
  id: string
): RecordLink[] {
  return links.filter(
    link =>
      !(link.fromKind === kind && link.fromId === id) &&
      !(link.toKind === kind && link.toId === id)
  );
}

/** Singular, human wording for a link chip. */
export const ENTITY_LABEL: Record<EntityKind, string> = {
  task: "Task",
  habit: "Habit",
  "focus-session": "Focus session",
  reflection: "Reflection",
  expense: "Transaction",
  "learning-session": "Practice session",
  workout: "Workout",
  sleep: "Sleep record",
  meal: "Meal",
  water: "Water",
  assignment: "Assignment",
  goal: "Goal",
  project: "Project",
  course: "Course",
  skill: "Skill",
  resource: "Resource",
  routine: "Routine",
  reminder: "Reminder",
  "calendar-event": "Calendar event",
  category: "Category",
  account: "Account",
  "recurring-bill": "Recurring bill",
  wellbeing: "Mood & energy",
  "movement-goal": "Movement goal",
  "recovery-note": "Recovery note",
  "screen-time": "Screen time",
  integration: "Integration",
  "sync-job": "Sync job",
  "permission-scope": "Permission",
  tag: "Tag",
};
