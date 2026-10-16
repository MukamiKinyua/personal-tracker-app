import { describe, expect, it } from "vitest";
import {
  backupStatus,
  relativeTime,
  STALE_AFTER_MS,
  type BackupInput,
} from "./backupStatus";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const input = (overrides: Partial<BackupInput> = {}): BackupInput => ({
  signedIn: true,
  online: true,
  pendingWrites: 0,
  lastSyncedAt: ago(2 * 60_000),
  conflicts: 0,
  serverReady: true,
  filesWaiting: 0,
  now: NOW,
  ...overrides,
});

describe("relativeTime", () => {
  it("reads naturally", () => {
    expect(relativeTime(undefined, NOW)).toBe("never");
    expect(relativeTime("garbage", NOW)).toBe("never");
    expect(relativeTime(ago(10_000), NOW)).toBe("just now");
    expect(relativeTime(ago(60_000), NOW)).toBe("1 minute ago");
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe("5 minutes ago");
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3 hours ago");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2 days ago");
  });
});

describe("backupStatus", () => {
  it("says plainly that nothing is backed up when signed out", () => {
    const status = backupStatus(input({ signedIn: false }));
    expect(status.level).toBe("off");
    expect(status.headline).toBe("Not backed up");
  });

  it("is green only when signed in, reachable, nothing waiting and recent", () => {
    const status = backupStatus(input());
    expect(status.level).toBe("ok");
    expect(status.lastBackedUp).toBe("2 minutes ago");
  });

  it("warns that backup is not working when the server database is unreachable, even if the engine says synced", () => {
    const status = backupStatus(input({ serverReady: false }));
    expect(status.level).toBe("warn");
    expect(status.headline).toMatch(/not working/);
  });

  it("treats an unknown server state as not-yet-a-problem", () => {
    expect(backupStatus(input({ serverReady: undefined })).level).toBe("ok");
  });

  it("surfaces a failed attempt with its reason", () => {
    const status = backupStatus(input({ lastError: "Network request failed" }));
    expect(status.level).toBe("warn");
    expect(status.detail).toContain("Network request failed");
  });

  it("does not call an offline failure a server problem", () => {
    const status = backupStatus(
      input({ online: false, lastError: "Failed to fetch", pendingWrites: 3 })
    );
    expect(status.level).toBe("waiting");
    expect(status.headline).toBe("Offline");
    expect(status.detail).toContain("3 changes");
  });

  it("shows work in progress, counting files too", () => {
    const status = backupStatus(input({ pendingWrites: 1, filesWaiting: 2 }));
    expect(status.level).toBe("waiting");
    expect(status.detail).toContain("3 changes");
  });

  it("warns about a file that could not be backed up", () => {
    const status = backupStatus(
      input({ fileProblem: "Your account's file storage is full." })
    );
    expect(status.level).toBe("warn");
    expect(status.detail).toContain("storage is full");
  });

  it("asks for a decision on conflicts", () => {
    const status = backupStatus(input({ conflicts: 2 }));
    expect(status.level).toBe("warn");
    expect(status.headline).toMatch(/2 changes need your decision/);
  });

  it("is waiting, not ok, before the first backup", () => {
    const status = backupStatus(input({ lastSyncedAt: undefined }));
    expect(status.level).toBe("waiting");
    expect(status.lastBackedUp).toBe("never");
  });

  it("flags a backup that has not happened for over a day", () => {
    const status = backupStatus(input({ lastSyncedAt: ago(STALE_AFTER_MS + 60_000) }));
    expect(status.level).toBe("warn");
    expect(status.headline).toMatch(/out of date/);
  });
});
