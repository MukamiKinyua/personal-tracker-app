/**
 * The record envelope every user-entered item shares.
 *
 * Requirement 2.3 asks for a stable identifier, creation and update stamps, a
 * source, a date or date range, and ownership on every item the user enters.
 * Pages keep their own body shape; the envelope is what makes a water sip, a
 * sleep session, and a transaction all correctable, exportable, and auditable
 * by the same code.
 */

export type RecordSource =
  /** The person typed or tapped it in this application. */
  | "manual"
  /** Synchronised from a connected provider (3.19 requires we keep the origin). */
  | "imported"
  /** Calculated by the application from other records. */
  | "derived"
  /** Seeded from a template or routine the user accepted. */
  | "template";

export type RecordId = string;

/**
 * A date or a date range. Single-day records carry `start` only; sleep
 * sessions, trips, and cycles carry both. Both are ISO-8601 instants so that
 * cross-midnight ranges stay honest (2.5); the local calendar day a record
 * belongs to is derived per user timezone in `./datetime`.
 */
export type RecordPeriod = {
  start: string;
  end?: string;
};

export type AuditEntry = {
  at: string;
  action: "created" | "updated" | "deleted" | "restored" | "imported";
  /** Field names touched. Values are deliberately not copied here. */
  fields?: string[];
  source: RecordSource;
};

export type TrackerRecord<TBody> = {
  id: RecordId;
  ownerId: string;
  /** Page or domain the record belongs to, e.g. "water", "sleep". */
  scope: string;
  period: RecordPeriod;
  createdAt: string;
  updatedAt: string;
  source: RecordSource;
  /**
   * Increments on every accepted write. The sync queue compares revisions to
   * detect a conflicting edit rather than overwriting silently (2.4).
   */
  revision: number;
  /** Set when soft-deleted, so deletion stays restorable (2.3). */
  deletedAt?: string;
  /** Present only for imported records, so 3.19 can de-duplicate a re-sync. */
  externalId?: string;
  provider?: string;
  /** Kept for sensitive scopes; see `SENSITIVE_SCOPES`. */
  audit?: AuditEntry[];
  body: TBody;
};

/**
 * Scopes where 2.3 asks for an audit history. These are the areas where a
 * silent change would be hard for the user to notice and costly to discover.
 */
export const SENSITIVE_SCOPES = new Set([
  "period",
  "finances",
  "wellbeing",
  "reflections",
  "digital-life",
]);

/**
 * The five states requirement 2.3 forbids collapsing into one blank screen,
 * plus `present` for the ordinary case.
 */
export type DataState =
  /** Nothing was ever entered for this slot. */
  | "empty"
  /** A load or integration problem; the truth is unknown right now. */
  | "unavailable"
  /** Genuinely measured as zero. */
  | "zero"
  /** The user intentionally declined to log. */
  | "skipped"
  /** Started but missing a required field. */
  | "incomplete"
  | "present";

export type DataStateInput<TBody> = {
  record?: TrackerRecord<TBody> | null;
  /** True when the source could not be read (offline, integration error). */
  loadFailed?: boolean;
  /** Names of fields the page requires before it counts a record complete. */
  requiredFields?: (keyof TBody)[];
  /** Reads the numeric measure, when the scope has one (water, sleep, steps). */
  measure?: (body: TBody) => number | null | undefined;
};

/**
 * Resolves which of the five states a slot is in. Pages must render each of
 * these distinctly; passing the result straight to a shared empty state would
 * reintroduce exactly the ambiguity 2.3 rules out.
 */
export function resolveDataState<TBody>({
  record,
  loadFailed = false,
  requiredFields = [],
  measure,
}: DataStateInput<TBody>): DataState {
  if (loadFailed) return "unavailable";
  if (!record || record.deletedAt) return "empty";

  const body = record.body as TBody & { skipped?: boolean };
  if (body?.skipped === true) return "skipped";

  const missing = requiredFields.some(field => {
    const value = (body as Record<string, unknown>)[field as string];
    return value === undefined || value === null || value === "";
  });
  if (missing) return "incomplete";

  if (measure) {
    const value = measure(record.body);
    if (value === null || value === undefined) return "incomplete";
    if (value === 0) return "zero";
  }

  return "present";
}

/**
 * Sentences the interface can show for each state. A zero and an untouched day
 * must not read the same, so these stay distinct in wording as well as value.
 */
export const DATA_STATE_LABEL: Record<DataState, string> = {
  empty: "Not logged",
  unavailable: "Can’t load right now",
  zero: "Logged as none",
  skipped: "Skipped on purpose",
  incomplete: "Started, needs a detail",
  present: "Logged",
};

let counter = 0;

/** Time-ordered, collision-resistant, and readable in an export. */
export function newRecordId(scope: string, now: Date = new Date()): RecordId {
  counter = (counter + 1) % 0xffff;
  const stamp = now.getTime().toString(36);
  const salt = Math.floor(Math.random() * 0xffff).toString(36);
  return `${scope}_${stamp}${counter.toString(36)}${salt}`;
}

export type CreateRecordInput<TBody> = {
  scope: string;
  ownerId: string;
  body: TBody;
  period?: RecordPeriod;
  source?: RecordSource;
  externalId?: string;
  provider?: string;
  now?: Date;
};

export function createRecord<TBody>({
  scope,
  ownerId,
  body,
  period,
  source = "manual",
  externalId,
  provider,
  now = new Date(),
}: CreateRecordInput<TBody>): TrackerRecord<TBody> {
  const at = now.toISOString();
  const record: TrackerRecord<TBody> = {
    id: newRecordId(scope, now),
    ownerId,
    scope,
    period: period ?? { start: at },
    createdAt: at,
    updatedAt: at,
    source,
    revision: 1,
    body,
  };
  if (externalId) record.externalId = externalId;
  if (provider) record.provider = provider;
  if (SENSITIVE_SCOPES.has(scope)) {
    record.audit = [
      { at, action: source === "imported" ? "imported" : "created", source },
    ];
  }
  return record;
}

/**
 * Applies a correction. Requirement 8 asks that correcting a transaction
 * updates every affected total, which only holds if edits go through one path
 * that bumps the revision and the update stamp.
 */
export function updateRecord<TBody>(
  record: TrackerRecord<TBody>,
  changes: Partial<TBody>,
  options: { now?: Date; period?: RecordPeriod; source?: RecordSource } = {}
): TrackerRecord<TBody> {
  const now = options.now ?? new Date();
  const at = now.toISOString();
  const fields = Object.keys(changes);
  const next: TrackerRecord<TBody> = {
    ...record,
    period: options.period ?? record.period,
    body: { ...record.body, ...changes },
    updatedAt: at,
    revision: record.revision + 1,
  };
  if (record.audit) {
    next.audit = [
      ...record.audit,
      {
        at,
        action: "updated",
        fields,
        source: options.source ?? record.source,
      },
    ];
  }
  return next;
}

/**
 * Replaces the body outright rather than merging into it.
 *
 * Undo needs this: reversing an edit that *added* a field must remove that
 * field again. Merging the old body over the new one would leave the addition
 * behind — an undone completion would keep its `completedAt` — so a revert
 * restores the exact previous body instead.
 */
export function setRecordBody<TBody>(
  record: TrackerRecord<TBody>,
  body: TBody,
  options: { now?: Date; source?: RecordSource } = {}
): TrackerRecord<TBody> {
  const now = options.now ?? new Date();
  const at = now.toISOString();
  const fields = Array.from(
    new Set([
      ...Object.keys(record.body as object),
      ...Object.keys(body as object),
    ])
  );
  const next: TrackerRecord<TBody> = {
    ...record,
    body,
    updatedAt: at,
    revision: record.revision + 1,
  };
  if (record.audit) {
    next.audit = [
      ...record.audit,
      {
        at,
        action: "updated",
        fields,
        source: options.source ?? record.source,
      },
    ];
  }
  return next;
}

/**
 * Soft deletion. 2.3 asks for restoration where appropriate and 2.6 asks for
 * undo after a destructive action, neither of which survives a hard delete.
 */
export function deleteRecord<TBody>(
  record: TrackerRecord<TBody>,
  now: Date = new Date()
): TrackerRecord<TBody> {
  const at = now.toISOString();
  const next: TrackerRecord<TBody> = {
    ...record,
    deletedAt: at,
    updatedAt: at,
    revision: record.revision + 1,
  };
  if (record.audit) {
    next.audit = [
      ...record.audit,
      { at, action: "deleted", source: record.source },
    ];
  }
  return next;
}

export function restoreRecord<TBody>(
  record: TrackerRecord<TBody>,
  now: Date = new Date()
): TrackerRecord<TBody> {
  const at = now.toISOString();
  const { deletedAt: _removed, ...rest } = record;
  const next: TrackerRecord<TBody> = {
    ...rest,
    updatedAt: at,
    revision: record.revision + 1,
  };
  if (record.audit) {
    next.audit = [
      ...record.audit,
      { at, action: "restored", source: record.source },
    ];
  }
  return next;
}

export function isLive<TBody>(record: TrackerRecord<TBody>): boolean {
  return !record.deletedAt;
}

/** Live records only — the default for every count, total, and history view. */
export function liveRecords<TBody>(
  records: TrackerRecord<TBody>[]
): TrackerRecord<TBody>[] {
  return records.filter(isLive);
}
