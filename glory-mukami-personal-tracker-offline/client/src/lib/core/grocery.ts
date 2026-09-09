/**
 * The grocery list, and the "to grocery" link from a meal.
 *
 * The requirement pairs these deliberately: an ingredient noticed while
 * logging a meal should reach the shopping list without the user navigating
 * anywhere. That one link is what stops the list from being a separate app
 * nobody remembers to open.
 */

export type GroceryCategory =
  | "produce"
  | "dairy"
  | "grains"
  | "protein"
  | "pantry"
  | "frozen"
  | "household"
  | "other";

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  "produce",
  "dairy",
  "grains",
  "protein",
  "pantry",
  "frozen",
  "household",
  "other",
];

/**
 * Aisle order, so the list reads in the order things are actually walked past
 * rather than alphabetically.
 */
export const CATEGORY_ORDER: Record<GroceryCategory, number> = {
  produce: 0,
  dairy: 1,
  protein: 2,
  grains: 3,
  pantry: 4,
  frozen: 5,
  household: 6,
  other: 7,
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity?: string;
  category: GroceryCategory;
  pickedUp: boolean;
  /** The meal this came from, when it was added by the "to grocery" link. */
  fromMealId?: string;
  addedAt: string;
};

let counter = 0;

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createItem({
  name,
  quantity,
  category = "other",
  fromMealId,
  at = new Date(),
}: {
  name: string;
  quantity?: string;
  category?: GroceryCategory;
  fromMealId?: string;
  at?: Date;
}): GroceryItem {
  counter += 1;
  return {
    id: `g${at.getTime().toString(36)}${counter.toString(36)}`,
    name: name.trim(),
    quantity: quantity?.trim() || undefined,
    category,
    pickedUp: false,
    fromMealId,
    addedAt: at.toISOString(),
  };
}

/**
 * Adds an item, merging it into an existing outstanding one of the same name.
 *
 * Two "milk" lines is a worse list than one. An already-picked-up item is not
 * merged into, though — that would silently un-tick something the user has
 * already put in the basket.
 */
export function addItem(
  items: GroceryItem[],
  item: GroceryItem
): { items: GroceryItem[]; merged: boolean } {
  const key = normalise(item.name);
  const index = items.findIndex(
    existing => normalise(existing.name) === key && !existing.pickedUp
  );

  if (index === -1) return { items: [...items, item], merged: false };

  const existing = items[index];
  const next = [...items];
  next[index] = {
    ...existing,
    quantity: mergeQuantity(existing.quantity, item.quantity),
  };
  return { items: next, merged: true };
}

function mergeQuantity(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  if (normalise(a) === normalise(b)) return a;
  // Kept as text rather than parsed: "2 bunches" and "500g" cannot be added,
  // and guessing would be worse than showing both.
  return `${a} + ${b}`;
}

export function togglePickedUp(
  items: GroceryItem[],
  id: string
): GroceryItem[] {
  return items.map(item =>
    item.id === id ? { ...item, pickedUp: !item.pickedUp } : item
  );
}

export function removeItem(items: GroceryItem[], id: string): GroceryItem[] {
  return items.filter(item => item.id !== id);
}

/** Clears what has been bought, leaving the rest of the list intact. */
export function clearPickedUp(items: GroceryItem[]): GroceryItem[] {
  return items.filter(item => !item.pickedUp);
}

export type GroceryGroup = {
  category: GroceryCategory;
  items: GroceryItem[];
};

/**
 * The list grouped by aisle, outstanding items first inside each group.
 * Picked-up items stay visible rather than vanishing, so the user can see what
 * they have already got without re-deriving it from memory.
 */
export function groupedList(items: GroceryItem[]): GroceryGroup[] {
  const grouped = new Map<GroceryCategory, GroceryItem[]>();

  for (const item of items) {
    const bucket = grouped.get(item.category);
    if (bucket) bucket.push(item);
    else grouped.set(item.category, [item]);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b])
    .map(([category, groupItems]) => ({
      category,
      items: groupItems.sort((a, b) => {
        if (a.pickedUp !== b.pickedUp) return a.pickedUp ? 1 : -1;
        return a.name.localeCompare(b.name);
      }),
    }));
}

export type GrocerySummary = {
  total: number;
  outstanding: number;
  pickedUp: number;
  /** Optional running cost for the trip. */
  spend?: number;
};

export function grocerySummary(
  items: GroceryItem[],
  spend?: number
): GrocerySummary {
  const pickedUp = items.filter(item => item.pickedUp).length;
  return {
    total: items.length,
    outstanding: items.length - pickedUp,
    pickedUp,
    spend,
  };
}

/**
 * Turns a meal's ingredients into list items.
 *
 * This is the "to grocery" action. Anything already outstanding on the list is
 * skipped rather than duplicated, and the meal id is kept so the user can see
 * why an item is there.
 */
export function fromMeal({
  items,
  mealId,
  ingredients,
  category = "other",
  at = new Date(),
}: {
  items: GroceryItem[];
  mealId: string;
  ingredients: string[];
  category?: GroceryCategory;
  at?: Date;
}): { items: GroceryItem[]; added: number; skipped: number } {
  let next = items;
  let added = 0;
  let skipped = 0;

  for (const ingredient of ingredients) {
    const name = ingredient.trim();
    if (!name) continue;

    const alreadyThere = next.some(
      item => normalise(item.name) === normalise(name) && !item.pickedUp
    );
    if (alreadyThere) {
      skipped += 1;
      continue;
    }

    next = addItem(
      next,
      createItem({ name, category, fromMealId: mealId, at })
    ).items;
    added += 1;
  }

  return { items: next, added, skipped };
}

/** What to say after a "to grocery" tap, so the action is confirmed. */
export function fromMealMessage(result: {
  added: number;
  skipped: number;
}): string {
  if (result.added === 0 && result.skipped === 0) {
    return "Nothing to add.";
  }
  if (result.added === 0) {
    return "Already on your list.";
  }
  const added = `${result.added} item${result.added === 1 ? "" : "s"} added`;
  return result.skipped > 0
    ? `${added}, ${result.skipped} already on your list.`
    : `${added}.`;
}

export function emptyListMessage(): string {
  return "Your grocery list is empty.";
}
