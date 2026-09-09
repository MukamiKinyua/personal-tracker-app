import { describe, expect, it } from "vitest";
import {
  createIdentity,
  describeRevoke,
  detectKind,
  devicesSummary,
  lastSeenLabel,
  renameDevice,
  shouldSync,
  sortDevices,
  SYNC_DELAYS,
  type DeviceRecord,
} from "./devices";

function device(
  over: Partial<DeviceRecord> & { deviceId: string }
): DeviceRecord {
  return {
    label: over.deviceId,
    kind: "phone",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-03-14T12:00:00.000Z",
    cursor: 0,
    active: true,
    ...over,
  };
}

describe("recognising the device", () => {
  it("tells a phone from a tablet on Android", () => {
    expect(detectKind("Mozilla/5.0 (Linux; Android 14; Pixel 8 Mobile)")).toBe(
      "phone"
    );
    // Android without "mobile" is conventionally a tablet.
    expect(detectKind("Mozilla/5.0 (Linux; Android 14; SM-X200)")).toBe(
      "tablet"
    );
  });

  it("recognises an iPad and an iPhone", () => {
    expect(detectKind("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(detectKind("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      "phone"
    );
  });

  it("recognises the desktops", () => {
    expect(detectKind("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)")).toBe(
      "laptop"
    );
    expect(detectKind("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
  });

  it("falls back rather than guessing wrongly", () => {
    expect(detectKind("something else entirely")).toBe("unknown");
  });

  it("names a new device something a person would recognise", () => {
    const identity = createIdentity({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Mobile)",
    });
    // Not "SM-A536B".
    expect(identity.label).toBe("Phone");
    expect(identity.deviceId).toBeTruthy();
  });

  it("gives each install its own id", () => {
    expect(createIdentity().deviceId).not.toBe(createIdentity().deviceId);
  });

  it("can be renamed, but not to nothing", () => {
    const identity = createIdentity();
    expect(renameDevice(identity, "  Work laptop  ").label).toBe("Work laptop");
    expect(renameDevice(identity, "   ").label).toBe(identity.label);
  });
});

describe("the device list", () => {
  it("puts this device first, then the most recently active", () => {
    const devices = [
      device({ deviceId: "old", lastSeenAt: "2026-01-01T00:00:00.000Z" }),
      device({ deviceId: "recent", lastSeenAt: "2026-03-14T12:00:00.000Z" }),
      device({
        deviceId: "mine",
        isCurrent: true,
        lastSeenAt: "2026-02-01T00:00:00.000Z",
      }),
    ];

    expect(sortDevices(devices).map(d => d.deviceId)).toEqual([
      "mine",
      "recent",
      "old",
    ]);
  });

  it("sinks revoked devices below active ones", () => {
    const devices = [
      device({
        deviceId: "revoked",
        active: false,
        lastSeenAt: "2026-03-14T12:00:00.000Z",
      }),
      device({ deviceId: "active", lastSeenAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(sortDevices(devices)[0].deviceId).toBe("active");
  });

  it("says how many are syncing", () => {
    expect(devicesSummary([])).toBe("No devices are syncing.");
    expect(devicesSummary([device({ deviceId: "a" })])).toContain(
      "only device"
    );
    expect(
      devicesSummary([device({ deviceId: "a" }), device({ deviceId: "b" })])
    ).toBe("2 devices are syncing your journal.");
  });

  it("does not count a revoked device as syncing", () => {
    const devices = [
      device({ deviceId: "a" }),
      device({ deviceId: "b", active: false }),
    ];
    expect(devicesSummary(devices)).toContain("only device");
  });
});

describe("when each device was last seen", () => {
  const now = new Date("2026-03-14T12:00:00.000Z");

  it("reads naturally at each distance", () => {
    const at = (iso: string) =>
      lastSeenLabel(device({ deviceId: "d", lastSeenAt: iso }), now);

    expect(at("2026-03-14T11:59:30.000Z")).toBe("Syncing now");
    expect(at("2026-03-14T11:30:00.000Z")).toBe("30 minutes ago");
    expect(at("2026-03-14T09:00:00.000Z")).toBe("3 hours ago");
    expect(at("2026-03-12T12:00:00.000Z")).toBe("2 days ago");
    expect(at("2026-03-01T12:00:00.000Z")).toBe("Over a week ago");
    expect(at("2026-01-01T12:00:00.000Z")).toBe("Over a month ago");
  });

  it("does not invent a date it cannot read", () => {
    expect(
      lastSeenLabel(device({ deviceId: "d", lastSeenAt: "nonsense" }), now)
    ).toBe("Never synced");
  });
});

describe("revoking a lost device", () => {
  it("is honest that revoking does not wipe what is already on it", () => {
    const notice = describeRevoke(
      device({ deviceId: "phone", label: "Old phone" })
    );

    expect(notice.title).toContain("Old phone");
    expect(notice.warning).toContain("stay on it");
    // Someone must not be left believing a lost phone was wiped remotely.
    expect(notice.warning).toContain("change your password");
  });
});

describe("when to sync", () => {
  const base = {
    online: true,
    pendingWrites: 0,
    now: Date.parse("2026-03-14T12:00:00.000Z"),
  };

  it("never syncs while offline", () => {
    expect(shouldSync({ ...base, trigger: "opened", online: false }).sync).toBe(
      false
    );
  });

  it("always syncs on open and on reconnect", () => {
    expect(shouldSync({ ...base, trigger: "opened" }).sync).toBe(true);
    expect(shouldSync({ ...base, trigger: "reconnected" }).sync).toBe(true);
  });

  it("syncs whenever changes are waiting", () => {
    expect(
      shouldSync({ ...base, trigger: "focused", pendingWrites: 2 }).sync
    ).toBe(true);
  });

  it("skips a pointless sync when nothing is waiting and it just checked", () => {
    const result = shouldSync({
      ...base,
      trigger: "focused",
      lastSyncedAt: "2026-03-14T11:59:00.000Z",
    });
    // Costing battery to learn nothing is worse than waiting.
    expect(result.sync).toBe(false);
  });

  it("checks again once it has been a while", () => {
    expect(
      shouldSync({
        ...base,
        trigger: "interval",
        lastSyncedAt: "2026-03-14T11:00:00.000Z",
      }).sync
    ).toBe(true);
  });

  it("always honours an explicit request", () => {
    expect(
      shouldSync({
        ...base,
        trigger: "manual",
        lastSyncedAt: "2026-03-14T11:59:59.000Z",
      }).sync
    ).toBe(true);
  });

  it("waits after a write so five taps are one sync", () => {
    expect(SYNC_DELAYS["after-write"]).toBeGreaterThan(0);
    expect(SYNC_DELAYS.opened).toBe(0);
  });
});
