export type AnalyticsActivityRecord = {
  id: string;
  module: string;
  amount: number;
  label: string;
  createdAt: string;
  recordedOn?: string;
};

export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export type AnalyticsModuleSummary = {
  module: string;
  records: number;
  total: number;
  unit: "minutes" | "records";
};

export function localActivitySummary(records: AnalyticsActivityRecord[]): {
  recordCount: number;
  trackedMinutes: number;
  moduleSummaries: AnalyticsModuleSummary[];
  recent: AnalyticsActivityRecord[];
} {
  const timedModules = new Set([
    "Productivity",
    "Learning",
    "Study Sessions",
    "Time",
  ]);
  const grouped = new Map<string, AnalyticsModuleSummary>();

  records.forEach(record => {
    const isTimed = timedModules.has(record.module);
    const current = grouped.get(record.module) ?? {
      module: record.module,
      records: 0,
      total: 0,
      unit: isTimed ? "minutes" : "records",
    };
    grouped.set(record.module, {
      ...current,
      records: current.records + 1,
      // A timed module totals its minutes. Everything else totals its entries,
      // and an entry is one record — not whatever number happens to sit in
      // `amount`. Sleep stores hours there for the history metric, so summing
      // amounts here rendered a single night's rest as "7.916666666666667
      // entries". A count cannot be fractional, so it is counted, not summed.
      total: isTimed ? current.total + record.amount : current.records + 1,
    });
  });

  return {
    recordCount: records.length,
    // Rounded as a belt-and-braces guard: a future caller passing fractional
    // minutes must not be able to leak a float back into the interface.
    trackedMinutes: Math.round(
      records
        .filter(record => timedModules.has(record.module))
        .reduce((total, record) => total + record.amount, 0)
    ),
    moduleSummaries: Array.from(grouped.values()).sort(
      (a, b) => b.records - a.records || a.module.localeCompare(b.module)
    ),
    recent: records.slice(0, 3),
  };
}

export function localPixelSummary(
  records: Record<string, Record<string, string>>
): {
  markedDays: number;
  activeTrackers: number;
} {
  const sets = Object.values(records);
  return {
    markedDays: sets.reduce(
      (total, cells) => total + Object.keys(cells).length,
      0
    ),
    activeTrackers: sets.filter(cells => Object.keys(cells).length > 0).length,
  };
}

function dayNumber(value: string): number | null {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? null : timestamp / 86_400_000;
}

/** The reference's LOCAL calendar day, on the same day-number scale as
 * `recordedOn` (which is a local YYYY-MM-DD). Reading the UTC fields here
 * made "today" mean yesterday for anyone east of Greenwich before their
 * local midnight had reached UTC. */
function referenceDay(reference: Date): number {
  return Math.floor(
    Date.UTC(
      reference.getFullYear(),
      reference.getMonth(),
      reference.getDate()
    ) / 86_400_000
  );
}

export function periodDays(period: AnalyticsPeriod): number | null {
  return period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : null;
}

/**
 * How many calendar days in the period carry at least one saved record —
 * the difference between "nothing happened" and "nothing was written down".
 */
export function activityCoverage(
  records: AnalyticsActivityRecord[],
  period: AnalyticsPeriod,
  reference = new Date()
): { daysInPeriod: number; daysWithRecords: number } | null {
  const days = periodDays(period);
  if (days === null) return null;
  const end = referenceDay(reference);
  const start = end - (days - 1);
  const seen = new Set<number>();
  for (const record of records) {
    const date = record.recordedOn ? dayNumber(record.recordedOn) : null;
    if (date !== null && date >= start && date <= end) seen.add(date);
  }
  return { daysInPeriod: days, daysWithRecords: seen.size };
}

export function analyticsCsv(records: AnalyticsActivityRecord[]) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = [...records]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(record =>
      [
        record.recordedOn ?? record.createdAt.slice(0, 10),
        record.createdAt,
        record.module,
        record.label,
        record.amount,
      ]
        .map(escape)
        .join(",")
    );
  return ["day,saved_at,area,label,amount", ...rows].join("\n");
}

export function filterAnalyticsActivityByPeriod(
  records: AnalyticsActivityRecord[],
  period: AnalyticsPeriod,
  reference = new Date()
): AnalyticsActivityRecord[] {
  if (period === "all") return records;
  const end = referenceDay(reference);
  const start = end - (period === "today" ? 0 : period === "7d" ? 6 : 29);
  return records.filter(record => {
    const date = record.recordedOn ? dayNumber(record.recordedOn) : null;
    return date !== null && date >= start && date <= end;
  });
}

export function descriptiveActivityTrend(
  records: AnalyticsActivityRecord[],
  reference = new Date(),
  windowDays = 7
): {
  currentCount: number;
  previousCount: number;
  windowDays: number;
  evidence: "not-enough" | "descriptive";
  direction: "more" | "fewer" | "similar" | null;
} {
  const end = referenceDay(reference);
  const currentStart = end - (windowDays - 1);
  const previousStart = end - (windowDays * 2 - 1);
  const inRange = (start: number, finish: number) =>
    records.filter(record => {
      const date = record.recordedOn ? dayNumber(record.recordedOn) : null;
      return date !== null && date >= start && date <= finish;
    }).length;
  const currentCount = inRange(currentStart, end);
  const previousCount = inRange(previousStart, currentStart - 1);
  if (currentCount < 3 || previousCount < 3)
    return {
      currentCount,
      previousCount,
      windowDays,
      evidence: "not-enough",
      direction: null,
    };
  return {
    currentCount,
    previousCount,
    windowDays,
    evidence: "descriptive",
    direction:
      currentCount > previousCount
        ? "more"
        : currentCount < previousCount
          ? "fewer"
          : "similar",
  };
}

export function compareLocalActivitySources(
  records: AnalyticsActivityRecord[],
  firstSource: string,
  secondSource: string
): {
  firstCount: number;
  secondCount: number;
  evidence: "not-enough" | "descriptive";
  direction: "first" | "second" | "similar" | null;
} {
  const firstCount = records.filter(
    record => record.module === firstSource
  ).length;
  const secondCount = records.filter(
    record => record.module === secondSource
  ).length;
  if (firstSource === secondSource || firstCount < 3 || secondCount < 3)
    return { firstCount, secondCount, evidence: "not-enough", direction: null };
  return {
    firstCount,
    secondCount,
    evidence: "descriptive",
    direction:
      firstCount > secondCount
        ? "first"
        : secondCount > firstCount
          ? "second"
          : "similar",
  };
}
