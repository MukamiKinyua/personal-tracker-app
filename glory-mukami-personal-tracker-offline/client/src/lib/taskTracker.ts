import { sortItems, type SortableItem } from "./core/sorting";

export type PlanningTask = {
  id: string;
  title: string;
  when: "today" | "later";
  due: string;
  area: string;
  priority: "High" | "Medium" | "Low";
  nextStep: string;
  note: string;
  done: boolean;
  subtasks: Array<{ id: string; label: string; done: boolean }>;
};

export function normalizePlanningTasks(value: unknown): PlanningTask[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<PlanningTask> & {
      due?: unknown;
      priority?: unknown;
    };
    const title =
      typeof candidate.title === "string" ? candidate.title.trim() : "";
    if (!title) return [];
    const when = candidate.when === "later" ? "later" : "today";
    const priority =
      candidate.priority === "High" ||
      candidate.priority === "Low" ||
      candidate.priority === "Medium"
        ? candidate.priority
        : "Medium";
    const subtasks = Array.isArray(candidate.subtasks)
      ? candidate.subtasks.flatMap((subtask, subtaskIndex) => {
          if (!subtask || typeof subtask !== "object") return [];
          const value = subtask as {
            id?: unknown;
            label?: unknown;
            done?: unknown;
          };
          const label =
            typeof value.label === "string" ? value.label.trim() : "";
          return label
            ? [
                {
                  id:
                    typeof value.id === "string"
                      ? value.id
                      : `${candidate.id || index}-subtask-${subtaskIndex}`,
                  label,
                  done: value.done === true,
                },
              ]
            : [];
        })
      : [];
    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id
            ? candidate.id
            : `task-${index + 1}`,
        title,
        when,
        due:
          typeof candidate.due === "string" && candidate.due.trim()
            ? candidate.due
            : when === "today"
              ? "Today"
              : "Later",
        area:
          typeof candidate.area === "string" && candidate.area.trim()
            ? candidate.area
            : "Life admin",
        priority,
        nextStep:
          typeof candidate.nextStep === "string" ? candidate.nextStep : "",
        note: typeof candidate.note === "string" ? candidate.note : "",
        done: candidate.done === true,
        subtasks,
      },
    ];
  });
}

export function taskPlanningSummary(tasks: PlanningTask[]): {
  todayOpen: number;
  laterOpen: number;
  completed: number;
  timeBoundToday: number;
} {
  const open = tasks.filter(task => !task.done);
  return {
    todayOpen: open.filter(task => task.when === "today").length,
    laterOpen: open.filter(task => task.when === "later").length,
    completed: tasks.filter(task => task.done).length,
    timeBoundToday: open.filter(
      task => task.when === "today" && /^Today/.test(task.due)
    ).length,
  };
}

/**
 * Maps a planning task onto the shared sorting model.
 *
 * `dueDay` is deliberately left unset. A task's `due` is free text — "Today ·
 * 5:00 PM", "This week" — which cannot be turned into a calendar day without
 * guessing, and a guessed date would drive a wrong "overdue" badge. Ordering
 * therefore runs on priority, which is a real field, and the page stays honest
 * about not knowing which tasks have actually slipped.
 */
function toSortable(task: PlanningTask): SortableItem {
  return {
    id: task.id,
    title: task.title,
    status: task.done ? "completed" : "not-started",
    priority:
      task.priority === "High"
        ? "urgent"
        : task.priority === "Low"
          ? "low"
          : "normal",
    area: task.area,
  };
}

/**
 * One section of the task list, ordered.
 *
 * Previously this filtered without ordering, so tasks appeared in whatever
 * order the store happened to return them and a high-priority task could sit
 * below three low ones. Sorting by priority then title also makes the order
 * stable, so the list does not reshuffle between renders.
 */
export function taskSection(
  tasks: PlanningTask[],
  section: "today" | "later" | "completed"
): PlanningTask[] {
  const matching =
    section === "completed"
      ? tasks.filter(task => task.done)
      : tasks.filter(task => !task.done && task.when === section);

  const byId = new Map(matching.map(task => [task.id, task]));

  return sortItems(matching.map(toSortable), ["priority", "title"])
    .map(item => byId.get(item.id))
    .filter((task): task is PlanningTask => Boolean(task));
}
