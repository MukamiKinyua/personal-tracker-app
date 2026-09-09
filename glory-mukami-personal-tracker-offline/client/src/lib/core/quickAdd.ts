/**
 * The universal "+".
 *
 * One button, available anywhere, that records anything without the user
 * having to remember which chapter a thing belongs to. That last point is the
 * whole justification: a person who has just finished a workout should not
 * have to navigate to Body → Workout Studio before the app will listen.
 *
 * Actions are declared as data so the same list drives the "+" menu, the
 * command palette, and any keyboard shortcut, without three places drifting
 * apart.
 */

import type { TrackedArea } from "./preferences";

export type QuickAddKind =
  | "journal"
  | "task"
  | "habit"
  | "mood"
  | "workout"
  | "water"
  | "meal"
  | "sleep"
  | "focus"
  | "goal"
  | "expense"
  | "note";

export type QuickAddAction = {
  kind: QuickAddKind;
  label: string;
  /** The scope the new record lands in. */
  scope: string;
  /** Hidden when the user does not track this area. */
  requiresArea?: TrackedArea;
  /**
   * True when the action can complete in a single tap with no form — these
   * are what make the "+" fast, and they sort first.
   */
  oneTap: boolean;
  /** Single letter for a keyboard shortcut inside the menu. */
  shortcut?: string;
};

export const QUICK_ADD_ACTIONS: QuickAddAction[] = [
  {
    kind: "water",
    label: "Log water",
    scope: "water",
    requiresArea: "water",
    oneTap: true,
    shortcut: "w",
  },
  {
    kind: "mood",
    label: "Mood check",
    scope: "wellbeing",
    requiresArea: "wellbeing",
    oneTap: true,
    shortcut: "m",
  },
  {
    kind: "habit",
    label: "Tick a habit",
    scope: "habit",
    requiresArea: "habits",
    oneTap: true,
    shortcut: "h",
  },
  {
    kind: "journal",
    label: "Journal entry",
    scope: "reflection",
    oneTap: false,
    shortcut: "j",
  },
  {
    kind: "task",
    label: "New task",
    scope: "task",
    requiresArea: "tasks",
    oneTap: false,
    shortcut: "t",
  },
  {
    kind: "workout",
    label: "Log workout",
    scope: "workout",
    requiresArea: "workouts",
    oneTap: false,
    shortcut: "k",
  },
  {
    kind: "meal",
    label: "Log a meal",
    scope: "meal",
    requiresArea: "nutrition",
    oneTap: false,
    shortcut: "e",
  },
  {
    kind: "sleep",
    label: "Log sleep",
    scope: "sleep",
    requiresArea: "sleep",
    oneTap: false,
    shortcut: "s",
  },
  {
    kind: "focus",
    label: "Start focus",
    scope: "focus",
    requiresArea: "focus",
    oneTap: true,
    shortcut: "f",
  },
  {
    kind: "goal",
    label: "Add a goal",
    scope: "goal",
    requiresArea: "goals",
    oneTap: false,
    shortcut: "g",
  },
  {
    kind: "expense",
    label: "Log spending",
    scope: "finances",
    requiresArea: "finances",
    oneTap: false,
    shortcut: "x",
  },
  {
    kind: "note",
    label: "Quick note",
    scope: "reflection",
    oneTap: false,
    shortcut: "n",
  },
];

export function quickAddAction(kind: QuickAddKind): QuickAddAction | undefined {
  return QUICK_ADD_ACTIONS.find(action => action.kind === kind);
}

/**
 * The menu for this user.
 *
 * Recently used actions come first, then the one-tap ones. Someone who logs
 * water twelve times a day should not scroll past "Add a goal" to reach it.
 */
export function quickAddMenu({
  trackedAreas,
  recentKinds = [],
  limit,
}: {
  trackedAreas: string[];
  /** Most recently used first. */
  recentKinds?: QuickAddKind[];
  limit?: number;
}): QuickAddAction[] {
  const available = QUICK_ADD_ACTIONS.filter(action => {
    if (!action.requiresArea) return true;
    return trackedAreas.includes(action.requiresArea);
  });

  const rank = (action: QuickAddAction): number => {
    const recent = recentKinds.indexOf(action.kind);
    if (recent !== -1) return recent;
    // Everything unused sorts after everything used.
    return recentKinds.length + (action.oneTap ? 0 : 100);
  };

  const sorted = [...available].sort((a, b) => {
    const difference = rank(a) - rank(b);
    if (difference !== 0) return difference;
    return a.label.localeCompare(b.label);
  });

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/** Remembers what was used, newest first, without unbounded growth. */
export function rememberUse(
  recentKinds: QuickAddKind[],
  kind: QuickAddKind,
  keep = 5
): QuickAddKind[] {
  return [kind, ...recentKinds.filter(existing => existing !== kind)].slice(
    0,
    keep
  );
}

/**
 * The defaults a one-tap action uses, so it needs no form.
 *
 * These are the user's own last-used values rather than fixed constants: the
 * point of one tap is that it records what this person usually records.
 */
export type QuickAddDefaults = {
  waterMl?: number;
  focusMinutes?: number;
  moodScaleMax?: number;
};

export const FALLBACK_DEFAULTS: Required<QuickAddDefaults> = {
  waterMl: 250,
  focusMinutes: 25,
  moodScaleMax: 5,
};

export function resolveDefaults(
  saved: QuickAddDefaults = {}
): Required<QuickAddDefaults> {
  return { ...FALLBACK_DEFAULTS, ...saved };
}

/**
 * The body a one-tap action records. Returned as data rather than written
 * here, so the caller puts it through the same record store — and therefore
 * the same undo, save state, and sync — as anything else.
 */
export function oneTapBody(
  kind: QuickAddKind,
  defaults: Required<QuickAddDefaults>
): Record<string, unknown> | null {
  switch (kind) {
    case "water":
      return { amountMl: defaults.waterMl };
    case "focus":
      return { plannedMinutes: defaults.focusMinutes, outcome: "started" };
    default:
      // Everything else needs at least one decision from the user.
      return null;
  }
}

/** Wording for the confirmation and its Undo toast. */
export function quickAddUndoLabel(
  kind: QuickAddKind,
  body: Record<string, unknown>
): string {
  if (kind === "water" && typeof body.amountMl === "number") {
    return `Added ${body.amountMl} ml`;
  }
  return `Added ${quickAddAction(kind)?.label.toLowerCase() ?? "entry"}`;
}
