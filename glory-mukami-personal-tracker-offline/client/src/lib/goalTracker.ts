export type GoalMilestoneRecord = {
  id: string;
  title: string;
  done: boolean;
};

export type GoalState = "active" | "paused" | "completed" | "archived";

export type GoalWorkspaceRecord = {
  id: string;
  title: string;
  state: GoalState;
  manualProgress: number;
  milestones: GoalMilestoneRecord[];
};

export function factualGoalProgress(
  milestones: GoalMilestoneRecord[],
  manualProgress: number
) {
  if (!milestones.length) return Math.max(0, Math.min(100, manualProgress));
  return Math.round(
    (milestones.filter(milestone => milestone.done).length /
      milestones.length) *
      100
  );
}

export function goalStateSummary(goals: GoalWorkspaceRecord[]) {
  return goals.reduce(
    (summary, goal) => {
      summary[goal.state] += 1;
      return summary;
    },
    { active: 0, paused: 0, completed: 0, archived: 0 } as Record<
      GoalState,
      number
    >
  );
}

export function reviewGoals<T extends GoalWorkspaceRecord>(goals: T[]): T[] {
  return goals.filter(goal => goal.state !== "active");
}
