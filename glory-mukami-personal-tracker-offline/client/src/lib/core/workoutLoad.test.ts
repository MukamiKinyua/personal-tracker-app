import { describe, expect, it } from "vitest";
import {
  describeRest,
  describeSession,
  exerciseVolume,
  formatRest,
  isResting,
  loadComparison,
  restElapsed,
  restRemainingMs,
  sessionLoad,
  startRest,
  stopRest,
  personalRecordMessage,
  totalLoad,
  updatePersonalRecord,
  type LoggedExercise,
} from "./workoutLoad";

const T0 = 1_700_000_000_000;

describe("the rest timer", () => {
  it("counts down from the clock, so navigating away does not pause it", () => {
    const timer = startRest(90, T0, "After squats");
    expect(restRemainingMs(timer, T0)).toBe(90_000);
    expect(restRemainingMs(timer, T0 + 30_000)).toBe(60_000);
    // Away from the page for a minute; the rest kept running.
    expect(restRemainingMs(timer, T0 + 60_000)).toBe(30_000);
  });

  it("never goes negative", () => {
    const timer = startRest(60, T0);
    expect(restRemainingMs(timer, T0 + 5 * 60_000)).toBe(0);
    expect(formatRest(timer, T0 + 5 * 60_000)).toBe("0:00");
  });

  it("knows when it is running and when it has elapsed", () => {
    const timer = startRest(60, T0);
    expect(isResting(timer, T0 + 30_000)).toBe(true);
    expect(restElapsed(timer, T0 + 30_000)).toBe(false);

    expect(isResting(timer, T0 + 60_000)).toBe(false);
    // Still reports as elapsed after the fact, so a hidden tab can announce it.
    expect(restElapsed(timer, T0 + 10 * 60_000)).toBe(true);
  });

  it("reports neither resting nor elapsed once stopped", () => {
    const timer = stopRest(startRest(60, T0));
    expect(isResting(timer, T0 + 30_000)).toBe(false);
    expect(restElapsed(timer, T0 + 90_000)).toBe(false);
    // Back to its full length, ready for the next set.
    expect(restRemainingMs(timer, T0 + 90_000)).toBe(60_000);
  });

  it("formats the countdown", () => {
    const timer = startRest(90, T0);
    expect(formatRest(timer, T0)).toBe("1:30");
    expect(formatRest(timer, T0 + 31_000)).toBe("0:59");
  });

  it("describes a rest length in words", () => {
    expect(describeRest(45)).toBe("Rest 45s");
    expect(describeRest(120)).toBe("Rest 2m");
    expect(describeRest(90)).toBe("Rest 1m 30s");
  });

  it("refuses a zero-length rest", () => {
    expect(startRest(0, T0).seconds).toBe(1);
  });
});

describe("volume", () => {
  it("multiplies reps by weight across sets", () => {
    const exercise: LoggedExercise = {
      exerciseId: "squat",
      name: "Squat",
      sets: [
        { reps: 10, weightKg: 40 },
        { reps: 8, weightKg: 45 },
      ],
    };
    expect(exerciseVolume(exercise)).toEqual({
      reps: 18,
      volumeKg: 760,
      weightedSets: 2,
    });
  });

  it("counts bodyweight reps without inventing a weight for them", () => {
    const exercise: LoggedExercise = {
      exerciseId: "pushup",
      name: "Push-up",
      sets: [{ reps: 15 }, { reps: 12 }],
    };
    const totals = exerciseVolume(exercise);
    expect(totals.reps).toBe(27);
    expect(totals.volumeKg).toBe(0);
    // The reps are what make a bodyweight session visible at all.
    expect(totals.weightedSets).toBe(0);
  });

  it("ignores a negative rep count", () => {
    const exercise: LoggedExercise = {
      exerciseId: "x",
      name: "X",
      sets: [{ reps: -5, weightKg: 20 }],
    };
    expect(exerciseVolume(exercise).reps).toBe(0);
  });
});

describe("session load", () => {
  const session: LoggedExercise[] = [
    {
      exerciseId: "squat",
      name: "Squat",
      sets: [{ reps: 10, weightKg: 40 }],
      effort: 7,
    },
    { exerciseId: "pushup", name: "Push-up", sets: [{ reps: 15 }], effort: 5 },
  ];

  it("adds up reps, sets, volume and exercises", () => {
    expect(sessionLoad(session)).toMatchObject({
      reps: 25,
      volumeKg: 400,
      sets: 2,
      exercises: 2,
    });
  });

  it("scales work by self-reported effort when it was given", () => {
    // 10 reps at effort 7, plus 15 at effort 5.
    expect(sessionLoad(session).effortLoad).toBe(145);
  });

  it("leaves effort load absent rather than zero when nothing was rated", () => {
    const unrated = sessionLoad([
      { exerciseId: "a", name: "A", sets: [{ reps: 10 }] },
    ]);
    // "Not rated" and "rated as nothing" must stay distinguishable.
    expect(unrated.effortLoad).toBeUndefined();
  });

  it("handles an empty session", () => {
    expect(sessionLoad([])).toMatchObject({ reps: 0, sets: 0, exercises: 0 });
  });

  it("adds several sessions into a weekly total", () => {
    const week = totalLoad([sessionLoad(session), sessionLoad(session)]);
    expect(week.reps).toBe(50);
    expect(week.volumeKg).toBe(800);
  });
});

describe("comparing against recent weeks", () => {
  const week = (reps: number) => ({
    reps,
    volumeKg: reps * 10,
    sets: 4,
    exercises: 2,
  });

  it("says so plainly when there is no history to compare against", () => {
    const result = loadComparison(week(100), []);
    expect(result.ratio).toBeNull();
    expect(result.note).toBe("Not enough history yet to compare.");
  });

  it("reports the ratio against the recent average", () => {
    const result = loadComparison(week(120), [week(100), week(100)]);
    expect(result.ratio).toBe(1.2);
  });

  it("observes a heavier week without instructing the user", () => {
    const result = loadComparison(week(150), [week(100)]);
    expect(result.note).toContain("More work than your recent average");
    // Informational, not medical advice.
    expect(result.note.toLowerCase()).not.toMatch(
      /should|must|stop|risk|injur/
    );
  });

  it("reports a lighter week neutrally", () => {
    const result = loadComparison(week(50), [week(100)]);
    expect(result.note).toBe("Less work than your recent average.");
    expect(result.note.toLowerCase()).not.toMatch(/lazy|slacking|behind/);
  });

  it("treats a normal week as unremarkable", () => {
    expect(loadComparison(week(100), [week(100)]).note).toBe(
      "About the same as your recent average."
    );
  });
});

describe("describing a session", () => {
  it("reads out the numbers for the history list", () => {
    const load = sessionLoad([
      {
        exerciseId: "squat",
        name: "Squat",
        sets: [{ reps: 10, weightKg: 40 }],
      },
    ]);
    expect(describeSession(load)).toBe(
      "1 exercise, 1 set, 10 reps, 400 kg of volume"
    );
  });

  it("omits volume for a bodyweight session rather than saying 0 kg", () => {
    const load = sessionLoad([
      { exerciseId: "pushup", name: "Push-up", sets: [{ reps: 15 }] },
    ]);
    expect(describeSession(load)).toBe("1 exercise, 1 set, 15 reps");
  });

  it("says plainly when nothing was logged", () => {
    expect(describeSession(sessionLoad([]))).toBe(
      "Nothing logged for this session"
    );
  });
});

describe("personal records", () => {
  it("sets a first record from a first session", () => {
    const { record, beaten } = updatePersonalRecord(
      undefined,
      {
        exerciseId: "squat",
        name: "Squat",
        sets: [{ reps: 10, weightKg: 40 }],
      },
      "2026-03-14"
    );
    expect(record.bestWeightKg).toBe(40);
    expect(record.bestReps).toBe(10);
    expect(record.bestSetVolumeKg).toBe(400);
    expect(beaten.sort()).toEqual(["reps", "volume", "weight"]);
  });

  it("catches progress made by adding reps at the same weight", () => {
    const first = updatePersonalRecord(
      undefined,
      { exerciseId: "squat", name: "Squat", sets: [{ reps: 8, weightKg: 40 }] },
      "2026-03-10"
    ).record;

    const { record, beaten } = updatePersonalRecord(
      first,
      {
        exerciseId: "squat",
        name: "Squat",
        sets: [{ reps: 12, weightKg: 40 }],
      },
      "2026-03-14"
    );

    // The weight did not move, so weight alone would have missed this.
    expect(beaten).toContain("reps");
    expect(beaten).toContain("volume");
    expect(beaten).not.toContain("weight");
    expect(record.bestReps).toBe(12);
  });

  it("reports nothing beaten on an easier session, and keeps the old date", () => {
    const first = updatePersonalRecord(
      undefined,
      {
        exerciseId: "squat",
        name: "Squat",
        sets: [{ reps: 12, weightKg: 60 }],
      },
      "2026-03-10"
    ).record;

    const { record, beaten } = updatePersonalRecord(
      first,
      { exerciseId: "squat", name: "Squat", sets: [{ reps: 5, weightKg: 20 }] },
      "2026-03-14"
    );

    expect(beaten).toEqual([]);
    expect(record.achievedOn).toBe("2026-03-10");
    expect(record.bestWeightKg).toBe(60);
  });

  it("leaves weight absent for a bodyweight exercise rather than recording 0 kg", () => {
    const { record } = updatePersonalRecord(
      undefined,
      { exerciseId: "pushup", name: "Push-up", sets: [{ reps: 20 }] },
      "2026-03-14"
    );
    expect(record.bestWeightKg).toBeUndefined();
    expect(record.bestReps).toBe(20);
  });

  it("says so once, plainly, without a scoreboard", () => {
    const exercise = {
      exerciseId: "squat",
      name: "Squat",
      sets: [{ reps: 10, weightKg: 40 }],
    };
    expect(personalRecordMessage(exercise, ["weight"])).toBe(
      "Squat: your heaviest set so far."
    );
    expect(personalRecordMessage(exercise, [])).toBeNull();
  });
});
