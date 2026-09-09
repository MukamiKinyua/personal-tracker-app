import { describe, expect, it } from "vitest";
import {
  activeMemory,
  confirm,
  editValue,
  forget,
  memoryValue,
  pendingSuggestions,
  rememberFact,
  suggestFact,
  suggestFromRepetition,
  suggestionPrompt,
} from "./memory";

describe("what the user tells the app", () => {
  it("is remembered straight away", () => {
    const item = rememberFact({
      kind: "favourite",
      label: "Favourite workout",
      value: "Push day",
    });
    expect(item.origin).toBe("user");
    expect(item.confirmed).toBe(true);
    expect(activeMemory([item])).toHaveLength(1);
  });

  it("can be looked up by label", () => {
    const items = [
      rememberFact({
        kind: "current",
        label: "Current project",
        value: "Blender",
      }),
    ];
    expect(memoryValue(items, "Current project")).toBe("Blender");
    expect(memoryValue(items, "Nothing")).toBeUndefined();
  });

  it("can be forgotten", () => {
    const item = rememberFact({ kind: "fact", label: "X", value: "Y" });
    expect(forget([item], item.id)).toEqual([]);
  });
});

describe("what the app merely noticed", () => {
  const suggestion = suggestFact({
    kind: "favourite",
    label: "Favourite meal",
    value: "Rice and beans",
    because: "You have recorded this 6 times.",
  });

  it("is not treated as true until confirmed", () => {
    expect(suggestion.confirmed).toBe(false);
    // Nothing in the app may use it yet.
    expect(activeMemory([suggestion])).toEqual([]);
    expect(pendingSuggestions([suggestion])).toHaveLength(1);
    expect(memoryValue([suggestion], "Favourite meal")).toBeUndefined();
  });

  it("becomes usable once the user accepts it", () => {
    const accepted = confirm(suggestion);
    expect(activeMemory([accepted])).toHaveLength(1);
    expect(memoryValue([accepted], "Favourite meal")).toBe("Rice and beans");
  });

  it("becomes the user's own when they correct it", () => {
    const corrected = editValue(suggestion, "Rice, beans and chapati");
    expect(corrected.origin).toBe("user");
    expect(corrected.confirmed).toBe(true);
    // The app's reasoning no longer applies to a value the user wrote.
    expect(corrected.because).toBeUndefined();
  });

  it("explains itself, and asks rather than asserts", () => {
    const prompt = suggestionPrompt(suggestion);
    expect(prompt).toContain("?");
    expect(prompt).toContain("You have recorded this 6 times.");
  });
});

describe("noticing repetition", () => {
  it("says nothing until something has happened often enough", () => {
    expect(
      suggestFromRepetition({
        label: "Favourite meal",
        values: ["Rice and beans", "Ugali", "Rice and beans"],
      })
    ).toBeNull();
  });

  it("offers the most repeated value once past the threshold", () => {
    const suggestion = suggestFromRepetition({
      label: "Favourite meal",
      values: [
        "Rice and beans",
        "Ugali",
        "rice and beans",
        "Rice and beans",
        "Rice and beans",
      ],
    });
    expect(suggestion?.value).toBe("Rice and beans");
    expect(suggestion?.confirmed).toBe(false);
    expect(suggestion?.because).toContain("4 times");
  });

  it("counts values case-insensitively but keeps the user's own casing", () => {
    const suggestion = suggestFromRepetition({
      label: "Favourite workout",
      values: ["Push Day", "push day", "PUSH DAY", "Push Day"],
    });
    expect(suggestion?.value).toBe("Push Day");
  });

  it("ignores blank values", () => {
    expect(
      suggestFromRepetition({
        label: "X",
        values: ["  ", "", "   ", "  "],
      })
    ).toBeNull();
  });

  it("returns nothing for an empty history", () => {
    expect(suggestFromRepetition({ label: "X", values: [] })).toBeNull();
  });
});
