import { describe, expect, it } from "vitest";
import { pageTurnDestinationClass, pageTurnDuration } from "./journalMotion";

describe("pageTurnDuration", () => {
  it("uses the physical journal-turn duration under normal motion settings", () => {
    expect(pageTurnDuration(false)).toBe(640);
  });

  it("removes the delay when reduced motion is preferred", () => {
    expect(pageTurnDuration(true)).toBe(0);
  });
});

describe("pageTurnDestinationClass", () => {
  it("maps a reverse return to the real cover surface class", () => {
    expect(pageTurnDestinationClass("cover")).toBe("to-cover");
  });
});
