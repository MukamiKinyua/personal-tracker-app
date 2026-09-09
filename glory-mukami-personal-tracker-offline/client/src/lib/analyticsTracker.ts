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

function referenceDay(reference: Date): number {
  return Math.floor(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate()
    ) / 86_400_000
  );
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
  reference = new Date()
): {
  currentCount: number;
  previousCount: number;
  evidence: "not-enough" | "descriptive";
  direction: "more" | "fewer" | "similar" | null;
} {
  const end = referenceDay(reference);
  const currentStart = end - 6;
  const previousStart = end - 13;
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
      evidence: "not-enough",
      direction: null,
    };
  return {
    currentCount,
    previousCount,
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
