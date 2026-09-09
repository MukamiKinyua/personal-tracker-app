/**
 * Rest timer and training load.
 *
 * The rest timer must keep running while the user navigates away from the
 * fitness page, so — as with the focus timer — it holds a start instant and
 * derives the remainder from the clock. A timer that counted intervals would
 * pause itself the moment the tab lost focus, which is exactly when someone
 * doing a set is not looking at it.
 *
 * Load is computed from what the user logged and nothing else. There is no
 * calorie estimate here: turning reps into calories needs body data this app
 * does not ask for, and the earlier requirements forbid presenting a guess as
 * a measurement or making health claims.
 */

export type RestTimer = {
  /** Epoch ms the rest began. Absent when the timer is not running. */
  startedAt?: number;
  seconds: number;
  /** What the rest follows, so the interface can name it. */
  label?: string;
};

export const DEFAULT_REST_SECONDS = 60;

export function startRest(
  seconds: number,
  now: number,
  label?: string
): RestTimer {
  return { startedAt: now, seconds: Math.max(1, Math.round(seconds)), label };
}

export function stopRest(timer: RestTimer): RestTimer {
  return { ...timer, startedAt: undefined };
}

export function restRemainingMs(timer: RestTimer, now: number): number {
  if (timer.startedAt === undefined) return timer.seconds * 1000;
  const elapsed = Math.max(0, now - timer.startedAt);
  return Math.max(0, timer.seconds * 1000 - elapsed);
}

export function isResting(timer: RestTimer, now: number): boolean {
  return timer.startedAt !== undefined && restRemainingMs(timer, now) > 0;
}

/**
 * True exactly once the rest has run out. The caller compares this against the
 * previous tick to decide whether to sound an alert, so a timer that expired
 * while the tab was hidden still announces itself on return rather than
 * silently having finished.
 */
export function restElapsed(timer: RestTimer, now: number): boolean {
  return timer.startedAt !== undefined && restRemainingMs(timer, now) === 0;
}

export function formatRest(timer: RestTimer, now: number): string {
  const total = Math.ceil(restRemainingMs(timer, now) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export type LoggedSet = {
  reps: number;
  /** Kilograms. Omitted for bodyweight work. */
  weightKg?: number;
};

export type LoggedExercise = {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
  /** How hard it felt, 1–10. Optional and self-reported. */
  effort?: number;
};

/**
 * Volume for one exercise: reps times weight, summed across sets.
 *
 * Bodyweight sets contribute reps but no weighted volume. Counting them as
 * zero would make a bodyweight session look like no session at all, so reps
 * are reported separately rather than folded into one misleading number.
 */
export function exerciseVolume(exercise: LoggedExercise): {
  reps: number;
  volumeKg: number;
  weightedSets: number;
} {
  let reps = 0;
  let volumeKg = 0;
  let weightedSets = 0;

  for (const set of exercise.sets) {
    const setReps = Math.max(0, set.reps);
    reps += setReps;
    if (typeof set.weightKg === "number" && set.weightKg > 0) {
      volumeKg += setReps * set.weightKg;
      weightedSets += 1;
    }
  }

  return { reps, volumeKg, weightedSets };
}

export type SessionLoad = {
  reps: number;
  volumeKg: number;
  sets: number;
  exercises: number;
  /** Volume weighted by self-reported effort, when effort was given. */
  effortLoad?: number;
};

export function sessionLoad(exercises: LoggedExercise[]): SessionLoad {
  let reps = 0;
  let volumeKg = 0;
  let sets = 0;
  let effortLoad = 0;
  let sawEffort = false;

  for (const exercise of exercises) {
    const totals = exerciseVolume(exercise);
    reps += totals.reps;
    volumeKg += totals.volumeKg;
    sets += exercise.sets.length;

    if (typeof exercise.effort === "number") {
      sawEffort = true;
      // Session-RPE style: work scaled by how hard it felt.
      effortLoad += totals.reps * exercise.effort;
    }
  }

  return {
    reps,
    volumeKg: Math.round(volumeKg),
    sets,
    exercises: exercises.length,
    // Absent rather than zero when no effort was recorded, so "not rated" and
    // "rated as nothing" stay distinguishable.
    effortLoad: sawEffort ? Math.round(effortLoad) : undefined,
  };
}

/** Adds up several sessions, for a weekly total. */
export function totalLoad(sessions: SessionLoad[]): SessionLoad {
  const combined = sessions.reduce<SessionLoad>(
    (total, session) => ({
      reps: total.reps + session.reps,
      volumeKg: total.volumeKg + session.volumeKg,
      sets: total.sets + session.sets,
      exercises: total.exercises + session.exercises,
      effortLoad:
        session.effortLoad === undefined
          ? total.effortLoad
          : (total.effortLoad ?? 0) + session.effortLoad,
    }),
    { reps: 0, volumeKg: 0, sets: 0, exercises: 0 }
  );
  return combined;
}

/**
 * Compares this week's load with the recent average.
 *
 * Returned as an observation, never as a warning or an instruction. The
 * earlier requirements allow training-load information only if it is clearly
 * informational rather than medical advice, so this reports the ratio and a
 * neutral sentence and stops there.
 */
export function loadComparison(
  currentWeek: SessionLoad,
  previousWeeks: SessionLoad[]
): { ratio: number | null; note: string } {
  const withWork = previousWeeks.filter(
    week => week.volumeKg > 0 || week.reps > 0
  );
  if (withWork.length === 0) {
    return { ratio: null, note: "Not enough history yet to compare." };
  }

  const averageReps =
    withWork.reduce((sum, week) => sum + week.reps, 0) / withWork.length;

  if (averageReps === 0) {
    return { ratio: null, note: "Not enough history yet to compare." };
  }

  const ratio = Math.round((currentWeek.reps / averageReps) * 100) / 100;

  if (ratio > 1.15) {
    return {
      ratio,
      note: "More work than your recent average. Worth noticing how recovery feels.",
    };
  }
  if (ratio < 0.85) {
    return { ratio, note: "Less work than your recent average." };
  }
  return { ratio, note: "About the same as your recent average." };
}

/** A plain summary of a session, for the history list and screen readers. */
export function describeSession(load: SessionLoad): string {
  if (load.exercises === 0) return "Nothing logged for this session";

  const parts = [
    `${load.exercises} exercise${load.exercises === 1 ? "" : "s"}`,
    `${load.sets} set${load.sets === 1 ? "" : "s"}`,
    `${load.reps} rep${load.reps === 1 ? "" : "s"}`,
  ];
  if (load.volumeKg > 0) parts.push(`${load.volumeKg} kg of volume`);
  return parts.join(", ");
}

export function describeRest(seconds: number): string {
  if (seconds < 60) return `Rest ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `Rest ${minutes}m` : `Rest ${minutes}m ${rest}s`;
}

export type PersonalRecord = {
  exerciseId: string;
  name: string;
  /** Heaviest single set. */
  bestWeightKg?: number;
  /** Most reps in one set. */
  bestReps?: number;
  /** Highest single-set volume, which catches progress the other two miss. */
  bestSetVolumeKg?: number;
  achievedOn: string;
};

/**
 * Personal records, tracked on three axes.
 *
 * Weight alone hides progress made by adding reps, and reps alone hides
 * progress made by adding weight. Single-set volume catches the case where
 * both moved a little and neither is a record on its own.
 */
export function updatePersonalRecord(
  current: PersonalRecord | undefined,
  exercise: LoggedExercise,
  on: string
): { record: PersonalRecord; beaten: Array<"weight" | "reps" | "volume"> } {
  let bestWeightKg = current?.bestWeightKg ?? 0;
  let bestReps = current?.bestReps ?? 0;
  let bestSetVolumeKg = current?.bestSetVolumeKg ?? 0;
  const beaten: Array<"weight" | "reps" | "volume"> = [];

  for (const set of exercise.sets) {
    const reps = Math.max(0, set.reps);
    const weight = set.weightKg ?? 0;
    const volume = reps * weight;

    if (weight > bestWeightKg) {
      bestWeightKg = weight;
      if (!beaten.includes("weight")) beaten.push("weight");
    }
    if (reps > bestReps) {
      bestReps = reps;
      if (!beaten.includes("reps")) beaten.push("reps");
    }
    if (volume > bestSetVolumeKg) {
      bestSetVolumeKg = volume;
      if (!beaten.includes("volume")) beaten.push("volume");
    }
  }

  return {
    record: {
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      // Zero means "never recorded", so it stays absent rather than shown.
      bestWeightKg: bestWeightKg > 0 ? bestWeightKg : undefined,
      bestReps: bestReps > 0 ? bestReps : undefined,
      bestSetVolumeKg: bestSetVolumeKg > 0 ? bestSetVolumeKg : undefined,
      achievedOn: beaten.length > 0 ? on : (current?.achievedOn ?? on),
    },
    beaten,
  };
}

/** Told once, plainly, without turning training into a scoreboard. */
export function personalRecordMessage(
  exercise: LoggedExercise,
  beaten: Array<"weight" | "reps" | "volume">
): string | null {
  if (beaten.length === 0) return null;
  const what = beaten
    .map(kind =>
      kind === "weight"
        ? "heaviest set"
        : kind === "reps"
          ? "most reps"
          : "biggest set"
    )
    .join(" and ");
  return `${exercise.name}: your ${what} so far.`;
}
