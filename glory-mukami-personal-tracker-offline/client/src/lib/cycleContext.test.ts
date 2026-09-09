import { describe, expect, it } from "vitest";
import { addCycleContextTag, toggleCycleContextTag } from "./cycleContext";

describe("cycle context tags", () => {
  it("adds and removes an optional selected tag", () => {
    expect(toggleCycleContextTag([], "Tenderness")).toEqual(["Tenderness"]);
    expect(toggleCycleContextTag(["Tenderness"], "Tenderness")).toEqual([]);
  });

  it("adds a trimmed personal tag only once", () => {
    expect(addCycleContextTag(["Quiet day"], "  Study day  ")).toEqual([
      "Quiet day",
      "Study day",
    ]);
    expect(addCycleContextTag(["Quiet day"], "Quiet day")).toEqual([
      "Quiet day",
    ]);
  });
});
