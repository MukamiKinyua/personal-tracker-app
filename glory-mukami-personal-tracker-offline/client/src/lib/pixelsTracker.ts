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

export function countFilledPixels(cells: PixelCells) {
  return Object.keys(cells).length;
}
