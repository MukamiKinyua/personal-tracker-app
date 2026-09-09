import { describe, expect, it } from "vitest";
import { eligibleRecommendationSourceKeys } from "./recommendationTracker";

describe("recommendationTracker", () => {
  it("uses only sources selected by the user and not reduced for this local session", () => {
    expect(
      eligibleRecommendationSourceKeys(
        ["productivity", "habits", "learning"],
        { productivity: true, habits: true, learning: false },
        { habits: true }
      )
    ).toEqual(["productivity"]);
  });
});
