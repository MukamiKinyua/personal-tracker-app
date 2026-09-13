/**
 * Turns reminder preferences into a delivery plan.
 *
 * `core/notifications` decides whether a reminder should go out at a given
 * moment. This is the layer above: given the user's settings, what should the
 * device be told to schedule? It is pure so it can be tested, and so both
 * delivery paths — Android's scheduled notifications and the browser's
 * while-open check — are fed by one decision.
 */

import type { DayKey } from "@/lib/core/datetime";
import {
  shouldSend,
  type ReminderKind,
  type ReminderSetting,
} from "@/lib/core/notifications";
import type { Preferences } from "@/lib/core/preferences";
import type { PlannedNotification } from "@/lib/native";

/** Stable per kind, so re-scheduling replaces rather than duplicates. */
const NOTIFICATION_IDS: Record<ReminderKind, number> = {
  sleep: 1,
  water: 2,
  mood: 3,
  habit: 4,
  journal: 5,
  review: 6,
  document: 7,
  bill: 8,
};

/** The record scope that, once written today, makes the reminder moot. */
export const LOGGED_SCOPE: Partial<Record<ReminderKind, string>> = {
  water: "water",
  sleep: "sleep",
  habit: "habit",
  journal: "reflection",
  mood: "mood",
};

export function parseTime(
  at: string
): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(at.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * The daily schedule to hand the device.
 *
 * Quiet hours are applied here, at planning time, because a scheduled
 * notification fires whether or not the app is awake to reconsider — so a
 * reminder set for inside quiet hours is simply not scheduled. What cannot be
 * decided in advance (has the thing already been logged today?) is left to
 * the moment, and only the browser path can act on it.
 */
export function planDailyReminders(
  preferences: Preferences,
  today: DayKey
): PlannedNotification[] {
  const plan: PlannedNotification[] = [];

  for (const reminder of preferences.reminders) {
    const time = parseTime(reminder.at);
    if (!time) continue;

    // `lastSentOn` is cleared for the question "should this be scheduled at
    // all": a repeating notification is the device's business once set, and
    // having fired today must not stop it being set for tomorrow.
    const decision = shouldSend({
      reminder: { ...reminder, lastSentOn: undefined },
      preferences,
      now: reminder.at,
      today,
      alreadyLogged: false,
    });
    if (!decision.send) continue;

    plan.push({
      id: NOTIFICATION_IDS[reminder.kind],
      title: decision.title,
      body: decision.body,
      hour: time.hour,
      minute: time.minute,
    });
  }

  return plan;
}

/**
 * Which reminders are due at this minute — the browser path, which can only
 * check while the app is open, and so also knows whether the thing has
 * already been logged.
 */
export function dueNow({
  preferences,
  now,
  today,
  isLogged,
}: {
  preferences: Preferences;
  /** "HH:mm" local wall clock. */
  now: string;
  today: DayKey;
  isLogged: (scope: string) => boolean;
}): Array<{ reminder: ReminderSetting; title: string; body: string }> {
  const due: Array<{
    reminder: ReminderSetting;
    title: string;
    body: string;
  }> = [];

  for (const reminder of preferences.reminders) {
    if (reminder.at !== now) continue;

    const scope = LOGGED_SCOPE[reminder.kind];
    const decision = shouldSend({
      reminder,
      preferences,
      now,
      today,
      alreadyLogged: scope ? isLogged(scope) : false,
    });
    if (decision.send) {
      due.push({ reminder, title: decision.title, body: decision.body });
    }
  }

  return due;
}
