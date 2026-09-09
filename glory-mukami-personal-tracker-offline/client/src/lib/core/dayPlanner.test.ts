import { describe, expect, it } from "vitest";
import {
  addBlock,
  blockMinutes,
  blocksForDay,
  emptyPlanMessage,
  freeSlots,
  hourGrid,
  moveBlock,
  overcommittedNote,
  overlaps,
  planSummary,
  removeBlock,
  toTime,
  type PlanBlock,
} from "./dayPlanner";

const DAY = "2026-03-14";

function block(
  over: Partial<PlanBlock> & { id: string; start: string; end: string }
): PlanBlock {
  return { day: DAY, title: over.id, ...over };
}

describe("blocks", () => {
  it("measures its own length", () => {
    expect(blockMinutes(block({ id: "a", start: "09:00", end: "10:30" }))).toBe(
      90
    );
  });

  it("counts two blocks sharing a minute as overlapping", () => {
    const a = block({ id: "a", start: "09:00", end: "10:00" });
    const b = block({ id: "b", start: "09:30", end: "10:30" });
    expect(overlaps(a, b)).toBe(true);
  });

  it("lets one block start exactly where another ends", () => {
    const a = block({ id: "a", start: "09:00", end: "10:00" });
    const b = block({ id: "b", start: "10:00", end: "11:00" });
    expect(overlaps(a, b)).toBe(false);
  });

  it("does not compare blocks on different days", () => {
    const a = block({ id: "a", start: "09:00", end: "10:00" });
    const b = block({
      id: "b",
      start: "09:00",
      end: "10:00",
      day: "2026-03-15",
    });
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("adding a block", () => {
  const existing = [block({ id: "school", start: "08:00", end: "12:00" })];

  it("accepts one that fits", () => {
    const result = addBlock(
      existing,
      block({ id: "gym", start: "16:00", end: "17:00" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blocks).toHaveLength(2);
  });

  it("refuses a double-booking and names what it clashed with", () => {
    const result = addBlock(
      existing,
      block({ id: "gym", start: "11:00", end: "13:00" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.clashes.map(c => c.id)).toEqual(["school"]);
      expect(result.reason).toContain("school");
    }
  });

  it("refuses a block that ends before it starts", () => {
    const result = addBlock(
      [],
      block({ id: "x", start: "10:00", end: "09:00" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("end after it starts");
  });

  it("keeps the day in clock order", () => {
    let blocks: PlanBlock[] = [];
    blocks = (
      addBlock(blocks, block({ id: "late", start: "16:00", end: "17:00" })) as {
        blocks: PlanBlock[];
      }
    ).blocks;
    blocks = (
      addBlock(
        blocks,
        block({ id: "early", start: "08:00", end: "09:00" })
      ) as { blocks: PlanBlock[] }
    ).blocks;
    expect(blocks.map(b => b.id)).toEqual(["early", "late"]);
  });
});

describe("moving a block", () => {
  const blocks = [
    block({ id: "school", start: "08:00", end: "12:00" }),
    block({ id: "gym", start: "16:00", end: "17:00" }),
  ];

  it("moves into free time", () => {
    const result = moveBlock(blocks, "gym", { start: "13:00", end: "14:00" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        blocksForDay(result.blocks, DAY).find(b => b.id === "gym")?.start
      ).toBe("13:00");
    }
  });

  it("refuses a move that would double-book, leaving the original alone", () => {
    const result = moveBlock(blocks, "gym", { start: "09:00", end: "10:00" });
    expect(result.ok).toBe(false);
    // The untouched list still has the gym where it was.
    expect(blocks.find(b => b.id === "gym")?.start).toBe("16:00");
  });

  it("does not let a block clash with itself", () => {
    const result = moveBlock(blocks, "gym", { end: "18:00" });
    expect(result.ok).toBe(true);
  });

  it("reports a block that is no longer there", () => {
    const result = moveBlock(blocks, "missing", { start: "09:00" });
    expect(result.ok).toBe(false);
  });
});

describe("the hour grid", () => {
  const blocks = [block({ id: "school", start: "09:00", end: "11:30" })];

  it("shows a long block on every hour it covers", () => {
    const grid = hourGrid({ blocks, day: DAY, from: 8, to: 12 });
    const hoursWithSchool = grid
      .filter(row => row.blocks.some(b => b.id === "school"))
      .map(row => row.hour);

    // 10:00 must not look free just because the block began at 09:00.
    expect(hoursWithSchool).toEqual([9, 10, 11]);
  });

  it("covers the whole configured window", () => {
    const grid = hourGrid({ blocks: [], day: DAY, from: 6, to: 23 });
    expect(grid).toHaveLength(18);
    expect(grid[0].label).toBe("06:00");
  });
});

describe("free time", () => {
  it("finds the gaps between blocks", () => {
    const blocks = [
      block({ id: "a", start: "09:00", end: "10:00" }),
      block({ id: "b", start: "14:00", end: "15:00" }),
    ];
    const slots = freeSlots({ blocks, day: DAY, from: 8, to: 16 });

    expect(slots).toEqual([
      { start: "08:00", end: "09:00", minutes: 60 },
      { start: "10:00", end: "14:00", minutes: 240 },
      { start: "15:00", end: "16:00", minutes: 60 },
    ]);
  });

  it("ignores a gap too small to use", () => {
    const blocks = [
      block({ id: "a", start: "09:00", end: "10:00" }),
      block({ id: "b", start: "10:05", end: "11:00" }),
    ];
    const slots = freeSlots({
      blocks,
      day: DAY,
      from: 9,
      to: 11,
      minimumMinutes: 15,
    });
    expect(slots).toEqual([]);
  });

  it("returns the whole window when nothing is planned", () => {
    expect(freeSlots({ blocks: [], day: DAY, from: 9, to: 10 })).toEqual([
      { start: "09:00", end: "10:00", minutes: 60 },
    ]);
  });
});

describe("the summary", () => {
  it("adds up what is planned and what is left", () => {
    const blocks = [
      block({ id: "a", start: "09:00", end: "10:00", done: true }),
      block({ id: "b", start: "14:00", end: "15:00" }),
    ];
    expect(planSummary({ blocks, day: DAY, from: 8, to: 18 })).toEqual({
      blocks: 2,
      plannedMinutes: 120,
      doneBlocks: 1,
      freeMinutes: 480,
    });
  });

  it("mentions a wall-to-wall day as an observation, not a rule", () => {
    const blocks = [block({ id: "a", start: "08:00", end: "18:00" })];
    const note = overcommittedNote(
      planSummary({ blocks, day: DAY, from: 8, to: 18 })
    );

    expect(note).toContain("leaving a little air");
    expect(note?.toLowerCase()).not.toMatch(/should not|too many|wrong|stop/);
  });

  it("says nothing about a day with room in it", () => {
    const blocks = [block({ id: "a", start: "09:00", end: "10:00" })];
    expect(
      overcommittedNote(planSummary({ blocks, day: DAY, from: 8, to: 18 }))
    ).toBeNull();
  });

  it("says nothing about an empty day", () => {
    expect(overcommittedNote(planSummary({ blocks: [], day: DAY }))).toBeNull();
    expect(emptyPlanMessage()).toBe("Nothing planned for this day yet.");
  });
});

describe("time helpers", () => {
  it("clamps a time to a real one", () => {
    expect(toTime(-30)).toBe("00:00");
    expect(toTime(9 * 60 + 5)).toBe("09:05");
  });

  it("removes a block by id", () => {
    const blocks = [block({ id: "a", start: "09:00", end: "10:00" })];
    expect(removeBlock(blocks, "a")).toEqual([]);
  });
});
