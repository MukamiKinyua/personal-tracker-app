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

export type PixelCells = Record<string, string>;

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
