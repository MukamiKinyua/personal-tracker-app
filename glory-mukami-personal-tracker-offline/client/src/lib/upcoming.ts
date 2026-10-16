/**
 * The meeting point between the pages that own dates and the thing that
 * schedules notifications.
 *
 * Assignments, documents and the reminders a person sets each live inside
 * their own page. The notification scheduler runs above all of them and cannot
 * reach in, and the pages are not mounted when nobody is looking at them. So
 * each page *publishes* its dated items here whenever they change, and the
 * scheduler reads this. The latest snapshot is kept in localStorage, which is
 * what lets the plan be rebuilt on a fresh launch before any page has opened.
 */

import { useSyncExternalStore } from "react";
import type {
  AreaSettings,
  UpcomingItem,
  UpcomingSource,
} from "./eventReminders";

// Under the "glory-personal-tracker" prefix, so "erase this device" clears it.
const KEY = "glory-personal-tracker:upcoming";

type Snapshot = {
  items: UpcomingItem[];
  settings: AreaSettings | null;
};

const EMPTY: Snapshot = { items: [], settings: null };

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      settings: parsed.settings ?? null,
    };
  } catch {
    return EMPTY;
  }
}

let snapshot: Snapshot = typeof localStorage === "undefined" ? EMPTY : read();
const listeners = new Set<() => void>();

function commit(next: Snapshot) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: still correct for this session.
  }
  listeners.forEach(listener => listener());
}

/** Replaces every item from one source, leaving the others alone. */
export function publishUpcoming(source: UpcomingSource, items: UpcomingItem[]) {
  const others = snapshot.items.filter(item => item.source !== source);
  const next = [...others, ...items];
  // Skip a write that changes nothing: pages republish on every render pass.
  if (JSON.stringify(next) === JSON.stringify(snapshot.items)) return;
  commit({ ...snapshot, items: next });
}

export function publishNotificationSettings(settings: AreaSettings) {
  if (JSON.stringify(settings) === JSON.stringify(snapshot.settings)) return;
  commit({ ...snapshot, settings });
}

export function getUpcomingSnapshot(): Snapshot {
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpcomingSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getUpcomingSnapshot, () => EMPTY);
}

/** Test seam. */
export function resetUpcomingForTests() {
  snapshot = EMPTY;
  listeners.clear();
}
