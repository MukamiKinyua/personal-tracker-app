/**
 * A shared undo stack.
 *
 * Requirement 2.6 asks destructive and state-changing actions to offer Undo,
 * and 3.4, 3.6, and 3.15 name it explicitly for workout completion, every
 * water quick-add, and task completion or deletion. Acceptance scenario 5
 * requires completing a task, undoing it, and restoring it in sequence.
 *
 * The stack stores the state needed to reverse an action rather than a
 * closure, so an undo entry can be inspected, tested, and survive a re-render.
 */

export type UndoAction<TPayload = unknown> = {
  id: string;
  /** Shown in the toast, e.g. "Removed 250 ml". */
  label: string;
  scope: string;
  createdAt: number;
  /** After this the entry is dropped; the toast has gone by then. */
  expiresAt: number;
  /** Everything needed to reverse the action. */
  payload: TPayload;
};

export type UndoStack = {
  entries: UndoAction[];
  limit: number;
};

/** Long enough to notice a mistake, short enough not to accumulate. */
export const DEFAULT_UNDO_WINDOW_MS = 10_000;

export function createUndoStack(limit = 10): UndoStack {
  return { entries: [], limit };
}

export function pushUndo<TPayload>(
  stack: UndoStack,
  action: Omit<UndoAction<TPayload>, "createdAt" | "expiresAt"> & {
    windowMs?: number;
  },
  now: number = Date.now()
): UndoStack {
  const { windowMs = DEFAULT_UNDO_WINDOW_MS, ...rest } = action;
  const entry: UndoAction<TPayload> = {
    ...rest,
    createdAt: now,
    expiresAt: now + windowMs,
  };
  const live = pruneExpired(stack, now).entries;
  return {
    ...stack,
    entries: [entry as UndoAction, ...live].slice(0, stack.limit),
  };
}

/** Drops entries whose window has closed. */
export function pruneExpired(
  stack: UndoStack,
  now: number = Date.now()
): UndoStack {
  const entries = stack.entries.filter(entry => entry.expiresAt > now);
  return entries.length === stack.entries.length
    ? stack
    : { ...stack, entries };
}

/**
 * Takes the most recent still-valid entry. Returns the entry and the stack
 * without it; an expired entry is never returned, so a stale toast cannot undo
 * something the user has since moved past.
 */
export function popUndo(
  stack: UndoStack,
  now: number = Date.now()
): { action?: UndoAction; stack: UndoStack } {
  const live = pruneExpired(stack, now);
  const [action, ...rest] = live.entries;
  if (!action) return { stack: live };
  return { action, stack: { ...live, entries: rest } };
}

/** Takes one specific entry, for a toast that is still on screen. */
export function takeUndo(
  stack: UndoStack,
  id: string,
  now: number = Date.now()
): { action?: UndoAction; stack: UndoStack } {
  const live = pruneExpired(stack, now);
  const action = live.entries.find(entry => entry.id === id);
  if (!action) return { stack: live };
  return {
    action,
    stack: { ...live, entries: live.entries.filter(entry => entry.id !== id) },
  };
}

export function clearScope(stack: UndoStack, scope: string): UndoStack {
  return {
    ...stack,
    entries: stack.entries.filter(entry => entry.scope !== scope),
  };
}

/**
 * The kinds of reversal the record store knows how to apply. Keeping these as
 * data means an undo can be replayed and tested without a live page.
 */
export type RecordUndoPayload =
  | { kind: "restore"; recordId: string }
  | { kind: "delete"; recordId: string }
  | {
      kind: "revert";
      recordId: string;
      body: Record<string, unknown>;
      /** Present when the edit also moved the record in time. */
      period?: { start: string; end?: string };
      revision: number;
    };

export function undoToastLabel(action: UndoAction): string {
  return `${action.label} — undo?`;
}
