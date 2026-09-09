export type PortraitSceneTheme = "undersea" | "nocturne" | "peacock";

type SceneAnchor = readonly [number, number];

const underseaAnchors: readonly SceneAnchor[] = [
  [30, 33],
  [43, 29],
  [56, 29],
  [69, 33],
  [21, 40],
  [34, 40],
  [47, 39],
  [60, 39],
  [73, 40],
  [17, 50],
  [30, 50],
  [43, 49],
  [56, 49],
  [69, 50],
  [82, 50],
  [16, 61],
  [29, 60],
  [42, 59],
  [55, 59],
  [68, 60],
  [81, 61],
  [19, 71],
  [32, 70],
  [45, 70],
  [58, 70],
  [71, 70],
  [24, 81],
  [37, 80],
  [50, 80],
  [63, 80],
  [76, 81],
];

const nocturneAnchors: readonly SceneAnchor[] = [
  [45, 29],
  [56, 28],
  [32, 34],
  [68, 34],
  [20, 44],
  [31, 43],
  [43, 42],
  [56, 42],
  [68, 43],
  [80, 44],
  [17, 55],
  [29, 54],
  [41, 53],
  [53, 53],
  [65, 53],
  [77, 54],
  [13, 66],
  [25, 65],
  [37, 64],
  [49, 64],
  [61, 64],
  [73, 65],
  [85, 66],
  [20, 77],
  [32, 76],
  [44, 75],
  [56, 75],
  [68, 76],
  [80, 77],
  [38, 86],
  [61, 86],
];

const peacockAnchors: readonly SceneAnchor[] = [
  [44, 29],
  [56, 29],
  [31, 35],
  [43, 38],
  [57, 38],
  [69, 35],
  [20, 45],
  [32, 47],
  [44, 48],
  [56, 48],
  [68, 47],
  [80, 45],
  [17, 57],
  [29, 58],
  [41, 58],
  [53, 58],
  [65, 58],
  [77, 57],
  [21, 69],
  [33, 69],
  [45, 68],
  [57, 68],
  [69, 69],
  [79, 69],
  [28, 79],
  [40, 78],
  [52, 78],
  [64, 78],
  [75, 79],
  [41, 87],
  [60, 87],
];

export function portraitDayAnchors(
  theme: PortraitSceneTheme
): readonly SceneAnchor[] {
  if (theme === "undersea") return underseaAnchors;
  return theme === "nocturne" ? nocturneAnchors : peacockAnchors;
}

export function portraitDayRegion(
  theme: PortraitSceneTheme,
  monthIndex: number,
  day: number
): { key: string; path: string } | null {
  const anchor = portraitDayAnchors(theme)[day - 1];
  if (!anchor) return null;
  return {
    key: `${monthIndex}-${day}`,
    path: portraitSlotPath(theme, anchor[0], anchor[1]),
  };
}

export function portraitSlotPath(
  theme: PortraitSceneTheme,
  x: number,
  y: number
): string {
  if (theme === "undersea")
    return `M${x + 6} ${y + 1} C${x + 1} ${y + 4},${x + 1} ${y + 9},${x + 6} ${y + 12} C${x + 11} ${y + 9},${x + 11} ${y + 4},${x + 6} ${y + 1} Z`;
  if (theme === "nocturne")
    return `M${x + 6} ${y} L${x + 8} ${y + 4} L${x + 12} ${y + 6} L${x + 8} ${y + 8} L${x + 6} ${y + 12} L${x + 4} ${y + 8} L${x} ${y + 6} L${x + 4} ${y + 4} Z`;
  return `M${x + 6} ${y} C${x + 11} ${y + 3},${x + 12} ${y + 8},${x + 6} ${y + 12} C${x} ${y + 8},${x + 1} ${y + 3},${x + 6} ${y} Z`;
}
