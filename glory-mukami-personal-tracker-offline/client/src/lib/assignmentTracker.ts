export type AssignmentSubtask = { id: string; label: string; done: boolean };

export type AssignmentPlan = {
  id: string;
  title: string;
  subject: string;
  notes: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  nextAction: string;
  startBy: string;
  effortMinutes: number;
  subtasks: AssignmentSubtask[];
  completed: boolean;
};

export type AssignmentDueKind =
  | "none"
  | "overdue"
  | "today"
  | "tomorrow"
  | "soon"
  | "later";

export type AssignmentDueDetail = {
  kind: AssignmentDueKind;
  /** Relative wording, e.g. "2 days left", "Past due · 3 days". */
  label: string;
  /** The exact local date (and time, if one was given), so the relative
   * label is never the only thing the user has to go on. */
  exact: string;
  /** Whole days from the reference day to the due day; negative when past. */
  daysAway: number | null;
};

/** Whether the value carries a clock time ("2026-08-25T17:00") or is a bare
 * date. Both parse as local time; only the display differs. */
function hasClockTime(due: string) {
  return /T\d{2}:\d{2}/.test(due);
}

export function assignmentDueDetail(
  due: string,
  referenceDate: string
): AssignmentDueDetail {
  if (!due) {
    return {
      kind: "none",
      label: "No due date",
      exact: "No date set — it won’t count toward this week’s workload",
      daysAway: null,
    };
  }
  const dueDate = new Date(due);
  const reference = new Date(`${referenceDate}T00:00:00`);
  const daysAway = Math.ceil(
    (new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate()
    ).getTime() -
      reference.getTime()) /
      86_400_000
  );
  const exactDate = dueDate.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year:
      dueDate.getFullYear() === reference.getFullYear() ? undefined : "numeric",
  });
  const exact = hasClockTime(due)
    ? `${exactDate}, ${dueDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : exactDate;

  if (daysAway < 0) {
    const late = Math.abs(daysAway);
    return {
      kind: "overdue",
      label: `Past due · ${late} day${late === 1 ? "" : "s"}`,
      exact,
      daysAway,
    };
  }
  if (daysAway === 0) return { kind: "today", label: "Due today", exact, daysAway };
  if (daysAway === 1)
    return { kind: "tomorrow", label: "Due tomorrow", exact, daysAway };
  if (daysAway <= 7)
    return { kind: "soon", label: `${daysAway} days left`, exact, daysAway };
  return {
    kind: "later",
    label: `Due ${dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    exact,
    daysAway,
  };
}

export type AssignmentSort = "due" | "priority" | "course";

const priorityRank: Record<AssignmentPlan["priority"], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function sortAssignments(
  assignments: AssignmentPlan[],
  by: AssignmentSort
): AssignmentPlan[] {
  const byDue = sortAssignmentsByDue(assignments);
  if (by === "due") return byDue;
  if (by === "priority")
    return [...byDue].sort(
      (first, second) =>
        priorityRank[first.priority] - priorityRank[second.priority]
    );
  return [...byDue].sort((first, second) =>
    first.subject.localeCompare(second.subject, undefined, {
      sensitivity: "base",
    })
  );
}

export function assignmentWorkload(
  assignments: AssignmentPlan[],
  referenceDate: string
): { dueThisWeek: number; effortMinutes: number } {
  const reference = new Date(`${referenceDate}T00:00:00`);
  const end = new Date(reference);
  end.setDate(end.getDate() + 7);
  const upcoming = assignments.filter(
    assignment =>
      !assignment.completed &&
      assignment.due &&
      new Date(assignment.due) >= reference &&
      new Date(assignment.due) <= end
  );
  return {
    dueThisWeek: upcoming.length,
    effortMinutes: upcoming.reduce(
      (total, assignment) => total + assignment.effortMinutes,
      0
    ),
  };
}

export function sortAssignmentsByDue(
  assignments: AssignmentPlan[]
): AssignmentPlan[] {
  return [...assignments].sort(
    (first, second) =>
      Number(first.completed) - Number(second.completed) ||
      (first.due || "9999").localeCompare(second.due || "9999")
  );
}
