import { describe, expect, it } from "vitest";
import {
  describeDurability,
  openStore,
  usageShare,
  type StorageStatus,
} from "./storage";

function status(over: Partial<StorageStatus> = {}): StorageStatus {
  return { kind: "indexeddb", persistent: false, ...over };
}

describe("degrading rather than failing", () => {
  it("still returns a working store where no browser storage exists", async () => {
    // The test environment has neither IndexedDB nor localStorage.
    const store = await openStore();
    expect(store.kind).toBe("memory");

    await store.set("a", { value: 1 });
    expect(await store.get("a")).toEqual({ value: 1 });
    expect(await store.keys()).toEqual(["a"]);

    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
  });

  it("clears everything on request", async () => {
    const store = await openStore();
    await store.set("a", 1);
    await store.set("b", 2);
    await store.clear();
    expect(await store.keys()).toEqual([]);
  });
});

describe("telling the user how safe their journal is", () => {
  it("says plainly that device storage dies with the device", () => {
    const result = describeDurability(status({ persistent: true }), false);
    expect(result.level).toBe("device-only");
    // The promise the interface must not make.
    expect(result.message).toContain("lost if you lose the device");
  });

  it("warns when the browser may clear the data on its own", () => {
    const result = describeDurability(status({ persistent: false }), false);
    expect(result.message).toContain("may clear it to free space");
  });

  it("treats limited storage as a real risk, not a detail", () => {
    const result = describeDurability(status({ kind: "localstorage" }), false);
    expect(result.level).toBe("at-risk");
    expect(result.message).toContain("Export a backup");
  });

  it("is blunt when nothing will be kept at all", () => {
    const result = describeDurability(status({ kind: "memory" }), false);
    expect(result.level).toBe("at-risk");
    expect(result.message).toContain("nothing will be kept");
  });

  it("only claims the journal survives a lost device once it is synced", () => {
    const local = describeDurability(status({ persistent: true }), false);
    const synced = describeDurability(status({ persistent: true }), true);

    expect(local.level).not.toBe("backed-up");
    expect(synced.level).toBe("backed-up");
    expect(synced.message).toContain("survives losing this device");
  });
});

describe("quota", () => {
  it("reports the share used when the browser gives both figures", () => {
    expect(
      usageShare(status({ usageBytes: 25_000_000, quotaBytes: 100_000_000 }))
    ).toBe(25);
  });

  it("reports nothing rather than guessing", () => {
    expect(usageShare(status())).toBeNull();
    expect(usageShare(status({ usageBytes: 100 }))).toBeNull();
  });
});
