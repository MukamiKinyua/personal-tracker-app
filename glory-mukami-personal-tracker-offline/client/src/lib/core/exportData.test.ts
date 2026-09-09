import { describe, expect, it } from "vitest";
import { createLink } from "./links";
import { createRecord, deleteRecord, type TrackerRecord } from "./record";
import {
  buildExport,
  dictionaryToCSV,
  ENVELOPE_DICTIONARY,
  EXPORT_FORMAT_VERSION,
  SCOPE_DICTIONARY,
  toCSV,
} from "./exportData";

type Any = TrackerRecord<Record<string, unknown>>;

function record(scope: string, body: Record<string, unknown>): Any {
  return createRecord({
    scope,
    ownerId: "u1",
    body,
    now: new Date("2026-03-14T09:00:00.000Z"),
    period: { start: "2026-03-14T09:00:00.000Z" },
  }) as Any;
}

const owner = { id: "u1", timezone: "Africa/Nairobi", locale: "en-GB" };

describe("the export bundle", () => {
  it("carries a readme and a dictionary before any data", () => {
    const bundle = buildExport([record("water", { amount: 250 })], [], owner);
    expect(bundle.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(bundle.readme).toContain("every record held for your account");
    expect(bundle.dictionary.envelope).toEqual(ENVELOPE_DICTIONARY);
    expect(bundle.dictionary.byScope.water).toEqual(SCOPE_DICTIONARY.water);
  });

  it("explains the units a bare number would not convey", () => {
    const water = SCOPE_DICTIONARY.water.find(
      field => field.field === "amount"
    );
    expect(water?.unit).toBe("ml");
    const money = SCOPE_DICTIONARY.finances.find(
      f => f.field === "amountMinor"
    );
    expect(money?.description).toContain("minor unit");
  });

  it("includes deleted records so a deletion is visible rather than a gap", () => {
    const kept = record("water", { amount: 250 });
    const removed = deleteRecord(record("water", { amount: 100 }));
    const bundle = buildExport([kept, removed], [], owner);

    expect(bundle.records).toHaveLength(2);
    expect(bundle.records.some(entry => entry.deletedAt)).toBe(true);
    expect(bundle.readme).toContain("Deleted records are included");
  });

  it("counts records per page and carries the links", () => {
    const bundle = buildExport(
      [
        record("water", { amount: 250 }),
        record("water", { amount: 300 }),
        record("task", { title: "x" }),
      ],
      [createLink("task", "t1", "goal", "g1")],
      owner
    );
    expect(bundle.counts).toEqual({ water: 2, task: 1 });
    expect(bundle.links).toHaveLength(1);
  });
});

describe("page-level CSV", () => {
  it("writes a header and one row per record", () => {
    const csv = toCSV(
      [record("water", { amount: 250, container: "bottle" })],
      "UTC"
    );
    const [header, row] = csv.split("\r\n");
    expect(header.startsWith("id,date,start,end,source")).toBe(true);
    expect(header).toContain("amount");
    expect(row).toContain("2026-03-14");
    expect(row).toContain("250");
  });

  it("quotes values containing commas, quotes, and newlines", () => {
    const csv = toCSV(
      [
        record("reflection", {
          notes: 'A hard, long week — she said "enough"',
        }),
      ],
      "UTC"
    );
    expect(csv).toContain('"A hard, long week — she said ""enough"""');
  });

  it("neutralises a value a spreadsheet would run as a formula", () => {
    const csv = toCSV(
      [record("reflection", { notes: "=cmd|' /c calc'!A1" })],
      "UTC"
    );
    expect(csv).toContain("'=cmd");
  });

  it("leaves a missing field empty rather than writing undefined", () => {
    const csv = toCSV(
      [record("water", { amount: 250 }), record("water", { container: "mug" })],
      "UTC",
      ["amount", "container"]
    );
    expect(csv).not.toContain("undefined");
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3);
  });

  it("dates each row by the owner's local day, not by UTC", () => {
    // 00:30 on the 15th in Nairobi is still 21:30 on the 14th in UTC.
    const late = createRecord({
      scope: "water",
      ownerId: "u1",
      body: { amount: 250 },
      period: { start: "2026-03-14T21:30:00.000Z" },
    }) as Any;

    // The date column sits between the id and the ISO start instant.
    expect(toCSV([late], "Africa/Nairobi")).toContain(",2026-03-15,");
    expect(toCSV([late], "UTC")).toContain(",2026-03-14,");
  });

  it("describes the columns in a companion dictionary", () => {
    const csv = dictionaryToCSV("water");
    expect(csv.split("\r\n")[0]).toBe(
      "field,type,unit,allowed values,description"
    );
    expect(csv).toContain("amount");
    expect(csv).toContain("ml");
    expect(csv).toContain("revision");
  });
});
