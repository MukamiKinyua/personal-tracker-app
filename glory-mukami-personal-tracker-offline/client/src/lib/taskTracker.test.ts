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
