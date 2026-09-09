/**
 * Priorities, and the step a goal is asking for today.
 *
 * Two requirements that only work together. The first: the user names a small
 * number of priorities, and the rest of the app uses them. The second: every
 * goal carries a next step, so the home page can surface one concrete thing —
 * "practise drawing for 15 minutes" — instead of letting goals decay into
 * forgotten notes.
 *
 * The cap on priorities is the point of the feature. Three things you have
 * decided matter is a decision; eleven is a list.
 */

import { daysBetween, type DayKey } from "./datetime";

export const MAX_PRIORITIES = 3;

export type Priority = {
  id: string;
  name: string;
  /** Why it matters, in the user's words. Optional. */
  reason?: string;
  createdAt: string;
};

let counter = 0;

export function createPriority(
  name: string,
  reason?: string,
  now = new Date()
): Priority {
  counter += 1;
  return {
    id: `pri_${counter.toString(36)}_${now.getTime().toString(36)}`,
    name: name.trim(),
    reason: reason?.trim() || undefined,
    createdAt: now.toISOString(),
  };
}

export type AddPriorityResult =
  | { ok: true; priorities: Priority[] }
  /** The cap is a feature, so refusing has to explain itself. */
  | { ok: false; reason: string; priorities: Priority[] };

export function addPriority(
  priorities: Priority[],
  priority: Priority
): AddPriorityResult {
  if (priorities.length >= MAX_PRIORITIES) {
    return {
      ok: false,
      priorities,
      reason: `You already have ${MAX_PRIORITIES}. Remove one to make room — that is the point of choosing.`,
    };
  }
  if (
    priorities.some(
      existing => existing.name.toLowerCase() === priority.name.toLowerCase()
    )
  ) {
    return {
      ok: false,
      priorities,
      reason: "That is already one of your priorities.",
    };
  }
  return { ok: true, priorities: [...priorities, priority] };
}

export function removePriority(priorities: Priority[], id: string): Priority[] {
  return priorities.filter(priority => priority.id !== id);
}

export function reorderPriority(
  priorities: Priority[],
  id: string,
  toIndex: number
): Priority[] {
  const from = priorities.findIndex(priority => priority.id === id);
  if (from === -1) return priorities;
  const clamped = Math.max(0, Math.min(priorities.length - 1, toIndex));
  if (clamped === from) return priorities;

  const next = [...priorities];
  const [moved] = next.splice(from, 1);
  next.splice(clamped, 0, moved);
  return next;
}

/**
 * How much of the user's recorded work actually sits under their stated
 * priorities.
 *
 * Reported as counts, never as a grade. A week spent on something unplanned is
 * information, not a failure, and the wording here has to leave room for that.
 */
export function priorityAlignment({
  priorities,
  items,
}: {
  priorities: Priority[];
  /** Anything with an optional priority id attached. */
  items: Array<{ priorityId?: string }>;
}): {
  byPriority: Array<{ priority: Priority; count: number }>;
  unassigned: number;
  total: number;
} {
  const counts = new Map<string, number>();
  let unassigned = 0;

  for (const item of items) {
    if (!item.priorityId) {
      unassigned += 1;
      continue;
    }
    counts.set(item.priorityId, (counts.get(item.priorityId) ?? 0) + 1);
  }

  return {
    byPriority: priorities.map(priority => ({
      priority,
      count: counts.get(priority.id) ?? 0,
    })),
    unassigned,
    total: items.length,
  };
}

export type GoalNextStep = {
  goalId: string;
  goalTitle: string;
  /** The concrete thing to do, small enough to actually do today. */
  step: string;
  /** Rough size, so Today can pick something that fits. */
  minutes?: number;
  targetDay?: DayKey;
  priorityId?: string;
  /** When the goal last moved, used to surface the neglected ones. */
  lastProgressOn?: DayKey;
};

/**
 * Picks the single step to put in front of the user today.
 *
 * Preference order: a step tied to a stated priority, then whichever goal has
 * gone longest without moving, then the nearest deadline. Surfacing the most
 * neglected goal is deliberate — the goals that quietly stop moving are
 * exactly the ones a tracker is supposed to catch.
 */
export function chooseTodayStep({
  steps,
  today,
  priorities = [],
}: {
  steps: GoalNextStep[];
  today: DayKey;
  priorities?: Priority[];
}): GoalNextStep | null {
  if (steps.length === 0) return null;

  const priorityIds = new Set(priorities.map(priority => priority.id));

  const scored = steps.map(step => {
    const underPriority = step.priorityId && priorityIds.has(step.priorityId);
    const staleness = step.lastProgressOn
      ? daysBetween(step.lastProgressOn, today)
      : 999;
    const urgency = step.targetDay ? -daysBetween(today, step.targetDay) : -999;

    return { step, underPriority: Boolean(underPriority), staleness, urgency };
  });

  scored.sort((a, b) => {
    if (a.underPriority !== b.underPriority) return a.underPriority ? -1 : 1;
    if (a.staleness !== b.staleness) return b.staleness - a.staleness;
    if (a.urgency !== b.urgency) return b.urgency - a.urgency;
    return a.step.goalTitle.localeCompare(b.step.goalTitle);
  });

  return scored[0].step;
}

/** Goals that have not moved in a while, stated without reproach. */
export function stalledGoals({
  steps,
  today,
  afterDays = 14,
}: {
  steps: GoalNextStep[];
  today: DayKey;
  afterDays?: number;
}): GoalNextStep[] {
  return steps.filter(step => {
    if (!step.lastProgressOn) return true;
    return daysBetween(step.lastProgressOn, today) >= afterDays;
  });
}

/** The line Today shows above the chosen step. */
export function todayStepLabel(step: GoalNextStep | null): string {
  if (!step) return "No next step set. You can add one to any goal.";
  return step.minutes
    ? `${step.step} (about ${step.minutes} minutes) — towards ${step.goalTitle}`
    : `${step.step} — towards ${step.goalTitle}`;
}
