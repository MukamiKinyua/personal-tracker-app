import { describe, expect, it } from "vitest";
import {
  applyRestore,
  backupFilename,
  parseBackup,
  planRestore,
  restoreWarning,
} from "./backup";
import { buildExport, EXPORT_FORMAT_VERSION } from "./exportData";
import { createRecord, type TrackerRecord } from "./record";

type Any = TrackerRecord<Record<string, unknown>>;

const owner = { id: "u1", timezone: "UTC", locale: "en-GB" };

function rec(scope: string, body: Record<string, unknown>): Any {
  return createRecord({ scope, ownerId: "u1", body }) as Any;
}

function backupOf(records: Any[]): string {
  return JSON.stringify(buildExport(records, [], owner));
}

describe("reading a backup file", () => {
  it("round-trips an export", () => {
    const records = [
      rec("water", { amountMl: 250 }),
      rec("task", { title: "x" }),
    ];
    const parsed = parseBackup(backupOf(records));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.bundle.records).toHaveLength(2);
      expect(parsed.bundle.formatVersion).toBe(EXPORT_FORMAT_VERSION);
      expect(parsed.problems).toEqual([]);
    }
  });

  it("refuses something that is not JSON", () => {
    const parsed = parseBackup("not a backup");
    expect(parsed.ok).toBe(false);
    expect(parsed.problems[0].message).toContain("not valid JSON");
  });

  it("refuses a file with no format version", () => {
    const parsed = parseBackup(JSON.stringify({ records: [] }));
    expect(parsed.ok).toBe(false);
    expect(parsed.problems[0].message).toContain("no format version");
  });

  it("warns about a version it does not know, without refusing it", () => {
    const parsed = parseBackup(
      JSON.stringify({ formatVersion: "9.0", records: [] })
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.problems[0].severity).toBe("warning");
    expect(parsed.problems[0].message).toContain("9.0");
  });

  it("drops unreadable entries rather than losing the whole journal", () => {
    const good = rec("water", { amountMl: 250 });
    const parsed = parseBackup(
      JSON.stringify({
        formatVersion: EXPORT_FORMAT_VERSION,
        records: [good, { nonsense: true }, null, "text"],
      })
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.bundle.records).toHaveLength(1);
      expect(parsed.problems.some(p => p.message.includes("3 entries"))).toBe(
        true
      );
    }
  });

  it("survives a file with no records list", () => {
    const parsed = parseBackup(
      JSON.stringify({ formatVersion: EXPORT_FORMAT_VERSION })
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.bundle.records).toEqual([]);
  });
});

describe("planning a restore", () => {
  const existing = [
    rec("water", { amountMl: 250 }),
    rec("task", { title: "keep" }),
  ];
  const incoming = [rec("sleep", { minutes: 430 })];

  function bundleOf(records: Any[]) {
    const parsed = parseBackup(backupOf(records));
    if (!parsed.ok) throw new Error("fixture failed to parse");
    return parsed.bundle;
  }

  it("adds what is new and keeps what is here, when merging", () => {
    const plan = planRestore({
      bundle: bundleOf(incoming),
      existing,
      mode: "merge",
    });

    expect(plan.toAdd).toHaveLength(1);
    expect(plan.toRemove).toEqual([]);
    expect(plan.destructive).toBe(false);
    expect(restoreWarning(plan)).toContain("Nothing currently in your journal");
  });

  it("warns that replacing deletes what the backup lacks", () => {
    const plan = planRestore({
      bundle: bundleOf(incoming),
      existing,
      mode: "replace",
    });

    expect(plan.toRemove).toHaveLength(2);
    expect(plan.destructive).toBe(true);
    expect(plan.summary.join(" ")).toContain("permanently deleted");
    expect(restoreWarning(plan)).toContain("cannot be undone");
  });

  it("counts a record held under the same id as a conflict, not an addition", () => {
    const plan = planRestore({
      bundle: bundleOf(existing),
      existing,
      mode: "merge",
    });
    expect(plan.toAdd).toEqual([]);
    expect(plan.conflicts).toHaveLength(2);
    expect(plan.summary.join(" ")).toContain("kept as they are");
  });

  it("says plainly when a backup adds nothing", () => {
    const plan = planRestore({
      bundle: bundleOf([]),
      existing: [],
      mode: "merge",
    });
    expect(plan.summary).toEqual(["This backup contains nothing new."]);
  });
});

describe("applying a restore", () => {
  const kept = rec("task", { title: "written since the backup" });
  const fromBackup = rec("sleep", { minutes: 430 });

  function planFor(mode: "merge" | "replace", existing: Any[], records: Any[]) {
    const parsed = parseBackup(backupOf(records));
    if (!parsed.ok) throw new Error("fixture failed to parse");
    return planRestore({ bundle: parsed.bundle, existing, mode });
  }

  it("merging never removes work done since the backup was taken", () => {
    const plan = planFor("merge", [kept], [fromBackup]);
    const result = applyRestore({ plan, existing: [kept] });

    expect(result.map(r => r.id).sort()).toEqual(
      [kept.id, fromBackup.id].sort()
    );
  });

  it("replacing drops what the backup does not contain", () => {
    const plan = planFor("replace", [kept], [fromBackup]);
    const result = applyRestore({ plan, existing: [kept] });

    expect(result.map(r => r.id)).toEqual([fromBackup.id]);
  });

  it("replacing overwrites a record held under the same id", () => {
    const edited = { ...kept, body: { title: "backup version" } };
    const plan = planFor("replace", [kept], [edited as Any]);
    const result = applyRestore({ plan, existing: [kept] });

    expect(result).toHaveLength(1);
    expect(result[0].body.title).toBe("backup version");
  });

  it("merging keeps the local version of a clashing record", () => {
    const edited = { ...kept, body: { title: "backup version" } };
    const plan = planFor("merge", [kept], [edited as Any]);
    const result = applyRestore({ plan, existing: [kept] });

    expect(result).toHaveLength(1);
    expect(result[0].body.title).toBe("written since the backup");
  });
});

describe("the backup file name", () => {
  it("is dated so several backups do not overwrite each other", () => {
    expect(backupFilename(new Date("2026-03-14T09:00:00.000Z"))).toBe(
      "personal-tracker-backup-2026-03-14.json"
    );
  });
});
