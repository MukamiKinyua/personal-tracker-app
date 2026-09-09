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

export function assignmentDueStatus(
  due: string,
  referenceDate: string
): string {
  if (!due) return "No date set";
  const dueDate = new Date(due);
  const reference = new Date(`${referenceDate}T00:00:00`);
  const difference = Math.ceil(
    (new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate()
    ).getTime() -
      reference.getTime()) /
      86_400_000
  );
  if (difference < 0) return "Past due";
  if (difference === 0) return "Due today";
  if (difference === 1) return "Due tomorrow";
  if (difference <= 7) return `${difference} days left`;
  return `Due ${dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
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
