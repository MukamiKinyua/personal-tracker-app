export const pixelsMonths = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
] as const;

/** Full month names for accessible labels — the single-letter `pixelsMonths`
 * column headers are ambiguous (May/March/June all read the same) once read
 * out of visual context by a screen reader or tooltip. */
export const pixelsMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type PixelCells = Record<string, string>;

const pixelsMonthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Real day count for a month, so the grid never offers a date that can't exist
 * (e.g. Feb 30, Apr 31). Uses a non-leap-year reference since this tracker is
 * a repeating year-at-a-glance view rather than tied to one calendar year. */
export function pixelsDaysInMonth(monthIndex: number): number {
  return pixelsMonthLengths[monthIndex] ?? 31;
}

export function pixelsCellKey(monthIndex: number, day: number) {
  return `${monthIndex + 1}-${day}`;
}

export function updatePixelCell(
  cells: PixelCells,
  monthIndex: number,
  day: number,
  color: string
): PixelCells {
  const key = pixelsCellKey(monthIndex, day);
  if (cells[key] === color) {
    const next = { ...cells };
    delete next[key];
    return next;
  }
  return { ...cells, [key]: color };
}

export function setPixelCell(
  cells: PixelCells,
  monthIndex: number,
  day: number,
  color: string
): PixelCells {
  return { ...cells, [pixelsCellKey(monthIndex, day)]: color };
}

/**
 * Colours that pages once painted automatically but that never appeared in
 * the tracker's legend, mapped to the legend key they most honestly meant.
 * Applied on hydrate so stored years keep their history and gain a label.
 */
export const legacyPixelColors: Record<string, Record<string, string>> = {
  water: { "#16a8a8": "#8fd4e7" }, // "Some water" — goal status unknown
  learning: { "#8b5cf6": "#c94894" }, // "Practised" — the only auto path
  // The check-in once painted a red-to-green ramp the legend never listed.
  mood: {
    "#ef4444": "#e6ae42", // Low
    "#f97316": "#9673c6", // Tender
    "#eab308": "#3a9ba0", // Steady
    "#84cc16": "#e65c97", // Bright
    "#22c55e": "#e35d48", // Joyful
  },
};

export function migratePixelRecords(
  records: Record<string, PixelCells>
): Record<string, PixelCells> {
  let changed = false;
  const next: Record<string, PixelCells> = {};
  for (const [tracker, cells] of Object.entries(records)) {
    const mapping = legacyPixelColors[tracker];
    if (!mapping) {
      next[tracker] = cells;
      continue;
    }
    const migrated: PixelCells = {};
    for (const [key, color] of Object.entries(cells)) {
      const replacement = mapping[color];
      if (replacement) changed = true;
      migrated[key] = replacement ?? color;
    }
    next[tracker] = migrated;
  }
  return changed ? next : records;
}
