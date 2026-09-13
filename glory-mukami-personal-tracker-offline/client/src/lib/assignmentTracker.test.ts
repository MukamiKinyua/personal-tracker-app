import { describe, expect, it } from "vitest";
import {
  assignmentDueDetail,
  assignmentWorkload,
  sortAssignments,
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
    expect(assignmentDueDetail("2026-08-25T17:00", "2026-08-25").label).toBe(
      "Due today"
    );
    expect(assignmentDueDetail("2026-08-27T17:00", "2026-08-25").label).toBe(
      "2 days left"
    );
  });

  it("says how late an overdue assignment is, and always carries the exact date", () => {
    const late = assignmentDueDetail("2026-08-22T17:00", "2026-08-25");
    expect(late.kind).toBe("overdue");
    expect(late.label).toBe("Past due · 3 days");
    expect(late.daysAway).toBe(-3);
    expect(late.exact).toMatch(/22 Aug|Aug 22/);
    expect(late.exact).toMatch(/17:00|5:00/);

    const dateOnly = assignmentDueDetail("2026-08-29", "2026-08-25");
    expect(dateOnly.label).toBe("4 days left");
    expect(dateOnly.exact).not.toMatch(/:\d\d/);

    expect(assignmentDueDetail("", "2026-08-25").kind).toBe("none");
  });

  it("sorts by priority or course while keeping the due order inside ties", () => {
    const byPriority = sortAssignments(assignments, "priority").map(
      item => item.id
    );
    expect(byPriority[0]).toBe("today"); // the only High
    const byCourse = sortAssignments(assignments, "course");
    expect(byCourse.map(item => item.subject)).toEqual(
      [...byCourse.map(item => item.subject)].sort()
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
