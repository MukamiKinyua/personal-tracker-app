import { describe, expect, it } from "vitest";
import {
  cashFlowSummary,
  cashOutByCategory,
  entriesForPeriod,
  runningBalanceSeries,
  type CashFlowEntry,
} from "./financeTracker";

const entries: CashFlowEntry[] = [
  {
    id: "1",
    title: "Pay",
    amount: 100,
    direction: "in",
    category: "Income",
    date: "2026-08-26",
    note: "",
    recurring: false,
  },
  {
    id: "2",
    title: "Bus",
    amount: 10,
    direction: "out",
    category: "Transport",
    date: "2026-08-26",
    note: "",
    recurring: false,
  },
  {
    id: "3",
    title: "Lunch",
    amount: 15,
    direction: "out",
    category: "Food",
    date: "2026-08-25",
    note: "",
    recurring: false,
  },
];

describe("finance cash-flow helpers", () => {
  it("calculates a factual balance from opening, money in, and money out", () => {
    expect(cashFlowSummary(20, entries)).toEqual({
      openingAmount: 20,
      moneyIn: 100,
      moneyOut: 25,
      currentBalance: 95,
    });
  });

  it("filters the current period, groups money out, and creates a running balance", () => {
    expect(
      entriesForPeriod(entries, "daily", new Date(2026, 7, 26)).map(
        entry => entry.id
      )
    ).toEqual(["1", "2"]);
    expect(cashOutByCategory(entries)).toEqual([
      { category: "Food", amount: 15 },
      { category: "Transport", amount: 10 },
    ]);
    expect(
      runningBalanceSeries(20, entries).map(point => point.balance)
    ).toEqual([5, 105, 95]);
  });
});
