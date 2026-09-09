/**
 * Export, and the data dictionary that makes an export readable.
 *
 * Requirement 2.8 asks for a machine-readable export of everything plus
 * page-level CSV, and — the part that is usually missing — a data dictionary
 * explaining field names and units. Acceptance scenario 10 is not "the user
 * can export" but "the user can export and understand the contents".
 */

import { dayKeyOf } from "./datetime";
import type { RecordLink } from "./links";
import type { TrackerRecord } from "./record";

export type FieldDefinition = {
  field: string;
  description: string;
  /** e.g. "ml", "minutes", "ISO-8601". Omitted where the value is unitless. */
  unit?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "timestamp"
    | "day"
    | "enum"
    | "object";
  /** Allowed values, for enums. */
  values?: string[];
};

/** Fields carried by every record, whatever page it came from. */
export const ENVELOPE_DICTIONARY: FieldDefinition[] = [
  {
    field: "id",
    description: "Stable identifier for this record.",
    type: "string",
  },
  {
    field: "ownerId",
    description: "The account the record belongs to.",
    type: "string",
  },
  {
    field: "scope",
    description: "The page or domain the record was entered on.",
    type: "string",
  },
  {
    field: "period.start",
    description: "When the record starts.",
    unit: "ISO-8601",
    type: "timestamp",
  },
  {
    field: "period.end",
    description: "When the record ends. Absent for single-moment records.",
    unit: "ISO-8601",
    type: "timestamp",
  },
  {
    field: "createdAt",
    description: "When the record was first entered.",
    unit: "ISO-8601",
    type: "timestamp",
  },
  {
    field: "updatedAt",
    description: "When the record was last changed.",
    unit: "ISO-8601",
    type: "timestamp",
  },
  {
    field: "source",
    description: "Where the record came from.",
    type: "enum",
    values: ["manual", "imported", "derived", "template"],
  },
  {
    field: "revision",
    description:
      "Increments on every accepted change. Used to detect conflicting edits.",
    type: "number",
  },
  {
    field: "deletedAt",
    description:
      "Set when the record was deleted. Deleted records remain in the export so a deletion is visible rather than silent.",
    unit: "ISO-8601",
    type: "timestamp",
  },
  {
    field: "provider",
    description: "The connected service a record was imported from.",
    type: "string",
  },
  {
    field: "externalId",
    description:
      "The provider's own identifier, used to avoid importing the same record twice.",
    type: "string",
  },
  {
    field: "audit",
    description: "Change history, kept for sensitive pages.",
    type: "object",
  },
];

/** Per-scope body fields. Units are stated because a bare 250 means nothing. */
export const SCOPE_DICTIONARY: Record<string, FieldDefinition[]> = {
  water: [
    {
      field: "amount",
      description:
        "Quantity drunk, stored in millilitres regardless of the unit shown.",
      unit: "ml",
      type: "number",
    },
    {
      field: "displayUnit",
      description: "The unit the user entered in.",
      type: "enum",
      values: ["ml", "l", "oz", "cup"],
    },
    {
      field: "container",
      description: "Optional preset the amount came from.",
      type: "string",
    },
  ],
  sleep: [
    {
      field: "bedTime",
      description: "Wall clock time the user went to bed.",
      unit: "HH:mm",
      type: "string",
    },
    {
      field: "wakeTime",
      description: "Wall clock time the user woke.",
      unit: "HH:mm",
      type: "string",
    },
    {
      field: "minutes",
      description:
        "Elapsed sleep, computed from the absolute start and end so it stays correct across midnight and daylight-saving changes.",
      unit: "minutes",
      type: "number",
    },
    {
      field: "quality",
      description: "Optional self-rated quality.",
      type: "number",
    },
    {
      field: "naps",
      description: "Additional sleep periods recorded for the same day.",
      type: "object",
    },
  ],
  wellbeing: [
    {
      field: "mood",
      description: "Self-reported mood on the user's configured scale.",
      type: "number",
    },
    {
      field: "energy",
      description: "Self-reported energy on the user's configured scale.",
      type: "number",
    },
    {
      field: "scaleMax",
      description:
        "The top of the scale in use when the entry was made, so old entries stay interpretable if the scale changes.",
      type: "number",
    },
    { field: "note", description: "Free text context.", type: "string" },
    {
      field: "tags",
      description: "Context tags chosen by the user.",
      type: "object",
    },
  ],
  habit: [
    {
      field: "state",
      description:
        "The day's outcome. 'rest' and 'skipped' are deliberate choices, not failures.",
      type: "enum",
      values: ["complete", "partial", "planned", "skipped", "not-applicable"],
    },
    {
      field: "habitId",
      description: "The habit this day belongs to.",
      type: "string",
    },
    {
      field: "quantity",
      description: "Optional amount or duration achieved.",
      type: "number",
    },
    { field: "note", description: "Free text context.", type: "string" },
  ],
  task: [
    { field: "title", description: "What the task is.", type: "string" },
    {
      field: "status",
      description: "Current state.",
      type: "enum",
      values: ["open", "in-progress", "done", "deferred", "archived"],
    },
    {
      field: "priority",
      description: "User-assigned priority.",
      type: "enum",
      values: ["low", "normal", "high", "urgent"],
    },
    {
      field: "dueDay",
      description: "Local calendar day the task is due.",
      unit: "YYYY-MM-DD",
      type: "day",
    },
    {
      field: "completedAt",
      description: "When the task was marked done.",
      unit: "ISO-8601",
      type: "timestamp",
    },
  ],
  focus: [
    {
      field: "minutes",
      description: "Actual focused time recorded for the session.",
      unit: "minutes",
      type: "number",
    },
    {
      field: "plannedMinutes",
      description: "Length the session was set to run for.",
      unit: "minutes",
      type: "number",
    },
    {
      field: "outcome",
      description: "How the session ended.",
      type: "enum",
      values: ["completed", "interrupted", "abandoned"],
    },
  ],
  finances: [
    {
      field: "amountMinor",
      description:
        "Amount in the currency's minor unit (e.g. cents) to avoid floating-point drift.",
      unit: "minor units",
      type: "number",
    },
    {
      field: "currency",
      description: "ISO-4217 currency code.",
      type: "string",
    },
    {
      field: "direction",
      description:
        "Whether money came in, went out, or moved between the user's own accounts. Transfers are excluded from income and expense totals.",
      type: "enum",
      values: ["in", "out", "transfer"],
    },
    {
      field: "category",
      description: "Spending or income category.",
      type: "string",
    },
    {
      field: "merchant",
      description: "Who the money went to or came from.",
      type: "string",
    },
  ],
  period: [
    {
      field: "phase",
      description: "What was recorded for the day.",
      type: "enum",
      values: ["period", "spotting", "none"],
    },
    {
      field: "symptoms",
      description: "Symptoms recorded by the user.",
      type: "object",
    },
    {
      field: "predicted",
      description:
        "True when the entry is an estimate produced by the app rather than something the user logged. Estimates are never presented as fact.",
      type: "boolean",
    },
  ],
  reflection: [
    { field: "highlights", description: "What went well.", type: "string" },
    { field: "difficulties", description: "What was hard.", type: "string" },
    { field: "notes", description: "Anything else.", type: "string" },
    {
      field: "intentions",
      description: "Intentions for the coming week.",
      type: "string",
    },
  ],
  movement: [
    { field: "activity", description: "Type of movement.", type: "string" },
    {
      field: "minutes",
      description: "Duration of the activity.",
      unit: "minutes",
      type: "number",
    },
    {
      field: "intensity",
      description: "How hard it felt.",
      type: "enum",
      values: ["gentle", "moderate", "vigorous"],
    },
  ],
  nutrition: [
    { field: "mealType", description: "Which meal it was.", type: "string" },
    {
      field: "description",
      description: "What was eaten, in the user's words.",
      type: "string",
    },
    {
      field: "ingredients",
      description: "Optional itemised list.",
      type: "object",
    },
  ],
};

export type ExportBundle = {
  formatVersion: string;
  exportedAt: string;
  owner: { id: string; timezone: string; locale: string };
  /** Explains what the export contains before any data is read. */
  readme: string;
  dictionary: {
    envelope: FieldDefinition[];
    byScope: Record<string, FieldDefinition[]>;
  };
  counts: Record<string, number>;
  records: TrackerRecord<Record<string, unknown>>[];
  links: RecordLink[];
};

export const EXPORT_FORMAT_VERSION = "1.0";

const README = [
  "This file contains every record held for your account, including ones you have deleted.",
  "",
  "`records` is a flat list. Each entry has the same outer fields — described in",
  "`dictionary.envelope` — and a `body` whose fields depend on which page the record",
  "came from; those are described in `dictionary.byScope`, keyed by the record's `scope`.",
  "",
  "Deleted records are included with a `deletedAt` timestamp so that a deletion is",
  "visible in the export rather than being an unexplained gap.",
  "",
  "`links` lists the connections between records, such as a task belonging to a goal.",
  "Each link names the kind and id on both sides.",
  "",
  "Amounts of money are stored in the currency's minor unit, and volumes in millilitres,",
  "whatever unit was shown to you at the time. Times are ISO-8601 instants; calendar",
  "days are YYYY-MM-DD in the timezone recorded under `owner`.",
].join("\n");

export function buildExport(
  records: TrackerRecord<Record<string, unknown>>[],
  links: RecordLink[],
  owner: { id: string; timezone: string; locale: string },
  now: Date = new Date()
): ExportBundle {
  const counts: Record<string, number> = {};
  const scopes = new Set<string>();

  for (const record of records) {
    counts[record.scope] = (counts[record.scope] ?? 0) + 1;
    scopes.add(record.scope);
  }

  const byScope: Record<string, FieldDefinition[]> = {};
  for (const scope of Array.from(scopes)) {
    // An undocumented scope is better flagged than quietly omitted.
    byScope[scope] = SCOPE_DICTIONARY[scope] ?? [];
  }

  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    owner,
    readme: README,
    dictionary: { envelope: ENVELOPE_DICTIONARY, byScope },
    counts,
    records,
    links,
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  // A leading =, +, -, or @ is treated as a formula by spreadsheet software.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/**
 * Page-level CSV, for the user who wants one page in a spreadsheet rather than
 * the whole account as JSON.
 */
export function toCSV(
  records: TrackerRecord<Record<string, unknown>>[],
  /**
   * The owner's timezone. Required, not defaulted: the `date` column names a
   * local calendar day, and slicing the ISO instant instead would file a
   * late-evening entry under the previous UTC day — disagreeing with the day
   * the app itself shows it under, and with this export's own readme.
   */
  timezone: string,
  bodyFields?: string[]
): string {
  const fields =
    bodyFields ??
    Array.from(
      new Set(records.flatMap(record => Object.keys(record.body)))
    ).sort();

  const header = [
    "id",
    "date",
    "start",
    "end",
    "source",
    "createdAt",
    "updatedAt",
    "deletedAt",
    ...fields,
  ];

  const rows = records.map(record =>
    [
      record.id,
      dayKeyOf(record.period.start, timezone),
      record.period.start,
      record.period.end ?? "",
      record.source,
      record.createdAt,
      record.updatedAt,
      record.deletedAt ?? "",
      ...fields.map(field => record.body[field]),
    ]
      .map(csvCell)
      .join(",")
  );

  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}

/** A companion CSV describing the columns of the export beside it. */
export function dictionaryToCSV(scope: string): string {
  const definitions = [
    ...ENVELOPE_DICTIONARY,
    ...(SCOPE_DICTIONARY[scope] ?? []),
  ];
  const header = ["field", "type", "unit", "allowed values", "description"];
  const rows = definitions.map(definition =>
    [
      definition.field,
      definition.type,
      definition.unit ?? "",
      definition.values?.join(" | ") ?? "",
      definition.description,
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\r\n");
}
