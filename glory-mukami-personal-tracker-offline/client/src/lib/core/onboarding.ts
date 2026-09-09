/**
 * First-run setup.
 *
 * The problem this solves is stated plainly in the requirement: without it, a
 * new user meets eighteen empty pages at once. So the flow's job is not to
 * collect data — it is to *reduce* what the user is looking at, by asking which
 * areas they actually want and switching the rest off.
 *
 * Every step is skippable and every answer is changeable later, so nothing here
 * is a gate. A user who skips the lot still ends up with a working journal on
 * sensible defaults rather than a half-configured one.
 */

import {
  DEFAULT_AREAS,
  resolvePreferences,
  setAreaTracked,
  type Preferences,
  type TrackedArea,
} from "./preferences";

export type OnboardingStepId =
  | "welcome"
  | "name"
  | "areas"
  | "first-habit"
  | "sleep-goal"
  | "water-goal"
  | "done";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  /** One line explaining why this is being asked. */
  why: string;
  /** False for the two steps that only present information. */
  skippable: boolean;
};

/**
 * Six short steps. The order matters: areas comes before the specific goals,
 * because choosing areas decides which of the later steps are even shown.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Your journal",
    why: "A quick look at how this is put together.",
    skippable: false,
  },
  {
    id: "name",
    title: "What should it call you?",
    why: "Only used to greet you. You can leave it blank.",
    skippable: true,
  },
  {
    id: "areas",
    title: "What would you like to track?",
    why: "Anything you leave off stays out of the way. You can add it later.",
    skippable: true,
  },
  {
    id: "first-habit",
    title: "One small habit",
    why: "One is easier to keep than five.",
    skippable: true,
  },
  {
    id: "sleep-goal",
    title: "How much sleep suits you?",
    why: "Used to show your nights against your own target, not a standard one.",
    skippable: true,
  },
  {
    id: "water-goal",
    title: "A daily water target",
    why: "So the water page has something to fill.",
    skippable: true,
  },
  {
    id: "done",
    title: "That is everything",
    why: "You can change any of this in settings.",
    skippable: false,
  },
];

/** Steps that only make sense when the matching area is switched on. */
const STEP_REQUIRES: Partial<Record<OnboardingStepId, TrackedArea>> = {
  "first-habit": "habits",
  "sleep-goal": "sleep",
  "water-goal": "water",
};

export type OnboardingAnswers = {
  displayName?: string;
  areas?: TrackedArea[];
  firstHabit?: string;
  sleepGoalHours?: number;
  waterGoalMl?: number;
};

export type OnboardingState = {
  stepIndex: number;
  answers: OnboardingAnswers;
  /** Steps the user moved past without answering. */
  skipped: OnboardingStepId[];
  completed: boolean;
};

export function startOnboarding(): OnboardingState {
  return { stepIndex: 0, answers: {}, skipped: [], completed: false };
}

/**
 * The steps this user will actually see.
 *
 * Filtered by the areas they chose, so someone who does not track sleep is
 * never asked for a sleep goal. Until they reach the areas step, the default
 * set applies.
 */
export function visibleSteps(state: OnboardingState): OnboardingStep[] {
  const areas = state.answers.areas ?? DEFAULT_AREAS;
  return ONBOARDING_STEPS.filter(step => {
    const required = STEP_REQUIRES[step.id];
    return !required || areas.includes(required);
  });
}

export function currentStep(state: OnboardingState): OnboardingStep | null {
  return visibleSteps(state)[state.stepIndex] ?? null;
}

export function progress(state: OnboardingState): {
  step: number;
  total: number;
  percent: number;
} {
  const total = visibleSteps(state).length;
  const step = Math.min(state.stepIndex + 1, total);
  return { step, total, percent: Math.round((step / total) * 100) };
}

export function answer(
  state: OnboardingState,
  patch: OnboardingAnswers
): OnboardingState {
  return { ...state, answers: { ...state.answers, ...patch } };
}

export function next(state: OnboardingState): OnboardingState {
  const steps = visibleSteps(state);
  const atEnd = state.stepIndex >= steps.length - 1;
  return atEnd
    ? { ...state, completed: true }
    : { ...state, stepIndex: state.stepIndex + 1 };
}

export function back(state: OnboardingState): OnboardingState {
  return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
}

export function skipStep(state: OnboardingState): OnboardingState {
  const step = currentStep(state);
  if (!step || !step.skippable) return next(state);
  return next({ ...state, skipped: [...state.skipped, step.id] });
}

/**
 * Leaves the whole flow at once.
 *
 * The requirement is that setup can be skipped entirely, which has to mean one
 * action rather than tapping through six screens saying "not now".
 */
export function skipAll(state: OnboardingState): OnboardingState {
  return {
    ...state,
    completed: true,
    skipped: ONBOARDING_STEPS.filter(step => step.skippable).map(
      step => step.id
    ),
  };
}

/**
 * Turns the answers into preferences.
 *
 * Anything unanswered falls through to the default rather than being written as
 * a blank, so a skipped flow and a completed one produce equally valid settings.
 */
export function applyOnboarding(
  state: OnboardingState,
  base: Preferences = resolvePreferences()
): Preferences {
  const { answers } = state;

  let preferences: Preferences = {
    ...base,
    displayName: answers.displayName?.trim() || base.displayName,
    onboardingCompleted: true,
  };

  if (answers.areas) {
    // Applied as a set of decisions rather than a wholesale replacement, so the
    // sensitive areas stay off unless they were deliberately chosen.
    const chosen = new Set(answers.areas);
    const every = new Set<TrackedArea>([...base.areas, ...answers.areas]);
    for (const area of Array.from(every)) {
      preferences = setAreaTracked(preferences, area, chosen.has(area));
    }
  }

  // Both goals are clamped to something a person could plausibly mean, so a
  // slipped decimal point cannot leave the journal measuring against nonsense.
  if (typeof answers.sleepGoalHours === "number") {
    preferences = {
      ...preferences,
      sleepGoalHours: Math.max(1, Math.min(14, answers.sleepGoalHours)),
    };
  }

  if (typeof answers.waterGoalMl === "number") {
    preferences = {
      ...preferences,
      waterGoalMl: Math.max(250, Math.min(10_000, answers.waterGoalMl)),
    };
  }

  return preferences;
}

/** The habit the user named, ready to be created once setup finishes. */
export function firstHabitDraft(
  state: OnboardingState
): { title: string; schedule: { kind: "daily" } } | null {
  const title = state.answers.firstHabit?.trim();
  return title ? { title, schedule: { kind: "daily" } } : null;
}

/**
 * What to say at the end.
 *
 * Names what was set up, so the user leaves knowing what to expect rather than
 * being dropped into the journal to work it out.
 */
export function completionSummary(state: OnboardingState): string[] {
  const lines: string[] = [];
  const areas = state.answers.areas ?? DEFAULT_AREAS;

  lines.push(
    `${areas.length} area${areas.length === 1 ? "" : "s"} switched on. The rest are out of the way until you want them.`
  );

  if (state.answers.firstHabit?.trim()) {
    lines.push(`Your first habit: ${state.answers.firstHabit.trim()}.`);
  }
  if (typeof state.answers.waterGoalMl === "number") {
    lines.push(`Water target: ${state.answers.waterGoalMl} ml a day.`);
  }
  if (typeof state.answers.sleepGoalHours === "number") {
    lines.push(`Sleep target: ${state.answers.sleepGoalHours} hours a night.`);
  }

  lines.push("All of this can be changed in settings.");
  return lines;
}

/** Whether the flow should run at all. */
export function needsOnboarding(preferences: Preferences): boolean {
  return !preferences.onboardingCompleted;
}
