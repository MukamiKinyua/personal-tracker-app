/**
 * Meal memory.
 *
 * "If you frequently record the same meal, the app can suggest it." That is
 * the whole feature, and it earns its place by removing typing: someone who
 * eats rice and beans four nights a week should log it in one tap.
 *
 * The requirement is also explicit that nutrition must not become a giant
 * form. So nothing here needs calories, and a meal with only a description is
 * a complete meal, not a partial one.
 */

import { dayKeyOf, type DayKey } from "./datetime";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | string;

export type Meal = {
  id: string;
  mealType: MealType;
  /** What was eaten, in the user's own words. The only required field. */
  description: string;
  at: string;
  note?: string;
  /** Entirely optional. Absent is normal, not incomplete. */
  calories?: number;
  ingredients?: string[];
};

export const DEFAULT_MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

function normalise(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

export type MealSuggestion = {
  description: string;
  /** How many times it has been recorded. */
  count: number;
  /** The last time it was eaten, so a stale favourite can be ranked lower. */
  lastAt: string;
  mealType?: MealType;
};

/**
 * The meals worth offering as one-tap entries.
 *
 * Ranked by how often they recur and how recently, because a meal eaten twenty
 * times last year is a worse suggestion than one eaten four times this month.
 * Below the threshold nothing is offered — a single entry is not a habit, and
 * suggesting it would put words in the user's mouth.
 */
export function suggestMeals({
  meals,
  mealType,
  threshold = 2,
  limit = 5,
}: {
  meals: Meal[];
  /** Restrict to one slot, so breakfast does not suggest last night's dinner. */
  mealType?: MealType;
  threshold?: number;
  limit?: number;
}): MealSuggestion[] {
  const pool = mealType
    ? meals.filter(meal => meal.mealType === mealType)
    : meals;

  const grouped = new Map<string, MealSuggestion>();

  for (const meal of pool) {
    const key = normalise(meal.description);
    if (!key) continue;

    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      if (meal.at > existing.lastAt) {
        existing.lastAt = meal.at;
        // Keep the most recent casing the user typed.
        existing.description = meal.description.trim();
      }
    } else {
      grouped.set(key, {
        description: meal.description.trim(),
        count: 1,
        lastAt: meal.at,
        mealType: meal.mealType,
      });
    }
  }

  return Array.from(grouped.values())
    .filter(suggestion => suggestion.count >= threshold)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastAt.localeCompare(a.lastAt);
    })
    .slice(0, limit);
}

/**
 * Builds a new meal from a suggestion. A repeat is a fresh record with its own
 * time, never a reference to the old one — editing tonight's dinner must not
 * rewrite what was eaten last Tuesday.
 */
let counter = 0;

export function repeatMeal({
  suggestion,
  mealType,
  at = new Date(),
}: {
  suggestion: MealSuggestion;
  mealType: MealType;
  at?: Date;
}): Meal {
  counter += 1;
  return {
    id: `meal_${at.getTime().toString(36)}${counter.toString(36)}`,
    mealType,
    description: suggestion.description,
    at: at.toISOString(),
  };
}

export type MealDay = {
  day: DayKey;
  byType: Array<{ mealType: MealType; meals: Meal[] }>;
  total: number;
};

/** A day's meals grouped into their slots, in the order meals are eaten. */
export function mealsForDay({
  meals,
  day,
  timezone,
  order = DEFAULT_MEAL_TYPES,
}: {
  meals: Meal[];
  day: DayKey;
  timezone: string;
  order?: MealType[];
}): MealDay {
  const onDay = meals.filter(meal => dayKeyOf(meal.at, timezone) === day);

  const grouped = new Map<MealType, Meal[]>();
  for (const meal of onDay) {
    const bucket = grouped.get(meal.mealType);
    if (bucket) bucket.push(meal);
    else grouped.set(meal.mealType, [meal]);
  }

  // Known slots in eating order, then any custom types the user invented.
  const known = order.filter(type => grouped.has(type));
  const custom = Array.from(grouped.keys())
    .filter(type => !order.includes(type))
    .sort();

  return {
    day,
    byType: [...known, ...custom].map(mealType => ({
      mealType,
      meals: grouped.get(mealType)!.sort((a, b) => a.at.localeCompare(b.at)),
    })),
    total: onDay.length,
  };
}

/**
 * The empty state.
 *
 * Deliberately not framed as a failure. The requirements rule out shame-based
 * feedback around food, and an empty day is far more likely to mean "did not
 * log" than "did not eat".
 */
export function emptyMealDayMessage(): string {
  return "No meals recorded for this day.";
}

/**
 * A gentle observation about meal patterns.
 *
 * Counts what is there and stops. It never comments on what was eaten, on
 * quantities, or on what a meal implies — this is a log, not a dietician.
 */
export function mealPatternNote({
  meals,
  timezone,
  days,
}: {
  meals: Meal[];
  timezone: string;
  /** The days in the window being described. */
  days: DayKey[];
}): string | null {
  if (days.length === 0 || meals.length === 0) return null;

  const daysWith = new Set(meals.map(meal => dayKeyOf(meal.at, timezone)));
  const covered = days.filter(day => daysWith.has(day)).length;
  if (covered === 0) return null;

  return `You logged a meal on ${covered} of the last ${days.length} days.`;
}
