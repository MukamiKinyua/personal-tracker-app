import { describe, expect, it } from "vitest";
import {
  assignmentDueStatus,
  assignmentWorkload,
  sortAssignmentsByDue,
  type AssignmentPlan,
} from "./assignmentTracker";

const assignments: AssignmentPlan[] = [
  {
    id: "later",
    title: "Later",
    subject: "Course",
    notes: "",
    due: "2026-08-29T14:00",
    priority: "Medium",
    nextAction: "Read brief",
    startBy: "2026-08-26",
    effortMinutes: 60,
    subtasks: [],
    completed: false,
  },
  {
    id: "today",
    title: "Today",
    subject: "Course",
    notes: "",
    due: "2026-08-25T17:00",
    priority: "High",
    nextAction: "Outline",
    startBy: "2026-08-25",
    effortMinutes: 45,
    subtasks: [],
    completed: false,
  },
  {
    id: "done",
    title: "Done",
    subject: "Course",
    notes: "",
    due: "2026-08-24T12:00",
    priority: "Low",
    nextAction: "",
    startBy: "",
    effortMinutes: 20,
    subtasks: [],
    completed: true,
  },
];

describe("assignment tracker helpers", () => {
  it("provides factual due labels", () => {
    expect(assignmentDueStatus("2026-08-25T17:00", "2026-08-25")).toBe(
      "Due today"
    );
    expect(assignmentDueStatus("2026-08-27T17:00", "2026-08-25")).toBe(
      "2 days left"
    );
  });

  it("sorts active assignments by deadline and summarises this week’s local workload", () => {
    expect(sortAssignmentsByDue(assignments).map(item => item.id)).toEqual([
      "today",
      "later",
      "done",
    ]);
    expect(assignmentWorkload(assignments, "2026-08-25")).toEqual({
      dueThisWeek: 2,
      effortMinutes: 105,
    });
  });
});
