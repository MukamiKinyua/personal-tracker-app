import { describe, expect, it } from "vitest";
import {
  filterHistoryEntries,
  historyModuleTotals,
  readPersistedHistoryRecords,
} from "./historyTracker";

const entries = [
  { module: "Tasks", label: "Inbox cleared", createdAt: "2026-08-26 09:00" },
  {
    module: "Tasks",
    label: "Focus task created",
    createdAt: "2026-08-25 10:00",
  },
  { module: "Sleep", label: "Sleep log saved", createdAt: "2026-08-26 07:00" },
];

describe("history tracker", () => {
  it("filters by module and case-insensitive query", () => {
    expect(filterHistoryEntries(entries, "cleared", "Tasks")).toEqual([
      entries[0],
    ]);
    expect(filterHistoryEntries(entries, "SLEEP", "All")).toEqual([entries[2]]);
  });

  it("returns all entries for an empty all-module filter", () => {
    expect(filterHistoryEntries(entries, "", "All")).toEqual(entries);
  });

  it("sorts module totals by count and then module name", () => {
    expect(historyModuleTotals(entries)).toEqual([
      ["Tasks", 2],
      ["Sleep", 1],
    ]);
  });

  it("reads owner-scoped saved records and portrait progress", () => {
    const values = new Map<string, string>([
      [
        "glory-personal-tracker:assignments:owner-1",
        JSON.stringify({
          assignments: [
            {
              id: "assignment-1",
              title: "Plan a study block",
              subject: "Databases",
              completed: false,
              due: "2026-08-28T10:00",
            },
          ],
        }),
      ],
      [
        "glory-personal-tracker:journal-shell:owner-1",
        JSON.stringify({ pixelRecords: { fitness: { "0-1": "#fff" } } }),
      ],
      [
        "glory-personal-tracker:assignments:owner-2",
        JSON.stringify({
          assignments: [{ id: "other", title: "Other owner" }],
        }),
      ],
    ]);
    const records = readPersistedHistoryRecords(
      { getItem: key => values.get(key) || null },
      "owner-1"
    );
    expect(records.some(record => record.label === "Plan a study block")).toBe(
      true
    );
    expect(
      records.some(
        record =>
          record.module === "Portrait progress" &&
          record.detail.includes("1 marked day")
      )
    ).toBe(true);
    expect(records.some(record => record.label === "Other owner")).toBe(false);
  });
});
