/**
 * The daily plan — hour-by-hour time blocking.
 *
 * The requirement is careful about what this is not: "not a calendar, just a
 * local plan". So there are no invitations, no attendees, no sync. A block is
 * an intention the user wrote for one day, and the page's job is to bridge the
 * gap between a goal and the hours actually available to meet it.
 *
 * The one hard rule is that blocks may not overlap. A plan that quietly
 * double-books an hour is worse than no plan, because it looks feasible when
 * it is not.
 */

import type { DayKey } from "./datetime";

export type PlanBlock = {
  id: string;
  day: DayKey;
  /** Wall clock, "HH:mm". */
  start: string;
  end: string;
  title: string;
  /** Links the block to whatever it is in service of. */
  linkedKind?: string;
  linkedId?: string;
  note?: string;
  done?: boolean;
};

export const DEFAULT_DAY_START = 6;
export const DEFAULT_DAY_END = 23;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  return `${String(hours).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function blockMinutes(block: PlanBlock): number {
  return Math.max(0, toMinutes(block.end) - toMinutes(block.start));
}

/** Two blocks clash when they share any minute. Touching end-to-start is fine. */
export function overlaps(a: PlanBlock, b: PlanBlock): boolean {
  if (a.day !== b.day || a.id === b.id) return false;
  return (
    toMinutes(a.start) < toMinutes(b.end) &&
    toMinutes(b.start) < toMinutes(a.end)
  );
}

export function clashesWith(
  blocks: PlanBlock[],
  block: PlanBlock
): PlanBlock[] {
  return blocks.filter(existing => overlaps(existing, block));
}

export type AddBlockResult =
  | { ok: true; blocks: PlanBlock[] }
  | { ok: false; reason: string; clashes: PlanBlock[] };

/**
 * Adds a block, refusing a double-booking rather than silently accepting one.
 * The clashing blocks come back so the interface can show what it collided
 * with instead of an unexplained rejection.
 */
export function addBlock(
  blocks: PlanBlock[],
  block: PlanBlock
): AddBlockResult {
  if (toMinutes(block.end) <= toMinutes(block.start)) {
    return {
      ok: false,
      reason: "A block has to end after it starts.",
      clashes: [],
    };
  }

  const clashes = clashesWith(blocks, block);
  if (clashes.length > 0) {
    return {
      ok: false,
      clashes,
      reason: `That overlaps ${clashes.map(clash => clash.title).join(", ")}.`,
    };
  }

  return { ok: true, blocks: sortBlocks([...blocks, block]) };
}

export function removeBlock(blocks: PlanBlock[], id: string): PlanBlock[] {
  return blocks.filter(block => block.id !== id);
}

/** Moves or resizes a block, applying the same no-overlap rule. */
export function moveBlock(
  blocks: PlanBlock[],
  id: string,
  change: { start?: string; end?: string }
): AddBlockResult {
  const existing = blocks.find(block => block.id === id);
  if (!existing)
    return { ok: false, reason: "That block is gone.", clashes: [] };

  const moved = { ...existing, ...change };
  const rest = removeBlock(blocks, id);
  const result = addBlock(rest, moved);

  // A refused move must leave the original where it was.
  return result.ok ? result : { ...result };
}

export function sortBlocks(blocks: PlanBlock[]): PlanBlock[] {
  return [...blocks].sort(
    (a, b) =>
      toMinutes(a.start) - toMinutes(b.start) || a.title.localeCompare(b.title)
  );
}

export function blocksForDay(blocks: PlanBlock[], day: DayKey): PlanBlock[] {
  return sortBlocks(blocks.filter(block => block.day === day));
}

export type HourRow = {
  hour: number;
  label: string;
  blocks: PlanBlock[];
};

/**
 * The hour-by-hour grid.
 *
 * A block appears on every hour row it covers, so a 09:00–11:30 block is
 * visible at 10:00 rather than only at its start. Rendering it once at the top
 * leaves the middle of a long block looking free.
 */
export function hourGrid({
  blocks,
  day,
  from = DEFAULT_DAY_START,
  to = DEFAULT_DAY_END,
}: {
  blocks: PlanBlock[];
  day: DayKey;
  from?: number;
  to?: number;
}): HourRow[] {
  const forDay = blocksForDay(blocks, day);
  const rows: HourRow[] = [];

  for (let hour = from; hour <= to; hour += 1) {
    const rowStart = hour * 60;
    const rowEnd = rowStart + 60;
    rows.push({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      blocks: forDay.filter(
        block =>
          toMinutes(block.start) < rowEnd && rowStart < toMinutes(block.end)
      ),
    });
  }

  return rows;
}

/** Unplanned stretches inside the day window — where something could still go. */
export function freeSlots({
  blocks,
  day,
  from = DEFAULT_DAY_START,
  to = DEFAULT_DAY_END,
  minimumMinutes = 15,
}: {
  blocks: PlanBlock[];
  day: DayKey;
  from?: number;
  to?: number;
  minimumMinutes?: number;
}): Array<{ start: string; end: string; minutes: number }> {
  const forDay = blocksForDay(blocks, day);
  const slots: Array<{ start: string; end: string; minutes: number }> = [];

  let cursor = from * 60;
  const dayEnd = to * 60;

  for (const block of forDay) {
    const start = toMinutes(block.start);
    if (start > cursor) {
      const minutes = start - cursor;
      if (minutes >= minimumMinutes) {
        slots.push({ start: toTime(cursor), end: toTime(start), minutes });
      }
    }
    cursor = Math.max(cursor, toMinutes(block.end));
  }

  if (dayEnd > cursor && dayEnd - cursor >= minimumMinutes) {
    slots.push({
      start: toTime(cursor),
      end: toTime(dayEnd),
      minutes: dayEnd - cursor,
    });
  }

  return slots;
}

export type PlanSummary = {
  blocks: number;
  plannedMinutes: number;
  doneBlocks: number;
  freeMinutes: number;
};

export function planSummary({
  blocks,
  day,
  from = DEFAULT_DAY_START,
  to = DEFAULT_DAY_END,
}: {
  blocks: PlanBlock[];
  day: DayKey;
  from?: number;
  to?: number;
}): PlanSummary {
  const forDay = blocksForDay(blocks, day);
  const plannedMinutes = forDay.reduce(
    (total, block) => total + blockMinutes(block),
    0
  );

  return {
    blocks: forDay.length,
    plannedMinutes,
    doneBlocks: forDay.filter(block => block.done).length,
    freeMinutes: Math.max(0, (to - from) * 60 - plannedMinutes),
  };
}

/**
 * A gentle warning when the day is planned wall to wall.
 *
 * Stated as an observation rather than a rule. Some days genuinely are full,
 * and a planner that scolds the user for planning is not much use.
 */
export function overcommittedNote(summary: PlanSummary): string | null {
  if (summary.blocks === 0) return null;
  if (summary.freeMinutes > 60) return null;
  return "This day is planned almost end to end. Worth leaving a little air.";
}

export function emptyPlanMessage(): string {
  return "Nothing planned for this day yet.";
}
