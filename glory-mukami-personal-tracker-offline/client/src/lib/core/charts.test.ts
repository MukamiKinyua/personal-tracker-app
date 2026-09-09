import { describe, expect, it } from "vitest";
import {
  axisBounds,
  buildSeries,
  CATEGORICAL_DARK,
  CATEGORICAL_LIGHT,
  chartFor,
  describeSeries,
  DIVERGING,
  divergingBars,
  foldTail,
  heatmapCells,
  meter,
  SEQUENTIAL_BLUE,
  seriesColor,
  seriesStats,
  toTableRows,
  TRACKER_CHARTS,
  valuesByDay,
} from "./charts";

describe("choosing a form", () => {
  it("uses a meter for a single ratio against a limit, not a chart", () => {
    expect(chartFor("water")?.form).toBe("meter");
    expect(chartFor("goal")?.form).toBe("meter");
  });

  it("uses a stat tile for a single current number", () => {
    expect(chartFor("streak")?.form).toBe("stat");
  });

  it("uses diverging only where the data has two signs", () => {
    expect(chartFor("finances")).toMatchObject({
      form: "diverging-bar",
      colorJob: "diverging",
    });
  });

  it("reserves categorical for when the series are the subject", () => {
    const categorical = TRACKER_CHARTS.filter(
      c => c.colorJob === "categorical"
    );
    // Mood/energy and spending categories: the reader must tell them apart.
    expect(categorical.map(c => c.scope).sort()).toEqual([
      "finances-categories",
      "wellbeing",
    ]);
  });

  it("records why each form was chosen", () => {
    for (const chart of TRACKER_CHARTS) {
      expect(chart.rationale.length).toBeGreaterThan(10);
    }
  });
});

describe("the palette", () => {
  it("keeps eight fixed categorical slots in both modes", () => {
    expect(CATEGORICAL_LIGHT).toHaveLength(8);
    expect(CATEGORICAL_DARK).toHaveLength(8);
  });

  it("assigns by slot and never cycles into a repeat", () => {
    expect(seriesColor(0)).toBe(CATEGORICAL_LIGHT[0]);
    expect(seriesColor(7)).toBe(CATEGORICAL_LIGHT[7]);
    // A ninth series clamps rather than wrapping round to slot 1, which would
    // paint two different series the same colour.
    expect(seriesColor(8)).toBe(CATEGORICAL_LIGHT[7]);
    expect(seriesColor(0)).not.toBe(seriesColor(8));
  });

  it("switches mode without changing the slot order", () => {
    expect(seriesColor(1, "dark")).toBe(CATEGORICAL_DARK[1]);
  });

  it("keeps the sequential ramp a single hue, light to dark", () => {
    // Monotonic: each step darker than the last.
    const brightness = SEQUENTIAL_BLUE.map(
      hex =>
        parseInt(hex.slice(1, 3), 16) +
        parseInt(hex.slice(3, 5), 16) +
        parseInt(hex.slice(5, 7), 16)
    );
    for (let index = 1; index < brightness.length; index += 1) {
      expect(brightness[index]).toBeLessThan(brightness[index - 1]);
    }
  });

  it("uses a neutral grey at the diverging midpoint, never a hue", () => {
    const grey = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    expect(grey(DIVERGING.midpointLight)).toBeLessThan(12);
    expect(grey(DIVERGING.midpointDark)).toBeLessThan(12);
  });
});

describe("building a series", () => {
  const valuesForDays = {
    "2026-03-10": 250,
    "2026-03-12": 0,
    "2026-03-13": 500,
  };

  it("distinguishes a day with nothing from a day recorded as zero", () => {
    const series = buildSeries({
      valuesByDay: valuesForDays,
      from: "2026-03-10",
      to: "2026-03-13",
      name: "Water",
      unit: "ml",
    });

    // The 11th was never logged; the 12th was logged as none.
    expect(series.points.map(p => p.value)).toEqual([250, null, 0, 500]);
  });

  it("keeps every day in the range so time is not compressed", () => {
    const series = buildSeries({
      valuesByDay: {},
      from: "2026-03-10",
      to: "2026-03-14",
      name: "Water",
    });
    expect(series.points).toHaveLength(5);
    expect(series.points.every(p => p.value === null)).toBe(true);
  });

  it("sums into weekly buckets", () => {
    const series = buildSeries({
      valuesByDay: { "2026-03-09": 100, "2026-03-10": 200, "2026-03-16": 50 },
      // 22 March is a Sunday, so it still belongs to the week of the 16th;
      // the range runs to the 29th to reach a genuinely empty third week.
      from: "2026-03-09",
      to: "2026-03-29",
      name: "Water",
      bucket: "week",
      weekStartsOn: 1,
    });
    expect(series.points).toHaveLength(3);
    expect(series.points[0].value).toBe(300);
    expect(series.points[1].value).toBe(50);
    // Third week has nothing at all, so it stays null rather than becoming 0.
    expect(series.points[2].value).toBeNull();
  });

  it("treats a bucket with one recorded zero as recorded", () => {
    const series = buildSeries({
      valuesByDay: { "2026-03-09": 0 },
      from: "2026-03-09",
      to: "2026-03-15",
      name: "Water",
      bucket: "week",
    });
    expect(series.points[0].value).toBe(0);
  });
});

describe("reducing records to days", () => {
  const records = [
    { at: "2026-03-14T06:00:00.000Z", amount: 250 },
    { at: "2026-03-14T13:00:00.000Z", amount: 500 },
    { at: "2026-03-13T06:00:00.000Z", amount: 100 },
  ];

  it("sums by default", () => {
    expect(
      valuesByDay({
        records,
        timezone: "UTC",
        instant: r => r.at,
        value: r => r.amount,
      })
    ).toEqual({ "2026-03-14": 750, "2026-03-13": 100 });
  });

  it("can count, average, or take the last value", () => {
    const common = {
      records,
      timezone: "UTC",
      instant: (r: (typeof records)[0]) => r.at,
      value: (r: (typeof records)[0]) => r.amount,
    };
    expect(valuesByDay({ ...common, reduce: "count" })["2026-03-14"]).toBe(2);
    expect(valuesByDay({ ...common, reduce: "average" })["2026-03-14"]).toBe(
      375
    );
    expect(valuesByDay({ ...common, reduce: "last" })["2026-03-14"]).toBe(500);
  });

  it("groups by the user's local day", () => {
    const late = [{ at: "2026-03-14T21:30:00.000Z", amount: 250 }];
    const nairobi = valuesByDay({
      records: late,
      timezone: "Africa/Nairobi",
      instant: r => r.at,
      value: r => r.amount,
    });
    expect(Object.keys(nairobi)).toEqual(["2026-03-15"]);
  });
});

describe("statistics and axes", () => {
  const series = buildSeries({
    valuesByDay: { "2026-03-10": 400, "2026-03-12": 800 },
    from: "2026-03-10",
    to: "2026-03-13",
    name: "Water",
    unit: "ml",
  });

  it("averages over recorded points only, never counting a gap as zero", () => {
    const stats = seriesStats(series);
    expect(stats.recorded).toBe(2);
    expect(stats.missing).toBe(2);
    // 600, not 300 — the two blank days are not zeros.
    expect(stats.average).toBe(600);
  });

  it("anchors bars at zero so the ratio between them stays honest", () => {
    expect(axisBounds(series, "column").min).toBe(0);
  });

  it("returns a usable range when nothing is recorded", () => {
    const empty = buildSeries({
      valuesByDay: {},
      from: "2026-03-10",
      to: "2026-03-11",
      name: "Water",
    });
    expect(axisBounds(empty, "line")).toEqual({ min: 0, max: 1 });
  });
});

describe("the accessible outputs", () => {
  const series = buildSeries({
    valuesByDay: { "2026-03-10": 400 },
    from: "2026-03-10",
    to: "2026-03-12",
    name: "Water",
    unit: "ml",
  });

  it("gives a table row for every point, naming the gaps", () => {
    const rows = toTableRows(series);
    expect(rows).toHaveLength(3);
    expect(rows[0].value).toBe("400 ml");
    expect(rows[1].value).toBe("Not recorded");
  });

  it("says how many days hold nothing, so the average is not misread", () => {
    const summary = describeSeries(series);
    expect(summary).toContain("1 of 3 days recorded");
    expect(summary).toContain("2 days with nothing recorded");
  });

  it("says plainly when there is no data at all", () => {
    const empty = buildSeries({
      valuesByDay: {},
      from: "2026-03-10",
      to: "2026-03-12",
      name: "Sleep",
    });
    expect(describeSeries(empty)).toBe(
      "Sleep: nothing recorded across 3 days."
    );
  });
});

describe("meters", () => {
  it("caps the track but reports the real figure", () => {
    const result = meter(2500, 2000);
    expect(result.percent).toBe(100);
    expect(result.percentRaw).toBe(125);
    expect(result.overTarget).toBe(true);
  });

  it("handles a missing target without dividing by zero", () => {
    expect(meter(500, 0).label).toBe("No target set");
  });
});

describe("heatmap cells", () => {
  it("leaves an unlogged day without a step, but gives a logged zero one", () => {
    const cells = heatmapCells({
      valuesByDay: { "2026-03-10": 0, "2026-03-12": 10 },
      from: "2026-03-10",
      to: "2026-03-12",
    });

    expect(cells[0]).toMatchObject({ value: 0, step: 0 });
    expect(cells[1]).toMatchObject({ value: null, step: null });
    expect(cells[2].step).toBeGreaterThan(0);
  });

  it("does not divide by zero when every value is zero", () => {
    const cells = heatmapCells({
      valuesByDay: { "2026-03-10": 0 },
      from: "2026-03-10",
      to: "2026-03-10",
    });
    expect(cells[0].step).toBe(0);
  });
});

describe("diverging bars", () => {
  it("labels each side, keeping zero and absent apart", () => {
    const bars = divergingBars([
      { key: "a", label: "A", value: 100 },
      { key: "b", label: "B", value: -50 },
      { key: "c", label: "C", value: 0 },
      { key: "d", label: "D", value: null },
    ]);
    expect(bars.map(b => b.side)).toEqual([
      "positive",
      "negative",
      "zero",
      "none",
    ]);
  });
});

describe("folding a long tail", () => {
  it("groups the remainder rather than inventing more hues", () => {
    const folded = foldTail(
      [
        { label: "Food", value: 100 },
        { label: "Rent", value: 300 },
        { label: "Transport", value: 50 },
        { label: "Books", value: 20 },
        { label: "Gifts", value: 10 },
        { label: "Other bits", value: 5 },
      ],
      3
    );
    expect(folded.map(f => f.label)).toEqual([
      "Rent",
      "Food",
      "Transport",
      "Other (3)",
    ]);
    expect(folded[3].value).toBe(35);
  });

  it("leaves a short list alone", () => {
    const entries = [{ label: "A", value: 1 }];
    expect(foldTail(entries, 4)).toEqual(entries);
  });
});
