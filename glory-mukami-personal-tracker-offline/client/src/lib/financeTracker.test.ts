import { describe, expect, it } from "vitest";
import {
  cashFlowCsv,
  cashFlowSummary,
  cashOutByCategory,
  entriesForPeriod,
  formatMoney,
  periodWindowDescription,
  roundMoney,
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

  it("keeps money to two decimals so float noise never shows", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(formatMoney(1234.5, "kes")).toBe("KES 1,234.50");
    expect(formatMoney(7, "")).toBe("7.00");
    const summary = cashFlowSummary(0.1, [
      { ...entries[0], amount: 0.2, direction: "in" },
    ]);
    expect(summary.currentBalance).toBe(0.3);
  });

  it("describes what a period window covers", () => {
    expect(periodWindowDescription("weekly", new Date(2026, 7, 26))).toMatch(
      /Monday 24 Aug|Monday Aug 24/
    );
    expect(periodWindowDescription("monthly", new Date(2026, 7, 26))).toMatch(
      /August 2026/
    );
  });

  it("exports a CSV with quoted fields and two-decimal amounts", () => {
    const csv = cashFlowCsv(
      [{ ...entries[0], title: 'Pay, "August"', note: "line\nbreak" }],
      "KES"
    );
    const [header, row] = csv.split("\n");
    expect(header).toBe(
      "date,direction,title,amount,currency,category,recurring,note"
    );
    expect(row).toContain('"Pay, ""August"""');
    expect(row).toContain(",100.00,KES,");
  });
});
