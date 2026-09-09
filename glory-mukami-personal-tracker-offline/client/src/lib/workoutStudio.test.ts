import { describe, expect, it } from "vitest";
import {
  workoutCompletedCount,
  workoutRoutineById,
  workoutRoutines,
} from "./workoutStudio";

describe("workout Studio library", () => {
  it("keeps all confirmed workout groups in the original instructional library", () => {
    expect(workoutRoutines.map(routine => routine.id)).toEqual([
      "core",
      "glutes",
      "back",
      "arms",
      "yoga",
    ]);
    expect(workoutRoutineById("core").exercises).toHaveLength(11);
    expect(workoutRoutineById("glutes").exercises).toHaveLength(12);
    expect(workoutRoutineById("back").exercises).toHaveLength(8);
    expect(workoutRoutineById("arms").exercises).toHaveLength(15);
    expect(workoutRoutineById("yoga").exercises).toHaveLength(13);
  });

  it("counts only marked exercises in the selected routine", () => {
    const routine = workoutRoutineById("core");
    expect(
      workoutCompletedCount(
        { "basic-crunches": true, "toe-taps": true, "frog-pumps": true },
        routine
      )
    ).toBe(2);
  });
});
