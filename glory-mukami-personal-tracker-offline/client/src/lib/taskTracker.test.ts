import { describe, expect, it } from "vitest";
import {
  normalizePlanningTasks,
  taskPlanningSummary,
  taskSection,
  type PlanningTask,
} from "./taskTracker";

const tasks: PlanningTask[] = [
  {
    id: "today",
    title: "Review brief",
    when: "today",
    due: "Today · 5:00 PM",
    area: "Study",
    priority: "High",
    nextStep: "Open the brief",
    note: "",
    done: false,
    subtasks: [],
  },
  {
    id: "later",
    title: "Plan week",
    when: "later",
    due: "This week",
    area: "Life admin",
    priority: "Medium",
    nextStep: "",
    note: "",
    done: false,
    subtasks: [],
  },
  {
    id: "done",
    title: "Reply",
    when: "today",
    due: "Today",
    area: "Study",
    priority: "Low",
    nextStep: "",
    note: "",
    done: true,
    subtasks: [],
  },
];

describe("task planning helpers", () => {
  it("normalizes legacy task records into structured tasks", () => {
    expect(
      normalizePlanningTasks([
        {
          title: "Read brief",
          due: "Today · 5:00 PM",
          priority: "High",
          done: true,
        },
      ])
    ).toEqual([
      {
        id: "task-1",
        title: "Read brief",
        when: "today",
        due: "Today · 5:00 PM",
        area: "Life admin",
        priority: "High",
        nextStep: "",
        note: "",
        done: true,
        subtasks: [],
      },
    ]);
  });

  it("gives factual planning counts", () => {
    expect(taskPlanningSummary(tasks)).toEqual({
      todayOpen: 1,
      laterOpen: 1,
      completed: 1,
      timeBoundToday: 1,
    });
  });

  it("keeps completed tasks separate from Today and Later", () => {
    expect(taskSection(tasks, "today").map(task => task.id)).toEqual(["today"]);
    expect(taskSection(tasks, "completed").map(task => task.id)).toEqual([
      "done",
    ]);
  });
});

describe("ordering a section", () => {
  function task(over: Partial<PlanningTask> & { id: string }): PlanningTask {
    return {
      title: over.id,
      when: "today",
      due: "Today",
      area: "Study",
      priority: "Medium",
      nextStep: "",
      note: "",
      done: false,
      subtasks: [],
      ...over,
    };
  }

  it("puts the highest priority first", () => {
    const ordered = taskSection(
      [
        task({ id: "low", priority: "Low" }),
        task({ id: "high", priority: "High" }),
        task({ id: "medium", priority: "Medium" }),
      ],
      "today"
    );
    // Previously this filtered without ordering, so a high-priority task could
    // sit below three low ones.
    expect(ordered.map(t => t.id)).toEqual(["high", "medium", "low"]);
  });

  it("is stable, so the list does not reshuffle between renders", () => {
    const tasks = [task({ id: "b" }), task({ id: "a" })];
    expect(taskSection(tasks, "today").map(t => t.id)).toEqual(["a", "b"]);
    expect(
      taskSection(taskSection(tasks, "today"), "today").map(t => t.id)
    ).toEqual(["a", "b"]);
  });

  it("still separates the sections it always did", () => {
    const tasks = [
      task({ id: "now" }),
      task({ id: "later", when: "later" }),
      task({ id: "done", done: true }),
    ];
    expect(taskSection(tasks, "today").map(t => t.id)).toEqual(["now"]);
    expect(taskSection(tasks, "later").map(t => t.id)).toEqual(["later"]);
    expect(taskSection(tasks, "completed").map(t => t.id)).toEqual(["done"]);
  });

  it("does not lose a task on the way through the sorter", () => {
    const many = Array.from({ length: 20 }, (_, i) => task({ id: `t${i}` }));
    expect(taskSection(many, "today")).toHaveLength(20);
  });
});
