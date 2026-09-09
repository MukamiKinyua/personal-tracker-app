import { describe, expect, it } from "vitest";
import {
  addPriority,
  chooseTodayStep,
  createPriority,
  MAX_PRIORITIES,
  priorityAlignment,
  removePriority,
  reorderPriority,
  stalledGoals,
  todayStepLabel,
  type GoalNextStep,
} from "./priorities";

const TODAY = "2026-03-14";

function threePriorities() {
  let list = addPriority([], createPriority("School")).priorities;
  list = addPriority(list, createPriority("Exercise")).priorities;
  list = addPriority(list, createPriority("Family")).priorities;
  return list;
}

describe("choosing priorities", () => {
  it("holds at most three, because choosing is the point", () => {
    const list = threePriorities();
    expect(list).toHaveLength(MAX_PRIORITIES);

    const result = addPriority(list, createPriority("Reading"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Remove one");
    }
    // The refusal does not quietly drop anything.
    expect(result.priorities).toHaveLength(3);
  });

  it("refuses a duplicate, whatever its casing", () => {
    // Remove School to make room, then try to re-add Exercise, which is still
    // in the list.
    const full = threePriorities();
    const list = removePriority(full, full[0].id);
    const result = addPriority(list, createPriority("exercise"));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toContain("already one of your priorities");
  });

  it("makes room once one is removed", () => {
    const list = threePriorities();
    const smaller = removePriority(list, list[1].id);
    expect(addPriority(smaller, createPriority("Reading")).ok).toBe(true);
  });

  it("can be reordered", () => {
    const list = threePriorities();
    const moved = reorderPriority(list, list[2].id, 0);
    expect(moved.map(p => p.name)).toEqual(["Family", "School", "Exercise"]);
  });

  it("ignores a reorder for something not in the list", () => {
    const list = threePriorities();
    expect(reorderPriority(list, "missing", 0)).toBe(list);
  });
});

describe("how work lines up with priorities", () => {
  it("counts per priority and reports what is unassigned", () => {
    const list = threePriorities();
    const alignment = priorityAlignment({
      priorities: list,
      items: [
        { priorityId: list[0].id },
        { priorityId: list[0].id },
        { priorityId: list[1].id },
        {},
        {},
      ],
    });

    expect(alignment.byPriority[0].count).toBe(2);
    expect(alignment.byPriority[1].count).toBe(1);
    expect(alignment.byPriority[2].count).toBe(0);
    expect(alignment.unassigned).toBe(2);
    expect(alignment.total).toBe(5);
  });

  it("reports counts rather than a score", () => {
    const alignment = priorityAlignment({ priorities: [], items: [] });
    expect(alignment).not.toHaveProperty("percent");
    expect(alignment).not.toHaveProperty("score");
  });
});

describe("the step for today", () => {
  const steps: GoalNextStep[] = [
    {
      goalId: "g1",
      goalTitle: "Learn drawing",
      step: "Practise shading",
      minutes: 15,
      lastProgressOn: "2026-03-13",
    },
    {
      goalId: "g2",
      goalTitle: "Fix the bike",
      step: "Order a new chain",
      lastProgressOn: "2026-01-01",
    },
  ];

  it("surfaces the goal that has gone longest without moving", () => {
    const chosen = chooseTodayStep({ steps, today: TODAY });
    expect(chosen?.goalId).toBe("g2");
  });

  it("prefers a goal tied to a stated priority", () => {
    const list = threePriorities();
    const withPriority: GoalNextStep[] = [
      { ...steps[0], priorityId: list[0].id },
      steps[1],
    ];
    const chosen = chooseTodayStep({
      steps: withPriority,
      today: TODAY,
      priorities: list,
    });
    expect(chosen?.goalId).toBe("g1");
  });

  it("treats a goal that has never moved as the most neglected", () => {
    const never: GoalNextStep[] = [
      { goalId: "g3", goalTitle: "Start Spanish", step: "Learn ten words" },
      steps[0],
    ];
    expect(chooseTodayStep({ steps: never, today: TODAY })?.goalId).toBe("g3");
  });

  it("returns nothing when no goal has a next step", () => {
    expect(chooseTodayStep({ steps: [], today: TODAY })).toBeNull();
  });

  it("phrases the step as one concrete action", () => {
    expect(todayStepLabel(steps[0])).toBe(
      "Practise shading (about 15 minutes) — towards Learn drawing"
    );
    expect(todayStepLabel(steps[1])).toBe(
      "Order a new chain — towards Fix the bike"
    );
  });

  it("says plainly when there is nothing set", () => {
    expect(todayStepLabel(null)).toContain("No next step set");
  });
});

describe("goals that have stalled", () => {
  it("lists the ones untouched for a while, and the ones never touched", () => {
    const steps: GoalNextStep[] = [
      {
        goalId: "recent",
        goalTitle: "A",
        step: "x",
        lastProgressOn: "2026-03-13",
      },
      {
        goalId: "old",
        goalTitle: "B",
        step: "y",
        lastProgressOn: "2026-02-01",
      },
      { goalId: "never", goalTitle: "C", step: "z" },
    ];
    expect(stalledGoals({ steps, today: TODAY }).map(s => s.goalId)).toEqual([
      "old",
      "never",
    ]);
  });
});
