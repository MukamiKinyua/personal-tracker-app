/**
 * Device identity for multi-device sync.
 *
 * Phone, laptop and tablet each hold their own copy of the journal and their
 * own sync cursor. That cursor is per-device by necessity: the laptop being up
 * to date says nothing about what the tablet has seen, and a shared cursor
 * would leave whichever device synced second permanently skipping records.
 *
 * The registry also answers a question the privacy requirements raise directly:
 * which devices currently hold a copy of this journal, and how do I cut one off
 * after losing it.
 */

export type DeviceKind = "phone" | "tablet" | "laptop" | "desktop" | "unknown";

export type DeviceIdentity = {
  /** Stable per install. Regenerated only if local storage is wiped. */
  deviceId: string;
  /** What the user calls it. Editable, because "SM-A536B" helps nobody. */
  label: string;
  kind: DeviceKind;
  createdAt: string;
};

export type DeviceRecord = DeviceIdentity & {
  lastSeenAt: string;
  /** How far through the server's history this device has read. */
  cursor: number;
  /** False once revoked; a revoked device must stop syncing. */
  active: boolean;
  /** True for the device asking. */
  isCurrent?: boolean;
};

/**
 * Guesses the kind of device from the user agent.
 *
 * Only used to pick a sensible default name and icon, never for anything that
 * matters — user agents lie, and the user can rename it anyway.
 */
export function detectKind(userAgent: string): DeviceKind {
  const agent = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(agent)) return "tablet";
  // Android without "mobile" is conventionally a tablet.
  if (/android/.test(agent)) {
    return /mobile/.test(agent) ? "phone" : "tablet";
  }
  if (/iphone|ipod|windows phone/.test(agent)) return "phone";
  if (/macintosh|mac os x/.test(agent)) return "laptop";
  if (/windows nt|linux|cros/.test(agent)) return "desktop";

  return "unknown";
}

export const KIND_LABEL: Record<DeviceKind, string> = {
  phone: "Phone",
  tablet: "Tablet",
  laptop: "Laptop",
  desktop: "Computer",
  unknown: "Device",
};

function randomId(): string {
  // crypto.randomUUID is not everywhere yet, notably older Android WebViews.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createIdentity({
  userAgent = "",
  label,
  now = new Date(),
}: {
  userAgent?: string;
  label?: string;
  now?: Date;
} = {}): DeviceIdentity {
  const kind = detectKind(userAgent);
  return {
    deviceId: randomId(),
    kind,
    label: label?.trim() || KIND_LABEL[kind],
    createdAt: now.toISOString(),
  };
}

export function renameDevice(
  identity: DeviceIdentity,
  label: string
): DeviceIdentity {
  const trimmed = label.trim();
  return trimmed ? { ...identity, label: trimmed } : identity;
}

/**
 * Sorts the device list for the settings screen: this device first, then the
 * most recently active. Someone looking to revoke a lost phone should not have
 * to hunt for it behind six stale entries.
 */
export function sortDevices(devices: DeviceRecord[]): DeviceRecord[] {
  return [...devices].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });
}

/** "Last synced 3 days ago" — vague on purpose beyond a week. */
export function lastSeenLabel(
  device: DeviceRecord,
  now: Date = new Date()
): string {
  const seen = new Date(device.lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "Never synced";

  const minutes = Math.floor((now.getTime() - seen) / 60_000);
  if (minutes < 2) return "Syncing now";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) return "Over a week ago";
  return "Over a month ago";
}

/**
 * What revoking a device actually does, stated before it is done.
 *
 * Honest about the limit: revoking stops that device syncing from now on, but
 * whatever it already downloaded is on it. Pretending otherwise would leave
 * someone believing a lost phone had been wiped remotely when it has not.
 */
export function describeRevoke(device: DeviceRecord): {
  title: string;
  detail: string;
  warning: string;
} {
  return {
    title: `Stop syncing to ${device.label}?`,
    detail:
      "It will not receive any new entries, and anything it has not yet sent will not arrive.",
    warning:
      "The entries already downloaded to that device stay on it. If it is lost, change your password as well.",
  };
}

export type SyncTrigger =
  | "opened"
  | "focused"
  | "reconnected"
  | "after-write"
  | "interval"
  | "manual";

/**
 * When to sync.
 *
 * Frequent enough that three devices feel like one journal, rare enough not to
 * drain a phone battery. Opening the app and coming back online always sync,
 * because those are the moments a device is most likely to be behind. A write
 * waits a few seconds so that tapping "+250ml" five times is one sync, not five.
 */
export const SYNC_DELAYS: Record<SyncTrigger, number> = {
  opened: 0,
  reconnected: 0,
  manual: 0,
  focused: 2_000,
  "after-write": 5_000,
  interval: 5 * 60_000,
};

export function shouldSync({
  trigger,
  online,
  lastSyncedAt,
  pendingWrites,
  now = Date.now(),
}: {
  trigger: SyncTrigger;
  online: boolean;
  lastSyncedAt?: string;
  pendingWrites: number;
  now?: number;
}): { sync: boolean; reason: string } {
  if (!online) return { sync: false, reason: "Offline." };
  if (trigger === "manual") return { sync: true, reason: "Asked for." };
  if (trigger === "opened" || trigger === "reconnected") {
    return { sync: true, reason: "This device is most likely to be behind." };
  }
  if (pendingWrites > 0) return { sync: true, reason: "Changes are waiting." };

  const since = lastSyncedAt
    ? now - new Date(lastSyncedAt).getTime()
    : Infinity;
  if (since >= SYNC_DELAYS.interval) {
    return { sync: true, reason: "Nothing has been checked for a while." };
  }

  // Nothing waiting and recently checked — a sync would just cost battery.
  return { sync: false, reason: "Already up to date." };
}

/** The line the settings screen shows above the device list. */
export function devicesSummary(devices: DeviceRecord[]): string {
  const active = devices.filter(device => device.active).length;
  if (active === 0) return "No devices are syncing.";
  if (active === 1) return "This is the only device syncing your journal.";
  return `${active} devices are syncing your journal.`;
}
