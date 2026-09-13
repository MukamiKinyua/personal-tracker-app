/**
 * Backup, restore, and import.
 *
 * Export already exists; this is the way back in. Without it an export is a
 * souvenir rather than a safeguard, and the requirement is explicit that a
 * lost device must not mean a lost journal.
 *
 * Restoring is the most destructive thing this app can do, so it is built to
 * be inspected before it is applied: parsing, validating, and describing a
 * backup are separate from writing it. Nothing here touches the store — the
 * caller applies a plan the user has already seen.
 */

import { localCalendarDay } from "./datetime";
import { EXPORT_FORMAT_VERSION, type ExportBundle } from "./exportData";
import type { RecordLink } from "./links";
import type { TrackerRecord } from "./record";

type AnyRecord = TrackerRecord<Record<string, unknown>>;

export type BackupProblem = {
  severity: "error" | "warning";
  message: string;
};

export type ParsedBackup =
  | { ok: true; bundle: ExportBundle; problems: BackupProblem[] }
  | { ok: false; problems: BackupProblem[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeRecord(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.scope === "string" &&
    typeof value.createdAt === "string" &&
    isObject(value.period) &&
    typeof (value.period as Record<string, unknown>).start === "string"
  );
}

/**
 * Reads a backup file without trusting it.
 *
 * A backup is user-supplied input that will be written straight into their
 * journal, so every field is checked. Malformed records are dropped with a
 * warning rather than failing the whole restore — losing one corrupt row is
 * better than refusing to give someone their five years of entries back.
 */
export function parseBackup(text: string): ParsedBackup {
  const problems: BackupProblem[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      problems: [
        { severity: "error", message: "This file is not valid JSON." },
      ],
    };
  }

  if (!isObject(raw)) {
    return {
      ok: false,
      problems: [
        {
          severity: "error",
          message: "This file does not look like a backup.",
        },
      ],
    };
  }

  if (typeof raw.formatVersion !== "string") {
    return {
      ok: false,
      problems: [
        {
          severity: "error",
          message:
            "This file has no format version, so it cannot be read safely.",
        },
      ],
    };
  }

  if (raw.formatVersion !== EXPORT_FORMAT_VERSION) {
    // A newer file may carry fields this build silently drops.
    problems.push({
      severity: "warning",
      message: `This backup was made in format ${raw.formatVersion}; this app writes ${EXPORT_FORMAT_VERSION}. Anything it does not understand will be left out.`,
    });
  }

  const rawRecords = Array.isArray(raw.records) ? raw.records : [];
  if (!Array.isArray(raw.records)) {
    problems.push({
      severity: "warning",
      message: "The backup contains no record list.",
    });
  }

  const records = rawRecords.filter(looksLikeRecord);
  const dropped = rawRecords.length - records.length;
  if (dropped > 0) {
    problems.push({
      severity: "warning",
      message: `${dropped} entr${dropped === 1 ? "y" : "ies"} could not be read and will be skipped.`,
    });
  }

  const links = Array.isArray(raw.links)
    ? (raw.links.filter(
        link =>
          isObject(link) &&
          typeof link.fromId === "string" &&
          typeof link.toId === "string"
      ) as RecordLink[])
    : [];

  const bundle: ExportBundle = {
    formatVersion: raw.formatVersion,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    owner: isObject(raw.owner)
      ? {
          id: String(raw.owner.id ?? ""),
          timezone: String(raw.owner.timezone ?? "UTC"),
          locale: String(raw.owner.locale ?? "en-GB"),
        }
      : { id: "", timezone: "UTC", locale: "en-GB" },
    readme: typeof raw.readme === "string" ? raw.readme : "",
    dictionary: isObject(raw.dictionary)
      ? (raw.dictionary as ExportBundle["dictionary"])
      : { envelope: [], byScope: {} },
    counts: isObject(raw.counts) ? (raw.counts as Record<string, number>) : {},
    records,
    links,
  };

  return { ok: true, bundle, problems };
}

export type RestoreMode =
  /** Wipe what is here and take the backup as the truth. */
  | "replace"
  /** Keep both, preferring what is already here on any clash. */
  | "merge";

export type RestorePlan = {
  mode: RestoreMode;
  /** Records in the backup not currently held. */
  toAdd: AnyRecord[];
  /** Records held under the same id, which merge will keep as they are. */
  conflicts: AnyRecord[];
  /** Records currently held that the backup does not contain. */
  toRemove: AnyRecord[];
  links: RecordLink[];
  /** Plain sentences describing the consequence, shown before confirming. */
  summary: string[];
  /** True when applying this would destroy something. */
  destructive: boolean;
};

/**
 * Works out what a restore would do, without doing it.
 *
 * The requirement asks for a clear warning before destructive actions, which
 * is only possible if the consequences are computed first. `summary` is the
 * text the confirmation dialog should show.
 */
export function planRestore({
  bundle,
  existing,
  mode,
}: {
  bundle: ExportBundle;
  existing: AnyRecord[];
  mode: RestoreMode;
}): RestorePlan {
  const existingById = new Map(existing.map(record => [record.id, record]));
  const backupIds = new Set(bundle.records.map(record => record.id));

  const toAdd: AnyRecord[] = [];
  const conflicts: AnyRecord[] = [];

  for (const record of bundle.records) {
    if (existingById.has(record.id)) conflicts.push(record);
    else toAdd.push(record);
  }

  const toRemove =
    mode === "replace"
      ? existing.filter(record => !backupIds.has(record.id))
      : [];

  const summary: string[] = [];

  if (toAdd.length > 0) {
    summary.push(
      `${toAdd.length} entr${toAdd.length === 1 ? "y" : "ies"} will be added.`
    );
  }

  if (mode === "replace") {
    if (conflicts.length > 0) {
      summary.push(
        `${conflicts.length} entr${conflicts.length === 1 ? "y" : "ies"} already here will be overwritten by the backup.`
      );
    }
    if (toRemove.length > 0) {
      summary.push(
        `${toRemove.length} entr${toRemove.length === 1 ? "y" : "ies"} not in this backup will be permanently deleted.`
      );
    }
  } else if (conflicts.length > 0) {
    summary.push(
      `${conflicts.length} entr${conflicts.length === 1 ? "y" : "ies"} already here will be kept as they are.`
    );
  }

  if (summary.length === 0) {
    summary.push("This backup contains nothing new.");
  }

  return {
    mode,
    toAdd,
    conflicts,
    toRemove,
    links: bundle.links,
    summary,
    destructive:
      mode === "replace" && (toRemove.length > 0 || conflicts.length > 0),
  };
}

/**
 * Produces the record set a plan results in. Pure, so the caller can preview
 * or test the outcome before committing it to the store.
 */
export function applyRestore({
  plan,
  existing,
}: {
  plan: RestorePlan;
  existing: AnyRecord[];
}): AnyRecord[] {
  if (plan.mode === "replace") {
    const overwritten = new Map(
      plan.conflicts.map(record => [record.id, record])
    );
    const removed = new Set(plan.toRemove.map(record => record.id));

    const kept = existing
      .filter(record => !removed.has(record.id))
      .map(record => overwritten.get(record.id) ?? record);

    return [...kept, ...plan.toAdd];
  }

  // Merge: what is already here wins, so a restore can never quietly undo
  // work done since the backup was taken.
  return [...existing, ...plan.toAdd];
}

/** The sentence shown on the confirm button's dialog. */
export function restoreWarning(plan: RestorePlan): string {
  return plan.destructive
    ? "This cannot be undone. Export a fresh backup first if you are unsure."
    : "Nothing currently in your journal will be removed.";
}

export function backupFilename(now: Date = new Date()): string {
  return `personal-tracker-backup-${localCalendarDay(now)}.json`;
}
