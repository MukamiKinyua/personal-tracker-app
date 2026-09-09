/**
 * Reminders that do not nag.
 *
 * The requirement is unusually specific about tone: not "YOU HAVEN'T LOGGED
 * WATER!" but "Want to record today's water?" — and the user controls all of
 * it. That tone is a functional requirement, not decoration, so the wording
 * lives here beside the scheduling rules and is tested like any other output.
 *
 * Three rules shape the module. A reminder is a question, never an imperative
 * or an accusation. It is never sent inside quiet hours. And it backs off on
 * its own when it is being ignored, because a reminder that fires unheeded for
 * two weeks has already failed and is only training the user to dismiss it.
 *
 * Nothing here delivers anything. Per the project's own scope note, real
 * delivery must run on platform-managed scheduled handlers rather than browser
 * timers; this decides *whether* and *what*, and the caller decides *how*.
 */

import { daysBetween, type DayKey } from "./datetime";
import { isWithinQuietHours, type Preferences } from "./preferences";

export type ReminderKind =
  | "water"
  | "mood"
  | "sleep"
  | "habit"
  | "journal"
  | "review"
  | "document"
  | "bill";

export type ReminderSetting = {
  kind: ReminderKind;
  enabled: boolean;
  /** Wall clock time the user chose, "HH:mm". */
  at: string;
  /** Consecutive times this reminder has gone unanswered. */
  ignoredCount: number;
  /** The day it last fired, so it fires once a day at most. */
  lastSentOn?: DayKey;
};

export function createReminder(
  kind: ReminderKind,
  at: string,
  enabled = false
): ReminderSetting {
  // Off by default. A tracker that starts by sending notifications has decided
  // something for the user that was theirs to decide.
  return { kind, enabled, at, ignoredCount: 0 };
}

/**
 * The wording. Every line is a question or an offer, and none of them mentions
 * a streak, a failure, or what the user did not do.
 */
export const REMINDER_COPY: Record<
  ReminderKind,
  { title: string; body: string }
> = {
  water: {
    title: "A small check-in",
    body: "Want to record today's water?",
  },
  mood: {
    title: "A small check-in",
    body: "How has today felt so far?",
  },
  sleep: {
    title: "Last night",
    body: "Want to note how you slept?",
  },
  habit: {
    title: "A small check-in",
    body: "Anything you would like to tick off today?",
  },
  journal: {
    title: "A moment to write",
    body: "Is there anything worth keeping from today?",
  },
  review: {
    title: "Your week",
    body: "Would you like to look back at the week?",
  },
  document: {
    title: "Coming up for review",
    body: "One of your documents is due for a look.",
  },
  bill: {
    title: "Coming up",
    body: "A bill you are tracking is due soon.",
  },
};

export const MAX_IGNORED_BEFORE_PAUSE = 5;

export type ReminderDecision =
  | { send: true; title: string; body: string }
  | { send: false; reason: string };

/**
 * Whether a reminder should go out now.
 *
 * The checks run cheapest-and-most-absolute first: the user's global switch,
 * then this reminder's own switch, then quiet hours, then whether the thing
 * being reminded about has already been done.
 */
export function shouldSend({
  reminder,
  preferences,
  now,
  today,
  alreadyLogged = false,
}: {
  reminder: ReminderSetting;
  preferences: Preferences;
  /** Local wall clock, "HH:mm". */
  now: string;
  today: DayKey;
  /** True when the user has already recorded the thing this is about. */
  alreadyLogged: boolean | undefined;
}): ReminderDecision {
  if (!preferences.notifications.enabled) {
    return { send: false, reason: "Notifications are switched off." };
  }
  if (!reminder.enabled) {
    return { send: false, reason: "This reminder is switched off." };
  }
  if (
    isWithinQuietHours(
      now,
      preferences.notifications.quietHoursStart,
      preferences.notifications.quietHoursEnd
    )
  ) {
    return { send: false, reason: "Inside quiet hours." };
  }
  if (alreadyLogged) {
    // Reminding someone to do what they have already done is the fastest way
    // to teach them the reminders are not worth reading.
    return { send: false, reason: "Already recorded today." };
  }
  if (reminder.lastSentOn === today) {
    return { send: false, reason: "Already sent today." };
  }
  if (reminder.ignoredCount >= MAX_IGNORED_BEFORE_PAUSE) {
    return { send: false, reason: "Paused after being ignored several times." };
  }
  if (now < reminder.at) {
    return { send: false, reason: "Not yet due." };
  }

  const copy = REMINDER_COPY[reminder.kind];
  return { send: true, title: copy.title, body: copy.body };
}

export function markSent(
  reminder: ReminderSetting,
  today: DayKey
): ReminderSetting {
  return {
    ...reminder,
    lastSentOn: today,
    ignoredCount: reminder.ignoredCount + 1,
  };
}

/** Acting on a reminder clears the ignore count — it is working. */
export function markActedOn(reminder: ReminderSetting): ReminderSetting {
  return { ...reminder, ignoredCount: 0 };
}

/**
 * A reminder that has been ignored enough times to stop.
 *
 * Surfaced so the app can ask once whether to keep it, rather than either
 * nagging forever or silently disabling something the user wanted.
 */
export function needsReview(reminder: ReminderSetting): boolean {
  return reminder.enabled && reminder.ignoredCount >= MAX_IGNORED_BEFORE_PAUSE;
}

export function pausedPrompt(reminder: ReminderSetting): string {
  return `Your ${reminder.kind} reminder has been paused because it kept going unanswered. Keep it, change the time, or turn it off?`;
}

/**
 * A reminder tied to a date rather than a time of day, such as a document
 * review or a bill. Fires inside a window before the date, once.
 */
export function isDueSoon({
  targetDay,
  today,
  windowDays = 3,
}: {
  targetDay: DayKey;
  today: DayKey;
  windowDays?: number;
}): boolean {
  const days = daysBetween(today, targetDay);
  return days >= 0 && days <= windowDays;
}

/** All the reminders the user has switched on, for the settings screen. */
export function activeReminders(
  reminders: ReminderSetting[],
  preferences: Preferences
): ReminderSetting[] {
  if (!preferences.notifications.enabled) return [];
  return reminders.filter(reminder => reminder.enabled);
}
