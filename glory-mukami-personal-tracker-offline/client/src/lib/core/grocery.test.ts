import { describe, expect, it } from "vitest";
import {
  addItem,
  clearPickedUp,
  createItem,
  emptyListMessage,
  fromMeal,
  fromMealMessage,
  groupedList,
  grocerySummary,
  removeItem,
  togglePickedUp,
  type GroceryItem,
} from "./grocery";

function listOf(names: Array<[string, string?]>): GroceryItem[] {
  let items: GroceryItem[] = [];
  for (const [name, quantity] of names) {
    items = addItem(items, createItem({ name, quantity })).items;
  }
  return items;
}

describe("adding items", () => {
  it("merges a repeat into the outstanding line rather than listing it twice", () => {
    const items = listOf([["Milk"], ["milk"]]);
    expect(items).toHaveLength(1);
  });

  it("keeps both quantities when they cannot be added together", () => {
    let items = listOf([["Tomatoes", "2 bunches"]]);
    items = addItem(
      items,
      createItem({ name: "tomatoes", quantity: "500g" })
    ).items;
    // Guessing a total would be worse than showing what was asked for.
    expect(items[0].quantity).toBe("2 bunches + 500g");
  });

  it("does not merge into something already in the basket", () => {
    let items = listOf([["Milk"]]);
    items = togglePickedUp(items, items[0].id);
    items = addItem(items, createItem({ name: "Milk" })).items;

    // Merging would silently un-tick what the user already picked up.
    expect(items).toHaveLength(2);
    expect(items.filter(item => item.pickedUp)).toHaveLength(1);
  });

  it("reports whether it merged", () => {
    const first = addItem([], createItem({ name: "Rice" }));
    expect(first.merged).toBe(false);
    expect(addItem(first.items, createItem({ name: "rice" })).merged).toBe(
      true
    );
  });
});

describe("working the list", () => {
  it("ticks and unticks an item", () => {
    let items = listOf([["Milk"]]);
    items = togglePickedUp(items, items[0].id);
    expect(items[0].pickedUp).toBe(true);
    items = togglePickedUp(items, items[0].id);
    expect(items[0].pickedUp).toBe(false);
  });

  it("clears what was bought and keeps the rest", () => {
    let items = listOf([["Milk"], ["Bread"]]);
    items = togglePickedUp(items, items[0].id);
    expect(clearPickedUp(items).map(item => item.name)).toEqual(["Bread"]);
  });

  it("removes one item", () => {
    const items = listOf([["Milk"]]);
    expect(removeItem(items, items[0].id)).toEqual([]);
  });

  it("counts what is left to get", () => {
    let items = listOf([["Milk"], ["Bread"], ["Rice"]]);
    items = togglePickedUp(items, items[0].id);
    expect(grocerySummary(items)).toMatchObject({
      total: 3,
      pickedUp: 1,
      outstanding: 2,
    });
  });

  it("can carry a spend for the trip", () => {
    expect(grocerySummary([], 1250).spend).toBe(1250);
  });
});

describe("the grouped view", () => {
  it("orders groups by aisle, not alphabetically", () => {
    let items: GroceryItem[] = [];
    items = addItem(
      items,
      createItem({ name: "Bleach", category: "household" })
    ).items;
    items = addItem(
      items,
      createItem({ name: "Apples", category: "produce" })
    ).items;
    items = addItem(
      items,
      createItem({ name: "Cheese", category: "dairy" })
    ).items;

    expect(groupedList(items).map(group => group.category)).toEqual([
      "produce",
      "dairy",
      "household",
    ]);
  });

  it("keeps picked-up items visible but below the outstanding ones", () => {
    let items: GroceryItem[] = [];
    items = addItem(
      items,
      createItem({ name: "Apples", category: "produce" })
    ).items;
    items = addItem(
      items,
      createItem({ name: "Bananas", category: "produce" })
    ).items;
    items = togglePickedUp(items, items[0].id);

    const [produce] = groupedList(items);
    expect(produce.items.map(item => item.name)).toEqual(["Bananas", "Apples"]);
  });

  it("has an empty state", () => {
    expect(groupedList([])).toEqual([]);
    expect(emptyListMessage()).toBe("Your grocery list is empty.");
  });
});

describe("sending a meal's ingredients to the list", () => {
  it("adds each ingredient and remembers where it came from", () => {
    const result = fromMeal({
      items: [],
      mealId: "meal-1",
      ingredients: ["Rice", "Beans", "Onions"],
      category: "produce",
    });

    expect(result.added).toBe(3);
    expect(result.items.every(item => item.fromMealId === "meal-1")).toBe(true);
  });

  it("skips anything already outstanding rather than duplicating it", () => {
    const existing = listOf([["Rice"]]);
    const result = fromMeal({
      items: existing,
      mealId: "meal-1",
      ingredients: ["Rice", "Beans"],
    });

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.items).toHaveLength(2);
  });

  it("ignores blank ingredients", () => {
    const result = fromMeal({
      items: [],
      mealId: "m",
      ingredients: ["  ", "", "Rice"],
    });
    expect(result.added).toBe(1);
  });

  it("confirms what happened", () => {
    expect(fromMealMessage({ added: 3, skipped: 0 })).toBe("3 items added.");
    expect(fromMealMessage({ added: 1, skipped: 2 })).toBe(
      "1 item added, 2 already on your list."
    );
    expect(fromMealMessage({ added: 0, skipped: 2 })).toBe(
      "Already on your list."
    );
    expect(fromMealMessage({ added: 0, skipped: 0 })).toBe("Nothing to add.");
  });
});
