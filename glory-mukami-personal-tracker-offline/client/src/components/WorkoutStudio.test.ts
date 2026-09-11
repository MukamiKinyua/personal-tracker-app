/**
 * The grouping rules the studio invents on top of `workoutLoad`.
 *
 * Worth testing separately because they are where a wrong answer would be
 * invisible: a personal record split across two spellings of the same lift
 * simply never appears, and nothing about the screen would look broken.
 */

import { describe, expect, it } from "vitest";
import {
  exerciseKey,
  exercisesFrom,
  positive,
} from "@/components/WorkoutStudio";
import { sessionLoad, updatePersonalRecord } from "@/lib/core/workoutLoad";

const set = (body: Record<string, unknown>) => ({ body });

describe("exerciseKey", () => {
  it("treats spellings of the same lift as the same lift", () => {
    expect(exerciseKey("Back Squat")).toBe(exerciseKey("  back squat "));
    expect(exerciseKey("Back  Squat")).toBe("back-squat");
  });

  it("keeps different lifts apart", () => {
    expect(exerciseKey("Front Squat")).not.toBe(exerciseKey("Back Squat"));
  });
});

describe("positive", () => {
  it("rejects anything that is not a usable number", () => {
    for (const value of ["", "  ", "abc", null, undefined, 0, -5, NaN]) {
      expect(positive(value)).toBeUndefined();
    }
  });

  it("accepts a real measurement", () => {
    expect(positive("62.5")).toBe(62.5);
  });
});

describe("exercisesFrom", () => {
  it("collects sets of one lift under one entry, however it was typed", () => {
    const grouped = exercisesFrom([
      set({ exerciseId: "back-squat", name: "Back Squat", reps: 5, weightKg: 60 }),
      set({ exerciseId: "back-squat", name: "back squat", reps: 5, weightKg: 62.5 }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].sets).toHaveLength(2);
  });

  it("falls back to the name when a record carries no id", () => {
    const grouped = exercisesFrom([set({ name: "Back Squat", reps: 5 })]);
    expect(grouped[0].exerciseId).toBe("back-squat");
  });

  it("ignores a record with no name rather than inventing one", () => {
    expect(exercisesFrom([set({ reps: 5, weightKg: 60 })])).toEqual([]);
  });

  it("counts bodyweight reps but adds no volume for them", () => {
    const load = sessionLoad(
      exercisesFrom([
        set({ name: "Press-up", reps: 20 }),
        set({ name: "Press-up", reps: 15 }),
      ])
    );

    expect(load.reps).toBe(35);
    expect(load.volumeKg).toBe(0);
    // A bodyweight session must not read as no session at all.
    expect(load.sets).toBe(2);
  });

  it("takes an exercise's effort as the hardest set of it felt", () => {
    const grouped = exercisesFrom([
      set({ name: "Row", reps: 10, effort: 4 }),
      set({ name: "Row", reps: 10, effort: 9 }),
      set({ name: "Row", reps: 10 }),
    ]);

    expect(grouped[0].effort).toBe(9);
  });

  it("leaves effort absent when none was given, rather than zero", () => {
    const grouped = exercisesFrom([set({ name: "Row", reps: 10 })]);
    expect(grouped[0].effort).toBeUndefined();
    expect(sessionLoad(grouped).effortLoad).toBeUndefined();
  });

  it("gives updatePersonalRecord the shape it needs from raw sets", () => {
    const [exercise] = exercisesFrom([
      set({ name: "Deadlift", reps: 3, weightKg: 80 }),
      set({ name: "Deadlift", reps: 5, weightKg: 70 }),
    ]);

    const { record, beaten } = updatePersonalRecord(
      undefined,
      exercise,
      "2026-09-11"
    );

    expect(record.bestWeightKg).toBe(80);
    expect(record.bestReps).toBe(5);
    // 5 x 70 beats 3 x 80 — the case weight alone and reps alone both miss.
    expect(record.bestSetVolumeKg).toBe(350);
    expect(beaten).toEqual(["weight", "reps", "volume"]);
  });
});
