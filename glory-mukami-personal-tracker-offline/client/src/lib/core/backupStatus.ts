/**
 * Is my journal actually backed up right now?
 *
 * The sync engine already says "Everything is synced", but that one line hides
 * the cases that matter most: signed out (nothing is backed up at all), a
 * server whose database cannot be reached (the app quietly keeps working
 * locally), a last attempt that failed, or a backup that simply has not
 * happened for a day. This turns those into one plain verdict with a level, so
 * the settings screen can show a state a person can trust at a glance.
 *
 * Pure: no clock, no network, so every verdict is testable.
 */

export type BackupLevel = "ok" | "waiting" | "warn" | "off";

export type BackupInput = {
  signedIn: boolean;
  online: boolean;
  /** Journal changes made here that the account has not received yet. */
  pendingWrites: number;
  /** ISO time of the last sync that completed. */
  lastSyncedAt?: string;
  /** The last sync attempt's error, if it failed. */
  lastError?: string;
  /** Edits the server and this device disagree about. */
  conflicts: number;
  /** False when the server says its database is not reachable. */
  serverReady?: boolean;
  /** Attached files not yet copied to the account. */
  filesWaiting: number;
  /** Why a file could not be backed up, if one failed. */
  fileProblem?: string;
  now: number;
};

export type BackupStatus = {
  level: BackupLevel;
  headline: string;
  detail?: string;
  /** "3 minutes ago", "never". */
  lastBackedUp: string;
};

/** A backup older than this, with nothing waiting, is worth a second look. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function relativeTime(iso: string | undefined, now: number): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export function backupStatus(input: BackupInput): BackupStatus {
  const lastBackedUp = relativeTime(input.lastSyncedAt, input.now);
  const waiting = input.pendingWrites + input.filesWaiting;

  if (!input.signedIn) {
    return {
      level: "off",
      headline: "Not backed up",
      detail:
        "Your journal is saved on this device only. Sign in to keep a copy on your account.",
      lastBackedUp,
    };
  }

  // Checked before anything reassuring: if the database cannot be reached,
  // "everything is synced" would be a false comfort.
  if (input.serverReady === false) {
    return {
      level: "warn",
      headline: "Backup is not working",
      detail:
        "The server's database cannot be reached, so changes are saved on this device only. This needs fixing on the server.",
      lastBackedUp,
    };
  }

  if (input.online && input.lastError) {
    return {
      level: "warn",
      headline: "The last backup attempt failed",
      detail: `${input.lastError}. It will try again.`,
      lastBackedUp,
    };
  }

  if (input.fileProblem) {
    return {
      level: "warn",
      headline: "A file could not be backed up",
      detail: input.fileProblem,
      lastBackedUp,
    };
  }

  if (input.conflicts > 0) {
    return {
      level: "warn",
      headline: `${plural(input.conflicts, "change")} need${input.conflicts === 1 ? "s" : ""} your decision`,
      detail: "Two devices edited the same thing. Choose which to keep.",
      lastBackedUp,
    };
  }

  if (!input.online) {
    return {
      level: "waiting",
      headline: "Offline",
      detail:
        waiting > 0
          ? `${plural(waiting, "change")} will back up when you are online. Everything is saved on this device.`
          : "Everything is saved on this device and will sync when you are online.",
      lastBackedUp,
    };
  }

  if (waiting > 0) {
    return {
      level: "waiting",
      headline: "Backing up…",
      detail: `${plural(waiting, "change")} waiting to be sent.`,
      lastBackedUp,
    };
  }

  if (!input.lastSyncedAt) {
    return {
      level: "waiting",
      headline: "Not backed up yet",
      detail: "The first backup has not completed. Try Sync now.",
      lastBackedUp,
    };
  }

  const age = input.now - new Date(input.lastSyncedAt).getTime();
  if (Number.isFinite(age) && age > STALE_AFTER_MS) {
    return {
      level: "warn",
      headline: "Backup looks out of date",
      detail: "Nothing is waiting, but the last check was over a day ago. Try Sync now.",
      lastBackedUp,
    };
  }

  return {
    level: "ok",
    headline: "Backed up",
    detail: "Your journal and files are on your account.",
    lastBackedUp,
  };
}
