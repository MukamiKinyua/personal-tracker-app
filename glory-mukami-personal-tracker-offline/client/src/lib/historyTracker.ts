export type HistoryEntryLike = {
  module: string;
  label: string;
  createdAt: string;
};

export type PersistedHistoryRecord = HistoryEntryLike & {
  id: string;
  detail: string;
  view: string;
  source: "saved-record" | "pixel-progress";
};

type PersistedScope = {
  scope: string;
  module: string;
  view: string;
  fields: string[];
  source: PersistedHistoryRecord["source"];
};

const persistedScopes: PersistedScope[] = [
  {
    scope: "assignments",
    module: "Assignments",
    view: "assignments",
    fields: ["assignments"],
    source: "saved-record",
  },
  {
    scope: "learning",
    module: "Learning",
    view: "learning",
    fields: ["skills"],
    source: "saved-record",
  },
  {
    scope: "personal-growth",
    module: "Personal growth",
    view: "personalGrowth",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "achievements",
    module: "Achievements",
    view: "achievements",
    fields: ["achievements"],
    source: "saved-record",
  },
  {
    scope: "experiences",
    module: "Experiences",
    view: "experiences",
    fields: ["experiences"],
    source: "saved-record",
  },
  {
    scope: "hobbies",
    module: "Hobbies",
    view: "hobbies",
    fields: ["hobbies"],
    source: "saved-record",
  },
  {
    scope: "family",
    module: "Family",
    view: "family",
    fields: ["plans"],
    source: "saved-record",
  },
  {
    scope: "internships",
    module: "Internships",
    view: "internships",
    fields: ["applications"],
    source: "saved-record",
  },
  {
    scope: "certifications",
    module: "Certifications",
    view: "certifications",
    fields: ["certifications"],
    source: "saved-record",
  },
  {
    scope: "projects",
    module: "Projects",
    view: "projects",
    fields: ["projects"],
    source: "saved-record",
  },
  {
    scope: "portfolio",
    module: "Portfolio",
    view: "portfolio",
    fields: ["projects"],
    source: "saved-record",
  },
  {
    scope: "social-life",
    module: "Social life",
    view: "social",
    fields: ["plans"],
    source: "saved-record",
  },
  {
    scope: "career",
    module: "Career",
    view: "career",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "responsibilities",
    module: "Responsibilities",
    view: "responsibilities",
    fields: ["responsibilities", "history"],
    source: "saved-record",
  },
  {
    scope: "purchases",
    module: "Purchases",
    view: "purchases",
    fields: ["purchases"],
    source: "saved-record",
  },
  {
    scope: "environment",
    module: "Environment",
    view: "environment",
    fields: ["items", "history"],
    source: "saved-record",
  },
  {
    scope: "security",
    module: "Security",
    view: "security",
    fields: ["records"],
    source: "saved-record",
  },
  {
    scope: "documents",
    module: "Documents",
    view: "documents",
    fields: ["records"],
    source: "saved-record",
  },
  {
    scope: "finances",
    module: "Finances",
    view: "finances",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "time",
    module: "Time",
    view: "time",
    fields: ["blocks", "records"],
    source: "saved-record",
  },
  {
    scope: "goals",
    module: "Goals",
    view: "goals",
    fields: ["goals"],
    source: "saved-record",
  },
  {
    scope: "study-sessions",
    module: "Study sessions",
    view: "studySessions",
    fields: ["sessions"],
    source: "saved-record",
  },
  {
    scope: "exams",
    module: "Exams",
    view: "exams",
    fields: ["exams"],
    source: "saved-record",
  },
  {
    scope: "courses",
    module: "Courses",
    view: "courses",
    fields: ["courses"],
    source: "saved-record",
  },
  {
    scope: "tasks",
    module: "Tasks",
    view: "tasks",
    fields: ["tasks"],
    source: "saved-record",
  },
  {
    scope: "digital-life",
    module: "Digital life",
    view: "digital",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "productivity",
    module: "Productivity",
    view: "productivity",
    fields: ["tasks", "sessions"],
    source: "saved-record",
  },
  {
    scope: "habits",
    module: "Habits",
    view: "habits",
    fields: ["records"],
    source: "saved-record",
  },
  {
    scope: "sleep",
    module: "Sleep",
    view: "sleep",
    fields: ["logs"],
    source: "saved-record",
  },
  {
    scope: "wellbeing",
    module: "Wellbeing",
    view: "wellbeing",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "cycle",
    module: "Menstrual health",
    view: "cycle",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "nutrition",
    module: "Nutrition",
    view: "nutrition",
    fields: ["meals", "groceries"],
    source: "saved-record",
  },
  {
    scope: "water",
    module: "Water",
    view: "water",
    fields: ["entries"],
    source: "saved-record",
  },
  {
    scope: "reflections",
    module: "Reflections",
    view: "reflections",
    fields: ["entries"],
    source: "saved-record",
  },
];

const labelFields = [
  "title",
  "name",
  "label",
  "skill",
  "topic",
  "meal",
  "type",
  "role",
  "institution",
  "document",
  "description",
];
const detailFields = [
  "subject",
  "category",
  "status",
  "completed",
  "date",
  "due",
  "deadline",
  "period",
  "mood",
  "quality",
  "amount",
  "duration",
  "notes",
  "goal",
  "progress",
  "level",
];
const dateFields = [
  "date",
  "createdAt",
  "updatedAt",
  "due",
  "deadline",
  "startDate",
  "time",
];

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstText(
  record: Record<string, unknown>,
  fields: string[],
  fallback: string
) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
  }
  return fallback;
}

function buildRecord(
  scope: PersistedScope,
  index: number,
  value: unknown
): PersistedHistoryRecord | null {
  const record = asObject(value);
  if (!record) return null;
  const label = firstText(
    record,
    labelFields,
    `${scope.module} record ${index + 1}`
  );
  const detail = detailFields
    .map(field => {
      const value = record[field];
      return value === undefined || value === null || value === ""
        ? ""
        : `${field}: ${String(value)}`;
    })
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
  const createdAt = firstText(record, dateFields, "Saved record");
  const stableId = firstText(record, ["id", "key"], String(index));
  return {
    id: `${scope.scope}:${stableId}:${index}`,
    module: scope.module,
    label,
    detail: detail || "Saved in this private journal.",
    createdAt,
    view: scope.view,
    source: scope.source,
  };
}

export function readPersistedHistoryRecords(
  storage: { getItem: (key: string) => string | null },
  ownerKey: string
): PersistedHistoryRecord[] {
  const records: PersistedHistoryRecord[] = [];
  persistedScopes.forEach(scope => {
    const raw = storage.getItem(
      `glory-personal-tracker:${scope.scope}:${ownerKey}`
    );
    if (!raw) return;
    try {
      const payload = asObject(JSON.parse(raw));
      if (!payload) return;
      scope.fields.forEach(field => {
        const values = payload[field];
        if (!Array.isArray(values)) return;
        values.forEach((value, index) => {
          const record = buildRecord(scope, index, value);
          if (record) records.push(record);
        });
      });
    } catch {
      // A malformed local mirror must not stop the History page.
    }
  });
  const shellRaw = storage.getItem(
    `glory-personal-tracker:journal-shell:${ownerKey}`
  );
  if (shellRaw) {
    try {
      const shell = asObject(JSON.parse(shellRaw));
      const pixelRecords = asObject(shell?.pixelRecords);
      if (pixelRecords) {
        Object.entries(pixelRecords).forEach(([tracker, value]) => {
          const pixels = asObject(value);
          const marked = pixels ? Object.keys(pixels).length : 0;
          if (!marked) return;
          records.push({
            id: `journal-shell:pixels:${tracker}`,
            module: "Portrait progress",
            label: `${tracker} annual portrait`,
            detail: `${marked} marked day${marked === 1 ? "" : "s"} in the saved pixel map.`,
            createdAt: "Saved progress",
            view: "portraits",
            source: "pixel-progress",
          });
        });
      }
    } catch {
      // A malformed shell mirror must not stop the History page.
    }
  }
  return records;
}

export function filterHistoryEntries<T extends HistoryEntryLike>(
  entries: T[],
  query: string,
  module: string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter(entry => {
    const matchesModule = module === "All" || entry.module === module;
    const haystack =
      `${entry.module} ${entry.label} ${entry.createdAt}`.toLowerCase();
    return matchesModule && haystack.includes(normalizedQuery);
  });
}

export function historyModuleTotals(
  entries: HistoryEntryLike[]
): Array<[string, number]> {
  const totals = new Map<string, number>();
  entries.forEach(entry =>
    totals.set(entry.module, (totals.get(entry.module) || 0) + 1)
  );
  return Array.from(totals.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  );
}
