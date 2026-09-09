/**
 * Resolving a conflict between two devices.
 *
 * The sync engine can detect that a phone and a laptop both changed the same
 * record, and the three-way merge in `syncQueue` settles the easy case where
 * they touched different fields. This module handles what is left: a genuine
 * disagreement, where two versions of the same entry cannot both be true.
 *
 * The governing rule is that **nothing is discarded without the user saying
 * so.** A tracker that silently picks a winner will eventually throw away the
 * version someone actually wanted, and they will not find out until they go
 * looking for it. So a conflict waits, it is described in terms of what
 * actually differs, and every resolution is reversible.
 */

import type { SyncRecordPayload } from "./syncEngine";
import type { AnyRecord } from "./recordStore";

export type Conflict = {
  local: AnyRecord;
  server: SyncRecordPayload;
  /** When this device noticed the disagreement. */
  detectedAt: string;
};

export type FieldDifference = {
  field: string;
  localValue: unknown;
  serverValue: unknown;
};

/**
 * The fields that actually disagree.
 *
 * Shown instead of two whole records, because "these two entries differ" is
 * not a question anyone can answer, while "you wrote 250ml here and 500ml on
 * your phone" is.
 */
export function differences(conflict: Conflict): FieldDifference[] {
  const fields = new Set([
    ...Object.keys(conflict.local.body),
    ...Object.keys(conflict.server.body),
  ]);

  const result: FieldDifference[] = [];

  for (const field of Array.from(fields).sort()) {
    const localValue = conflict.local.body[field];
    const serverValue = conflict.server.body[field];
    if (!sameValue(localValue, serverValue)) {
      result.push({ field, localValue, serverValue });
    }
  }

  return result;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export type Resolution =
  /** Keep what this device has and push it over the server's copy. */
  | { choice: "local" }
  /** Take the other device's version. */
  | { choice: "server" }
  /** Field-by-field, for when each side got something right. */
  | { choice: "merge"; take: Record<string, "local" | "server"> };

export type ResolvedRecord = {
  record: AnyRecord;
  /** True when the result must be pushed; false when it only lands locally. */
  needsPush: boolean;
};

/**
 * Produces the record a resolution results in.
 *
 * The revision is always taken from the server's copy and advanced, whichever
 * side won. That is what makes the resolution *stick*: a record still carrying
 * the local revision would be rejected as stale on the very next push, and the
 * user would be asked the same question again.
 */
export function resolve(
  conflict: Conflict,
  resolution: Resolution,
  now: string = new Date().toISOString()
): ResolvedRecord {
  const base = conflict.local;
  const serverRevision = conflict.server.revision;

  if (resolution.choice === "server") {
    return {
      record: {
        ...base,
        body: conflict.server.body,
        period: conflict.server.period,
        updatedAt: conflict.server.updatedAt,
        deletedAt: conflict.server.deletedAt,
        revision: serverRevision,
      },
      // Already what the server holds, so there is nothing to send back.
      needsPush: false,
    };
  }

  if (resolution.choice === "local") {
    return {
      record: {
        ...base,
        updatedAt: now,
        revision: serverRevision,
      },
      needsPush: true,
    };
  }

  const body: Record<string, unknown> = {};
  const fields = new Set([
    ...Object.keys(conflict.local.body),
    ...Object.keys(conflict.server.body),
  ]);

  for (const field of Array.from(fields)) {
    const side = resolution.take[field] ?? "local";
    const value =
      side === "server"
        ? conflict.server.body[field]
        : conflict.local.body[field];
    // A field neither side has is left out rather than written as undefined.
    if (value !== undefined) body[field] = value;
  }

  return {
    record: { ...base, body, updatedAt: now, revision: serverRevision },
    needsPush: true,
  };
}

/**
 * Whether a conflict can be settled without asking.
 *
 * Only two cases qualify, and both are ones where no information is lost: the
 * two sides are identical after all, or one of them is a deletion the other
 * has not seen. A deletion wins because restoring is easy and re-deleting is
 * annoying — and the record is soft-deleted either way, so nothing is gone.
 */
export function autoResolvable(conflict: Conflict): Resolution | null {
  if (differences(conflict).length === 0) {
    return { choice: "server" };
  }

  const localDeleted = Boolean(conflict.local.deletedAt);
  const serverDeleted = Boolean(conflict.server.deletedAt);

  if (localDeleted && !serverDeleted) return { choice: "local" };
  if (serverDeleted && !localDeleted) return { choice: "server" };

  return null;
}

/** One line naming what disagreed, for the conflict list. */
export function describeConflict(conflict: Conflict): string {
  const fields = differences(conflict);

  if (fields.length === 0) {
    return `${conflict.local.scope}: the same entry, recorded twice.`;
  }

  const named = fields
    .slice(0, 3)
    .map(difference => difference.field)
    .join(", ");
  const rest = fields.length > 3 ? ` and ${fields.length - 3} more` : "";

  return `${conflict.local.scope}: ${named}${rest} differ between this device and another.`;
}

/** The two sides labelled for the chooser, newest first so it reads naturally. */
export function conflictSides(conflict: Conflict): {
  local: { label: string; updatedAt: string; deleted: boolean };
  server: { label: string; updatedAt: string; deleted: boolean };
  localIsNewer: boolean;
} {
  const localIsNewer = conflict.local.updatedAt > conflict.server.updatedAt;

  return {
    local: {
      label: "This device",
      updatedAt: conflict.local.updatedAt,
      deleted: Boolean(conflict.local.deletedAt),
    },
    server: {
      label: "Another device",
      updatedAt: conflict.server.updatedAt,
      deleted: Boolean(conflict.server.deletedAt),
    },
    localIsNewer,
  };
}

export function addConflict(
  conflicts: Conflict[],
  conflict: Conflict
): Conflict[] {
  // One outstanding question per record; a newer disagreement replaces the old.
  const rest = conflicts.filter(
    existing => existing.local.id !== conflict.local.id
  );
  return [...rest, conflict];
}

export function clearConflict(
  conflicts: Conflict[],
  recordId: string
): Conflict[] {
  return conflicts.filter(conflict => conflict.local.id !== recordId);
}

/**
 * Settles everything that can be settled without asking, and returns what
 * still needs a person. Run after every sync so the user is only ever shown
 * the disagreements that genuinely require a decision.
 */
export function triage(
  conflicts: Conflict[],
  now?: string
): {
  resolved: Array<{ conflict: Conflict; result: ResolvedRecord }>;
  remaining: Conflict[];
} {
  const resolved: Array<{ conflict: Conflict; result: ResolvedRecord }> = [];
  const remaining: Conflict[] = [];

  for (const conflict of conflicts) {
    const automatic = autoResolvable(conflict);
    if (automatic) {
      resolved.push({ conflict, result: resolve(conflict, automatic, now) });
    } else {
      remaining.push(conflict);
    }
  }

  return { resolved, remaining };
}
