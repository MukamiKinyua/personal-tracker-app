/**
 * One tracker's chart.
 *
 * Hand-drawn SVG rather than a chart library, for one reason: the single most
 * important property here is that a day with no record renders as a *gap* and
 * a day recorded as zero renders as zero. Most chart libraries coerce a null
 * into 0 somewhere in their pipeline, and that silently invents data the user
 * never entered.
 *
 * The form for each tracker is decided in `charts.ts` by the job the data has
 * to do, not chosen here — a meter for a ratio against a target, a column for
 * comparing magnitudes, a line for a trend.
 */

import {
  axisBounds,
  describeSeries,
  seriesStats,
  toTableRows,
  SEQUENTIAL_BLUE,
  type ChartForm,
  type Series,
} from "@/lib/core/charts";
import { useId, useState } from "react";

const HEIGHT = 96;
const WIDTH = 320;
const PAD = 4;

function ColumnMarks({ series }: { series: Series }) {
  const { min, max } = axisBounds(series, "column");
  const span = Math.max(1, max - min);
  const slot = (WIDTH - PAD * 2) / Math.max(1, series.points.length);

  return (
    <>
      {series.points.map((point, index) => {
        // A gap draws nothing at all. Drawing a zero-height bar would be
        // indistinguishable from a day recorded as none.
        if (point.value === null) return null;

        const height = ((point.value - min) / span) * (HEIGHT - PAD * 2);
        const x = PAD + index * slot;
        const width = Math.max(2, slot - 2);

        return (
          <rect
            key={point.key}
            x={x}
            y={HEIGHT - PAD - height}
            width={width}
            height={Math.max(height, point.value === 0 ? 1 : height)}
            rx={2}
            fill={SEQUENTIAL_BLUE[4]}
          >
            <title>
              {point.label}: {point.value}
              {series.unit ? ` ${series.unit}` : ""}
            </title>
          </rect>
        );
      })}
    </>
  );
}

function LineMarks({ series }: { series: Series }) {
  const { min, max } = axisBounds(series, "line");
  const span = Math.max(1, max - min);
  const step = (WIDTH - PAD * 2) / Math.max(1, series.points.length - 1);

  const at = (value: number, index: number) => ({
    x: PAD + index * step,
    y: HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2),
  });

  // Split into runs of consecutive recorded points. A line drawn straight
  // across a gap asserts a trend through days that were never recorded.
  const runs: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];

  series.points.forEach((point, index) => {
    if (point.value === null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push(at(point.value, index));
  });
  if (run.length) runs.push(run);

  return (
    <>
      {runs.map((points, index) => (
        <polyline
          key={index}
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={SEQUENTIAL_BLUE[4]}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* A lone recorded day between two gaps has no line to sit on. */}
      {runs
        .filter(points => points.length === 1)
        .map((points, index) => (
          <circle
            key={`dot-${index}`}
            cx={points[0].x}
            cy={points[0].y}
            r={3}
            fill={SEQUENTIAL_BLUE[4]}
          />
        ))}
    </>
  );
}

/**
 * Forms this component can actually draw.
 *
 * A form it cannot draw must not be passed silently: `charts.ts` picks the
 * form from the job the data has to do, and quietly substituting a different
 * one throws that decision away where nobody can see it happen.
 */
const DRAWABLE = new Set<ChartForm>(["line", "column"]);

export function TrackerChart({
  series,
  title,
  form = "column",
}: {
  series: Series;
  title: string;
  /** Must be a form this component draws — see DRAWABLE. */
  form?: ChartForm;
}) {
  if (!DRAWABLE.has(form)) {
    throw new Error(
      `TrackerChart cannot draw "${form}". Pass a scope whose chart form is a line or a column, or implement it here.`
    );
  }

  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const stats = seriesStats(series);
  const summary = describeSeries(series);

  if (stats.recorded === 0) {
    return (
      <figure className="tracker-chart">
        <figcaption>{title}</figcaption>
        <p className="tracker-chart-empty">{summary}</p>
      </figure>
    );
  }

  return (
    <figure className="tracker-chart">
      <figcaption>{title}</figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        // The chart's text alternative, not a decorative label: it carries the
        // range, the average, and how many days hold nothing.
        aria-label={summary}
        preserveAspectRatio="none"
      >
        {form === "line" ? (
          <LineMarks series={series} />
        ) : (
          <ColumnMarks series={series} />
        )}
      </svg>

      <p className="tracker-chart-summary">{summary}</p>

      <button
        type="button"
        className="tracker-chart-toggle"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable(current => !current)}
      >
        {showTable ? "Hide the numbers" : "Show the numbers"}
      </button>

      {/* The table is a required fallback, not a nicety: several palette slots
          sit below 3:1 against the light surface, which obliges a text route
          to the same data. */}
      {showTable ? (
        <table id={tableId} className="tracker-chart-table">
          <tbody>
            {toTableRows(series).map(row => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}
