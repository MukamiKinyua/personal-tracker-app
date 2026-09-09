/**
 * Chart data for every tracker.
 *
 * This is the layer between records and whatever draws them. It decides the
 * *form* each tracker's data should take, buckets the values, and produces the
 * table and the sentence that must accompany every chart.
 *
 * Two rules from elsewhere in the requirements govern everything here.
 *
 * A day with no record and a day measured as zero are different facts, so a
 * point's value is `number | null` and never collapses the two. A line must
 * break at a gap rather than dive to zero; a bar must be absent rather than
 * flat. Getting this wrong invents data the user never entered.
 *
 * And a chart may not carry meaning in colour alone, so every series here
 * produces a table and a plain-language summary as first-class output rather
 * than as an afterthought bolted on for screen readers.
 */

import {
  dayKeyOf,
  dayKeyRange,
  formatDayKey,
  monthStartKey,
  weekStartKey,
  type DayKey,
} from "./datetime";

/**
 * Forms, chosen by the job the data has to do rather than by variety.
 * A single current value is a stat tile, not a one-bar bar chart; a ratio
 * against a limit is a meter, not a two-slice pie.
 */
export type ChartForm =
  | "stat"
  | "meter"
  | "sparkline"
  | "line"
  | "column"
  | "stacked-bar"
  | "diverging-bar"
  | "heatmap";

/** Which palette job the form needs. Never "pick a nice colour". */
export type ColorJob = "sequential" | "categorical" | "diverging" | "status";

export type TrackerChart = {
  scope: string;
  title: string;
  form: ChartForm;
  colorJob: ColorJob;
  unit?: string;
  /** Why this form, so a later change is a decision rather than a whim. */
  rationale: string;
};

/**
 * The default chart for each tracker.
 *
 * Most are sequential: one hue, more-is-darker. Categorical is reserved for
 * the cases where the series genuinely *are* the subject, because it costs
 * legibility and buries whichever number actually mattered.
 */
export const TRACKER_CHARTS: TrackerChart[] = [
  {
    scope: "water",
    title: "Water",
    form: "meter",
    colorJob: "sequential",
    unit: "ml",
    rationale:
      "Today's intake is one ratio against a target, which is a meter.",
  },
  {
    scope: "water-history",
    title: "Water over time",
    form: "column",
    colorJob: "sequential",
    unit: "ml",
    rationale: "Daily totals compared by magnitude.",
  },
  {
    scope: "sleep",
    title: "Sleep",
    form: "line",
    colorJob: "sequential",
    unit: "minutes",
    rationale: "Duration over time, one series, so a line with an area fill.",
  },
  {
    scope: "wellbeing",
    title: "Mood and energy",
    form: "line",
    colorJob: "categorical",
    rationale:
      "Two named series the reader must tell apart, so categorical — capped at two.",
  },
  {
    scope: "habit",
    title: "Habits",
    form: "heatmap",
    colorJob: "sequential",
    rationale: "A grid of days by habit; magnitude across a grid is a heatmap.",
  },
  {
    scope: "focus",
    title: "Focused time",
    form: "column",
    colorJob: "sequential",
    unit: "minutes",
    rationale: "Minutes per day, compared by magnitude.",
  },
  {
    scope: "movement",
    title: "Movement",
    form: "column",
    colorJob: "sequential",
    unit: "minutes",
    rationale: "Minutes per day, compared by magnitude.",
  },
  {
    scope: "workout",
    title: "Training volume",
    form: "line",
    colorJob: "sequential",
    unit: "kg",
    rationale: "Volume trending over weeks.",
  },
  {
    scope: "finances",
    title: "Money in and out",
    form: "diverging-bar",
    colorJob: "diverging",
    rationale:
      "Money in and out are opposite signs around zero, which is what diverging is for.",
  },
  {
    scope: "finances-categories",
    title: "Spending by category",
    form: "stacked-bar",
    colorJob: "categorical",
    rationale:
      "Part-to-whole across named categories; horizontal, because category names are long.",
  },
  {
    scope: "nutrition",
    title: "Meals",
    form: "column",
    colorJob: "sequential",
    rationale: "Meals recorded per day.",
  },
  {
    scope: "task",
    title: "Tasks completed",
    form: "column",
    colorJob: "sequential",
    rationale: "Completions per day, compared by magnitude.",
  },
  {
    scope: "goal",
    title: "Goal progress",
    form: "meter",
    colorJob: "sequential",
    rationale: "One ratio against a target.",
  },
  {
    scope: "streak",
    title: "Current streak",
    form: "stat",
    colorJob: "sequential",
    rationale: "A single current number with a trend, which is a stat tile.",
  },
];

export function chartFor(scope: string): TrackerChart | undefined {
  return TRACKER_CHARTS.find(chart => chart.scope === scope);
}

/**
 * The validated categorical order. Assigned by slot, in this order, never
 * cycled and never generated — a ninth hue would be indistinguishable from an
 * existing one under colour-vision deficiency.
 *
 * Both modes were run through the palette validator rather than eyeballed:
 * light passes the lightness band, chroma floor, CVD separation (worst adjacent
 * dE 9.1) and normal-vision floor (19.6); dark passes all five including
 * contrast.
 *
 * Light mode raises one warning: aqua, yellow and magenta sit below 3:1 against
 * the light surface. That is not dismissable — it obliges every chart using
 * those slots to carry visible labels or the table view from `toTableRows`,
 * which is why that table is a required output here rather than optional.
 */
export const CATEGORICAL_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
] as const;

export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
] as const;

/** Sequential: one hue, light to dark. Never a rainbow. */
export const SEQUENTIAL_BLUE = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
] as const;

/** Diverging: two opposed hues with a neutral grey midpoint, never a hue. */
export const DIVERGING = {
  negative: "#d03b3b",
  midpointLight: "#f0efec",
  midpointDark: "#383835",
  positive: "#2a78d6",
} as const;

export const CHART_SURFACE = { light: "#fcfcfb", dark: "#1a1a19" } as const;

/**
 * How many series a form can seat before identity stops being readable.
 * Past the cap the answer is to fold the tail into "Other" or to facet — never
 * to invent another hue.
 */
export const SERIES_CAP = { adjacent: 8, allPairs: 3, comfortable: 4 } as const;

export function seriesColor(
  index: number,
  mode: "light" | "dark" = "light"
): string {
  const palette = mode === "dark" ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  // Deliberately clamps rather than wrapping: a cycled hue would silently
  // repaint two different series the same colour.
  return palette[Math.min(index, palette.length - 1)];
}

/** `null` means nothing was recorded. `0` means it was recorded as none. */
export type Point = { key: string; label: string; value: number | null };

export type Series = {
  name: string;
  points: Point[];
  unit?: string;
};

export type Bucket = "day" | "week" | "month";

function bucketKey(day: DayKey, bucket: Bucket, weekStartsOn: number): string {
  if (bucket === "week") return weekStartKey(day, weekStartsOn);
  if (bucket === "month") return monthStartKey(day);
  return day;
}

export type SeriesInput = {
  /** Values already reduced per local day. Missing days must be absent. */
  valuesByDay: Record<DayKey, number>;
  from: DayKey;
  to: DayKey;
  name: string;
  unit?: string;
  bucket?: Bucket;
  weekStartsOn?: number;
  locale?: string;
};

/**
 * Builds a continuous series across the range.
 *
 * Every day in the range gets a point so the x-axis stays evenly spaced — a
 * chart that silently omits empty days compresses time and makes a gap look
 * like continuity. Days with no record carry `null`.
 */
export function buildSeries({
  valuesByDay,
  from,
  to,
  name,
  unit,
  bucket = "day",
  weekStartsOn = 1,
  locale = "en-GB",
}: SeriesInput): Series {
  const days = dayKeyRange(from, to);

  if (bucket === "day") {
    return {
      name,
      unit,
      points: days.map(day => ({
        key: day,
        label: formatDayKey(day, locale, { day: "numeric", month: "short" }),
        value: day in valuesByDay ? valuesByDay[day] : null,
      })),
    };
  }

  // Summed into buckets. A bucket is null only when *no* day in it held a
  // record; one recorded day makes the bucket real.
  const totals = new Map<string, { sum: number; recorded: boolean }>();

  for (const day of days) {
    const key = bucketKey(day, bucket, weekStartsOn);
    const current = totals.get(key) ?? { sum: 0, recorded: false };
    if (day in valuesByDay) {
      current.sum += valuesByDay[day];
      current.recorded = true;
    }
    totals.set(key, current);
  }

  return {
    name,
    unit,
    points: Array.from(totals.entries()).map(([key, totalsForKey]) => ({
      key,
      label: formatDayKey(
        key,
        locale,
        bucket === "month"
          ? { month: "short", year: "numeric" }
          : { day: "numeric", month: "short" }
      ),
      value: totalsForKey.recorded ? totalsForKey.sum : null,
    })),
  };
}

/** Reduces records to one number per local day, ready for `buildSeries`. */
export function valuesByDay<T>({
  records,
  timezone,
  instant,
  value,
  reduce = "sum",
}: {
  records: T[];
  timezone: string;
  instant: (record: T) => string;
  value: (record: T) => number;
  reduce?: "sum" | "average" | "count" | "last";
}): Record<DayKey, number> {
  const grouped = new Map<DayKey, number[]>();

  for (const record of records) {
    const day = dayKeyOf(instant(record), timezone);
    const bucket = grouped.get(day);
    if (bucket) bucket.push(value(record));
    else grouped.set(day, [value(record)]);
  }

  const result: Record<DayKey, number> = {};
  for (const [day, values] of Array.from(grouped)) {
    switch (reduce) {
      case "count":
        result[day] = values.length;
        break;
      case "average":
        result[day] =
          Math.round(
            (values.reduce((sum, entry) => sum + entry, 0) / values.length) * 10
          ) / 10;
        break;
      case "last":
        result[day] = values[values.length - 1];
        break;
      default:
        result[day] = values.reduce((sum, entry) => sum + entry, 0);
    }
  }
  return result;
}

export type SeriesStats = {
  /** Points that actually hold a value. */
  recorded: number;
  /** Points in the range with nothing recorded. */
  missing: number;
  total: number;
  min: number | null;
  max: number | null;
  /** Averaged over recorded points only — a gap is not a zero. */
  average: number | null;
  sum: number;
};

export function seriesStats(series: Series): SeriesStats {
  const values = series.points
    .map(point => point.value)
    .filter((value): value is number => value !== null);

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    recorded: values.length,
    missing: series.points.length - values.length,
    total: series.points.length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    average: values.length ? Math.round((sum / values.length) * 10) / 10 : null,
    sum,
  };
}

/**
 * The y-axis bounds.
 *
 * Bars are anchored at zero, because a truncated bar chart misstates the ratio
 * between its bars — that is the single most misleading thing a chart can do.
 * Lines may start above zero, where the question is the shape of the change.
 */
export function axisBounds(
  series: Series,
  form: ChartForm
): { min: number; max: number } {
  const stats = seriesStats(series);
  if (stats.max === null || stats.min === null) return { min: 0, max: 1 };

  const anchorAtZero = form === "column" || form === "stacked-bar";
  const min = anchorAtZero ? 0 : Math.min(0, stats.min);
  const headroom = Math.max(1, Math.ceil((stats.max - min) * 0.1));

  return { min, max: stats.max + headroom };
}

/** The table view every chart must be able to fall back to. */
export function toTableRows(
  series: Series
): Array<{ label: string; value: string }> {
  return series.points.map(point => ({
    label: point.label,
    value:
      point.value === null
        ? "Not recorded"
        : `${point.value}${series.unit ? ` ${series.unit}` : ""}`,
  }));
}

/**
 * The sentence that accompanies the chart.
 *
 * Reports the shape and says outright how many days hold nothing, because a
 * reader who cannot see the gaps would otherwise take the average as covering
 * the whole period.
 */
export function describeSeries(series: Series): string {
  const stats = seriesStats(series);
  const unit = series.unit ? ` ${series.unit}` : "";

  if (stats.recorded === 0) {
    return `${series.name}: nothing recorded across ${stats.total} day${stats.total === 1 ? "" : "s"}.`;
  }

  const parts = [
    `${series.name}: ${stats.recorded} of ${stats.total} day${stats.total === 1 ? "" : "s"} recorded`,
    `average ${stats.average}${unit}`,
    `ranging from ${stats.min}${unit} to ${stats.max}${unit}`,
  ];

  if (stats.missing > 0) {
    parts.push(
      `${stats.missing} day${stats.missing === 1 ? "" : "s"} with nothing recorded`
    );
  }

  return `${parts.join(", ")}.`;
}

/**
 * A meter: one value against its limit.
 *
 * `percentRaw` is uncapped so the label can say 115% while the track stays
 * within its own width. Passing a target is not an error state.
 */
export function meter(
  value: number,
  target: number
): { percent: number; percentRaw: number; overTarget: boolean; label: string } {
  if (!Number.isFinite(target) || target <= 0) {
    return {
      percent: 0,
      percentRaw: 0,
      overTarget: false,
      label: "No target set",
    };
  }
  const raw = Math.round((value / target) * 100);
  return {
    percent: Math.min(100, Math.max(0, raw)),
    percentRaw: raw,
    overTarget: value > target,
    label: `${value} of ${target}`,
  };
}

/**
 * A heatmap grid — the pixel views. Cells carry an intensity step index into
 * the sequential ramp, or `null` where nothing was recorded, so an unlogged
 * day and a zero day are painted differently.
 */
export function heatmapCells({
  valuesByDay,
  from,
  to,
  steps = SEQUENTIAL_BLUE.length,
}: {
  valuesByDay: Record<DayKey, number>;
  from: DayKey;
  to: DayKey;
  steps?: number;
}): Array<{ day: DayKey; value: number | null; step: number | null }> {
  const days = dayKeyRange(from, to);
  const values = days
    .filter(day => day in valuesByDay)
    .map(day => valuesByDay[day]);
  const max = values.length ? Math.max(...values) : 0;

  return days.map(day => {
    if (!(day in valuesByDay)) return { day, value: null, step: null };

    const value = valuesByDay[day];
    // A recorded zero gets the lightest step, not "no cell at all".
    const step =
      max === 0
        ? 0
        : Math.min(steps - 1, Math.round((value / max) * (steps - 1)));
    return { day, value, step };
  });
}

/**
 * Splits a signed series for a diverging bar — money in above the line, out
 * below. The midpoint stays neutral grey; a hue there would read as a value.
 */
export function divergingBars(points: Point[]): Array<{
  key: string;
  label: string;
  value: number | null;
  side: "positive" | "negative" | "zero" | "none";
}> {
  return points.map(point => ({
    ...point,
    side:
      point.value === null
        ? "none"
        : point.value > 0
          ? "positive"
          : point.value < 0
            ? "negative"
            : "zero",
  }));
}

/**
 * Folds a long tail into "Other" rather than seating a ninth hue.
 * Applies to any categorical breakdown — spending categories, activity types.
 */
export function foldTail<T extends { label: string; value: number }>(
  entries: T[],
  keep = SERIES_CAP.comfortable
): Array<{ label: string; value: number }> {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  if (sorted.length <= keep) return sorted;

  const head = sorted.slice(0, keep);
  const tail = sorted.slice(keep);
  return [
    ...head,
    {
      label: `Other (${tail.length})`,
      value: tail.reduce((sum, entry) => sum + entry.value, 0),
    },
  ];
}
