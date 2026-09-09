/**
 * The hydration engine.
 *
 * Quick-add buttons must incrementally update the day's total against a
 * target, and the acceptance criteria ask for a glass of water to be logged in
 * under ten seconds. Both point the same way: adding water is one tap with no
 * dialog, no unit choice, and no confirmation — and therefore it must be
 * trivially reversible, because a mis-tap is inevitable at that speed.
 *
 * Every quantity here is millilitres. Display units are converted at the edge
 * in `./preferences`.
 */

import type { DayKey } from "./datetime";
import { fromMilliliters, type VolumeUnit } from "./preferences";

export type WaterEntry = {
  id: string;
  /** Millilitres. Always positive; a mistake is removed, not negated. */
  amountMl: number;
  at: string;
  /**
   * Insertion order within the session. Two taps can land in the same
   * millisecond, which makes `at` alone an ambiguous sort key — restoring an
   * undone entry would then be free to put it back in the wrong place.
   */
  seq: number;
  container?: string;
};

export type HydrationDay = {
  day: DayKey;
  entries: WaterEntry[];
  targetMl: number;
};

/** Presets sized so the common cases are one tap. */
export type ContainerPreset = { label: string; amountMl: number };

export const DEFAULT_PRESETS: ContainerPreset[] = [
  { label: "Glass", amountMl: 250 },
  { label: "Mug", amountMl: 350 },
  { label: "Bottle", amountMl: 500 },
  { label: "Large bottle", amountMl: 750 },
];

export const DEFAULT_TARGET_ML = 2000;

export function totalMl(entries: WaterEntry[]): number {
  return entries.reduce((sum, entry) => sum + Math.max(0, entry.amountMl), 0);
}

export function remainingMl(entries: WaterEntry[], targetMl: number): number {
  return Math.max(0, targetMl - totalMl(entries));
}

/**
 * Progress towards the target, capped at 100 for the bar's width.
 *
 * `percentRaw` is uncapped so the interface can say "115% of your target"
 * without the bar overflowing. Going over target is not an error and must not
 * be reported as one.
 */
export function progress(
  entries: WaterEntry[],
  targetMl: number
): { percent: number; percentRaw: number; overTarget: boolean } {
  if (!Number.isFinite(targetMl) || targetMl <= 0) {
    return { percent: 0, percentRaw: 0, overTarget: false };
  }
  const total = totalMl(entries);
  const raw = Math.round((total / targetMl) * 100);
  return {
    percent: Math.min(100, Math.max(0, raw)),
    percentRaw: raw,
    overTarget: total > targetMl,
  };
}

let sequence = 0;

export function quickAdd(
  entries: WaterEntry[],
  amountMl: number,
  options: { at?: Date; container?: string } = {}
): { entries: WaterEntry[]; entry: WaterEntry } {
  const at = options.at ?? new Date();
  sequence += 1;
  const entry: WaterEntry = {
    id: `w${at.getTime().toString(36)}${sequence.toString(36)}`,
    amountMl: Math.max(0, Math.round(amountMl)),
    at: at.toISOString(),
    seq: sequence,
    container: options.container,
  };
  return { entries: [...entries, entry], entry };
}

/** Removes one entry by id — the undo path for a mis-tapped quick-add. */
export function removeEntry(entries: WaterEntry[], id: string): WaterEntry[] {
  return entries.filter(entry => entry.id !== id);
}

/** Puts a removed entry back where it belongs in time. */
export function restoreEntry(
  entries: WaterEntry[],
  entry: WaterEntry
): WaterEntry[] {
  if (entries.some(existing => existing.id === entry.id)) return entries;
  return [...entries, entry].sort(
    (a, b) => a.at.localeCompare(b.at) || a.seq - b.seq
  );
}

/**
 * Suggests a higher target on days with logged movement.
 *
 * Deliberately a *suggestion* that the caller must apply. Silently moving
 * someone's goal because they went for a run would change the meaning of
 * their own history without asking, and the earlier requirements are explicit
 * that automation must not quietly rewrite records.
 */
export function suggestTarget({
  baseTargetMl = DEFAULT_TARGET_ML,
  movementMinutes = 0,
  intensity = "moderate",
}: {
  baseTargetMl?: number;
  movementMinutes?: number;
  intensity?: "gentle" | "moderate" | "vigorous";
}): { targetMl: number; addedMl: number; reason?: string } {
  if (movementMinutes <= 0) {
    return { targetMl: baseTargetMl, addedMl: 0 };
  }

  // Roughly 350ml per half hour of moderate activity, scaled by how hard it was.
  const perHalfHour = { gentle: 200, moderate: 350, vigorous: 500 }[intensity];
  const halfHours = movementMinutes / 30;
  const added = Math.round((halfHours * perHalfHour) / 50) * 50;

  if (added === 0) return { targetMl: baseTargetMl, addedMl: 0 };

  return {
    targetMl: baseTargetMl + added,
    addedMl: added,
    reason: `You logged ${movementMinutes} minutes of ${intensity} movement today.`,
  };
}

/**
 * The one-line summary beside the control. Phrased without praise or reproach:
 * hydration is not a moral achievement and the earlier requirements rule out
 * shame-based feedback.
 */
export function hydrationSummary(
  entries: WaterEntry[],
  targetMl: number,
  unit: VolumeUnit
): string {
  const total = totalMl(entries);
  if (entries.length === 0) return "Nothing logged yet today";

  const shown = `${fromMilliliters(total, unit)} ${unit}`;
  const state = progress(entries, targetMl);

  if (state.overTarget)
    return `${shown} — past your ${fromMilliliters(targetMl, unit)} ${unit} target`;
  const left = remainingMl(entries, targetMl);
  return `${shown} — ${fromMilliliters(left, unit)} ${unit} to go`;
}

/**
 * When during the day the water actually went in.
 *
 * Four buckets rather than twenty-four: "before noon" is a pattern someone can
 * act on, "between 2pm and 3pm" is noise. The bucket boundaries are wall clock
 * in the user's own timezone, so a late glass is counted in the evening they
 * experienced rather than the one UTC did.
 */
export type DayPart = "morning" | "afternoon" | "evening" | "night";

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: "before noon",
  afternoon: "the afternoon",
  evening: "the evening",
  night: "late at night",
};

const HOUR_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function localHour(instant: string, timezone: string): number {
  let formatter = HOUR_FORMATTERS.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    });
    HOUR_FORMATTERS.set(timezone, formatter);
  }
  const hour = Number(formatter.format(new Date(instant)));
  // Some engines render midnight as 24.
  return hour === 24 ? 0 : hour;
}

export function dayPartOf(instant: string, timezone: string): DayPart {
  const hour = localHour(instant, timezone);
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

export type HydrationPattern = {
  byPart: Record<DayPart, number>;
  total: number;
  /** The part holding the most, when one clearly leads. */
  dominant?: DayPart;
  /** Share of the total in the dominant part, 0–100. */
  dominantShare: number;
};

/**
 * Where the day's water clusters.
 *
 * A part only counts as dominant when it holds a clear majority. Naming a
 * winner at 34% would turn ordinary variation into a claim about the person.
 */
export function hydrationPattern(
  entries: WaterEntry[],
  timezone: string,
  dominanceThreshold = 50
): HydrationPattern {
  const byPart: Record<DayPart, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  for (const entry of entries) {
    byPart[dayPartOf(entry.at, timezone)] += Math.max(0, entry.amountMl);
  }

  const total =
    byPart.morning + byPart.afternoon + byPart.evening + byPart.night;
  if (total === 0) return { byPart, total: 0, dominantShare: 0 };

  const parts = Object.keys(byPart) as DayPart[];
  const leader = parts.reduce((best, part) =>
    byPart[part] > byPart[best] ? part : best
  );
  const share = Math.round((byPart[leader] / total) * 100);

  return {
    byPart,
    total,
    dominant: share >= dominanceThreshold ? leader : undefined,
    dominantShare: share,
  };
}

/**
 * The gentle observation the requirement asks for, instead of nagging.
 *
 * States a pattern in the user's own data and stops. No instruction, no target,
 * no implication that the pattern is a problem — it may not be one.
 */
export function hydrationPatternNote(
  entries: WaterEntry[],
  timezone: string,
  minimumEntries = 10
): string | null {
  // Below a handful of entries there is no pattern, only a few data points.
  if (entries.length < minimumEntries) return null;

  const pattern = hydrationPattern(entries, timezone);
  if (!pattern.dominant) return null;

  return `You tend to drink most of your water ${DAY_PART_LABEL[pattern.dominant]}.`;
}
