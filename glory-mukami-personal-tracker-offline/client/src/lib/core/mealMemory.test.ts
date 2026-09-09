import { describe, expect, it } from "vitest";
import {
  emptyMealDayMessage,
  mealPatternNote,
  mealsForDay,
  repeatMeal,
  suggestMeals,
  type Meal,
} from "./mealMemory";

const TZ = "Africa/Nairobi";

let sequence = 0;
function meal(description: string, mealType: string, at: string): Meal {
  sequence += 1;
  return { id: `m${sequence}`, description, mealType, at };
}

describe("suggesting a repeated meal", () => {
  const meals = [
    meal("Rice and beans", "dinner", "2026-03-10T18:00:00.000Z"),
    meal("rice and beans", "dinner", "2026-03-11T18:00:00.000Z"),
    meal("Rice  and   beans", "dinner", "2026-03-12T18:00:00.000Z"),
    meal("Ugali and greens", "dinner", "2026-03-13T18:00:00.000Z"),
    meal("Tea and bread", "breakfast", "2026-03-13T05:00:00.000Z"),
    meal("Tea and bread", "breakfast", "2026-03-14T05:00:00.000Z"),
  ];

  it("counts the same meal however it was typed", () => {
    const [top] = suggestMeals({ meals, mealType: "dinner" });
    expect(top.description).toBe("Rice  and   beans");
    expect(top.count).toBe(3);
  });

  it("keeps suggestions inside their own meal slot", () => {
    const breakfast = suggestMeals({ meals, mealType: "breakfast" });
    // Breakfast must not offer last night's dinner.
    expect(breakfast.map(s => s.description)).toEqual(["Tea and bread"]);
  });

  it("offers nothing for a meal eaten only once", () => {
    const suggestions = suggestMeals({ meals, mealType: "dinner" });
    expect(suggestions.map(s => s.description)).not.toContain(
      "Ugali and greens"
    );
  });

  it("ranks by how often, then by how recently", () => {
    const recentTie = [
      meal("Old favourite", "lunch", "2026-01-01T12:00:00.000Z"),
      meal("Old favourite", "lunch", "2026-01-02T12:00:00.000Z"),
      meal("New favourite", "lunch", "2026-03-13T12:00:00.000Z"),
      meal("New favourite", "lunch", "2026-03-14T12:00:00.000Z"),
    ];
    const [first] = suggestMeals({ meals: recentTie, mealType: "lunch" });
    expect(first.description).toBe("New favourite");
  });

  it("returns nothing from an empty history", () => {
    expect(suggestMeals({ meals: [] })).toEqual([]);
  });

  it("ignores a blank description", () => {
    const blanks = [
      meal("   ", "lunch", "2026-03-13T12:00:00.000Z"),
      meal("", "lunch", "2026-03-14T12:00:00.000Z"),
    ];
    expect(suggestMeals({ meals: blanks })).toEqual([]);
  });
});

describe("repeating a meal", () => {
  it("creates a fresh record rather than pointing at the old one", () => {
    const [suggestion] = suggestMeals({
      meals: [
        meal("Rice and beans", "dinner", "2026-03-10T18:00:00.000Z"),
        meal("Rice and beans", "dinner", "2026-03-11T18:00:00.000Z"),
      ],
      mealType: "dinner",
    });

    const repeated = repeatMeal({
      suggestion,
      mealType: "dinner",
      at: new Date("2026-03-14T18:00:00.000Z"),
    });

    expect(repeated.description).toBe("Rice and beans");
    expect(repeated.at).toBe("2026-03-14T18:00:00.000Z");
    // Editing tonight's dinner must not rewrite last Tuesday's.
    expect(repeated.id).not.toBe(suggestion.description);
  });

  it("needs no calories to be a complete meal", () => {
    const repeated = repeatMeal({
      suggestion: { description: "Toast", count: 3, lastAt: "" },
      mealType: "breakfast",
    });
    expect(repeated.calories).toBeUndefined();
    expect(repeated.description).toBe("Toast");
  });
});

describe("a day's meals", () => {
  const meals = [
    meal("Dinner thing", "dinner", "2026-03-14T15:00:00.000Z"),
    meal("Breakfast thing", "breakfast", "2026-03-14T05:00:00.000Z"),
    meal("Elevenses", "brunch", "2026-03-14T08:00:00.000Z"),
  ];

  it("groups into slots in the order meals are eaten", () => {
    const day = mealsForDay({ meals, day: "2026-03-14", timezone: TZ });
    // Known slots in eating order, then any custom type the user invented.
    expect(day.byType.map(group => group.mealType)).toEqual([
      "breakfast",
      "dinner",
      "brunch",
    ]);
    expect(day.total).toBe(3);
  });

  it("uses the local day", () => {
    const late = [meal("Late snack", "snack", "2026-03-14T21:30:00.000Z")];
    // 21:30 UTC is 00:30 the next day in Nairobi.
    expect(
      mealsForDay({ meals: late, day: "2026-03-15", timezone: TZ }).total
    ).toBe(1);
    expect(
      mealsForDay({ meals: late, day: "2026-03-14", timezone: TZ }).total
    ).toBe(0);
  });

  it("has an empty state that does not imply failure", () => {
    const day = mealsForDay({ meals: [], day: "2026-03-14", timezone: TZ });
    expect(day.total).toBe(0);
    const message = emptyMealDayMessage();
    expect(message).toBe("No meals recorded for this day.");
    expect(message.toLowerCase()).not.toMatch(/missed|forgot|should|failed/);
  });
});

describe("the pattern note", () => {
  it("counts days covered without commenting on what was eaten", () => {
    const meals = [
      meal("A", "lunch", "2026-03-12T12:00:00.000Z"),
      meal("B", "lunch", "2026-03-14T12:00:00.000Z"),
    ];
    const note = mealPatternNote({
      meals,
      timezone: TZ,
      days: ["2026-03-12", "2026-03-13", "2026-03-14"],
    });

    expect(note).toBe("You logged a meal on 2 of the last 3 days.");
    expect(note?.toLowerCase()).not.toMatch(/healthy|calorie|too much|should/);
  });

  it("says nothing when there is nothing to describe", () => {
    expect(
      mealPatternNote({ meals: [], timezone: TZ, days: ["2026-03-14"] })
    ).toBeNull();
  });
});
