/**
 * What the journal looks like over time.
 *
 * The first surface that shows something no single page could: it reads every
 * tracker that now writes records and puts them on one screen.
 *
 * Everything here is descriptive. It reports what was recorded and does not
 * explain why, rank the weeks, or suggest what to do — the requirements are
 * explicit that this page describes what was saved rather than interpreting
 * the person who saved it.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import { TrackerChart } from "@/components/TrackerChart";
import {
  buildSeries,
  chartFor,
  valuesByDay,
  type Bucket,
} from "@/lib/core/charts";
import { shiftDayKey } from "@/lib/core/datetime";
import { useMemo, useState } from "react";

/**
 * What each tracker is measured by over time, and which chart definition
 * describes that measure.
 *
 * `chartKey` is separate from `scope` on purpose. `chartFor("water")` is the
 * *meter* — one day's intake against its target — which is the wrong form for
 * a fourteen-day history. The series here wants `water-history`, the column
 * chart, and reading the scope's own entry would silently produce a chart
 * labelled "Water" that draws something the label does not describe.
 */
const MEASURES: Record<
  string,
  {
    chartKey: string;
    field: string;
    reduce: "sum" | "count";
    /** Records that should not appear at all. */
    include?: (body: Record<string, unknown>) => boolean;
    /** The day this belongs on, when it is not the record's own day. */
    dayField?: string;
  }
> = {
  water: { chartKey: "water-history", field: "amountMl", reduce: "sum" },
  sleep: { chartKey: "sleep", field: "hours", reduce: "sum" },
  // "Tasks completed" must count completions, not creations. A task carries
  // `completedAt` only once it has actually been ticked off, so one that was
  // never completed contributes nothing rather than being counted on the day
  // it was written down.
  task: {
    chartKey: "task",
    field: "",
    reduce: "count",
    include: body => Boolean(body.done) && typeof body.completedAt === "string",
    dayField: "completedAt",
  },
};

const RANGES = [
  { label: "14 days", days: 14, bucket: "day" as Bucket },
  { label: "8 weeks", days: 56, bucket: "week" as Bucket },
  { label: "6 months", days: 182, bucket: "month" as Bucket },
];

export function InsightsPanel() {
  const journal = useRecordStore();
  const [rangeIndex, setRangeIndex] = useState(0);
  const range = RANGES[rangeIndex];

  const from = shiftDayKey(journal.today, -(range.days - 1));

  const charts = useMemo(() => {
    return Object.entries(MEASURES)
      .map(([scope, measure]) => {
        const records = journal
          .inScope(scope)
          .filter(record => measure.include?.(record.body) ?? true);
        if (records.length === 0) return null;

        const chart = chartFor(measure.chartKey);

        const byDay = valuesByDay({
          records,
          timezone: journal.store.timezone,
          instant: record =>
            measure.dayField
              ? String(record.body[measure.dayField])
              : record.period.start,
          value: record =>
            measure.reduce === "count"
              ? 1
              : Number(record.body[measure.field]) || 0,
          reduce: measure.reduce,
        });

        return {
          scope,
          title: chart?.title ?? scope,
          form: chart?.form,
          series: buildSeries({
            valuesByDay: byDay,
            from,
            to: journal.today,
            name: chart?.title ?? scope,
            unit: chart?.unit,
            bucket: range.bucket,
            weekStartsOn: journal.preferences.weekStartsOn,
            locale: journal.preferences.locale,
          }),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [from, journal, range.bucket]);

  return (
    <div className="insights-panel">
      <div className="insights-heading">
        <b>Over time</b>
        <div className="insights-ranges" role="group" aria-label="Period">
          {RANGES.map((option, index) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={index === rangeIndex}
              className={index === rangeIndex ? "active" : ""}
              onClick={() => setRangeIndex(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {charts.length === 0 ? (
        <p className="insights-empty">
          Nothing recorded yet. These charts fill in as you log — they read the
          same entries the pages write, so there is nothing extra to keep up.
        </p>
      ) : (
        <div className="insights-charts">
          {charts.map(entry => (
            <TrackerChart
              key={entry.scope}
              series={entry.series}
              title={entry.title}
              form={entry.form}
            />
          ))}
        </div>
      )}

      <p className="insights-note">
        These describe what you saved. They do not explain why anything
        happened.
      </p>
    </div>
  );
}
