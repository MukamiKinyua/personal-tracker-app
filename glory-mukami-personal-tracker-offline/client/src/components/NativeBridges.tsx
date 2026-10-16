/**
 * Keeps the phone in step with the journal.
 *
 * Renders nothing. It exists so two things happen without any page asking:
 * the device's reminder schedule always matches the preferences, and the
 * home-screen widget always shows the latest numbers. In a browser the first
 * becomes a once-a-minute check while the app is open (the most a browser
 * can do) and the second is a no-op.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import { useTimers } from "@/contexts/TimersContext";
import { markSent } from "@/lib/core/notifications";
import { formatTimer } from "@/lib/core/timers";
import { buildWidgetExtras } from "@/lib/widgetSummary";
import { planEventNotifications } from "@/lib/eventReminders";
import {
  isNative,
  onAppResume,
  publishWidget,
  scheduleAll,
  showNow,
  type WidgetSummary,
} from "@/lib/native";
import { dueNow, planDailyReminders } from "@/lib/reminders";
import { useUpcomingSnapshot } from "@/lib/upcoming";
import { useEffect, useRef, useState } from "react";

function wallClock(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

export function NativeBridges() {
  useReminderDelivery();
  useWidgetSync();
  return null;
}

function useReminderDelivery() {
  const journal = useRecordStore();
  const { preferences, today, ready } = journal;

  /*
   * Android: the plan is handed to the OS, which fires it whether or not the
   * app is open. Re-planned whenever the settings change, and once a day so
   * the quiet-hours decision is made against the current day.
   */
  const upcoming = useUpcomingSnapshot();
  // Each return to the foreground re-plans, so the fortnight of dated
  // notifications keeps rolling forward and anything since done is dropped.
  const [resumes, setResumes] = useState(0);
  useEffect(() => onAppResume(() => setResumes(count => count + 1)), []);

  const planKey = JSON.stringify([
    preferences.notifications,
    preferences.reminders.map(r => [r.kind, r.enabled, r.at, r.ignoredCount]),
    today,
    upcoming.items,
    upcoming.settings,
    resumes,
  ]);
  useEffect(() => {
    if (!ready || !isNative()) return;
    // Daily check-ins and dated notifications are scheduled in one call:
    // scheduling replaces everything pending, so two calls would erase each
    // other.
    const events = upcoming.settings
      ? planEventNotifications({
          items: upcoming.items,
          settings: {
            ...upcoming.settings,
            notificationsEnabled: preferences.notifications.enabled,
            quietHoursStart: preferences.notifications.quietHoursStart,
            quietHoursEnd: preferences.notifications.quietHoursEnd,
          },
        })
      : [];
    void scheduleAll(planDailyReminders(preferences, today), events).catch(
      error => console.warn("[reminders] could not schedule", error)
    );
    // `planKey` is the dependency: it captures exactly what the plan reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, ready]);

  /*
   * Browser: a check each minute while the app is open. This is the honest
   * limit of what a web page can do — nothing fires once the tab is closed —
   * but it does get to ask the one question the OS cannot: has this already
   * been logged today?
   */
  const lastMinute = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || isNative()) return;

    const tick = () => {
      const now = wallClock();
      if (now === lastMinute.current) return;
      lastMinute.current = now;

      const due = dueNow({
        preferences,
        now,
        today,
        isLogged: scope => journal.onDay(scope, today).length > 0,
      });
      if (due.length === 0) return;

      for (const item of due) {
        void showNow(item.title, item.body);
      }
      journal.updatePreferences({
        reminders: preferences.reminders.map(reminder =>
          due.some(item => item.reminder.kind === reminder.kind)
            ? markSent(reminder, today)
            : reminder
        ),
      });
    };

    tick();
    const handle = window.setInterval(tick, 30_000);
    return () => window.clearInterval(handle);
  }, [journal, preferences, ready, today]);
}

function useWidgetSync() {
  const journal = useRecordStore();
  const timers = useTimers();

  const waterMl = journal
    .onDay("water", journal.today)
    .reduce((sum, record) => sum + (Number(record.body.amountMl) || 0), 0);
  const tasksOpen = journal
    .inScope("task")
    .filter(record => !record.body.done).length;
  const timer = timers.primary
    ? `${timers.primary.label} · ${formatTimer(timers.primary, timers.now)}`
    : undefined;

  // Timers tick every second; the widget does not need to. Only a change in
  // the minute shown, or in the numbers, reaches the phone.
  const timerMinute = timer?.replace(/:\d\d$/, "");

  // What each widget may say is decided here, before anything is written, so
  // the native side can never show more than this chose to give it.
  const upcoming = useUpcomingSnapshot();
  const extras = buildWidgetExtras({
    tasks: journal.inScope("task").map(record => ({
      title: String(record.body.title ?? ""),
      done: Boolean(record.body.done),
      when: String(record.body.when ?? ""),
    })),
    sleep: journal.inScope("sleep").map(record => ({
      hours: Number(record.body.hours) || 0,
      quality: String(record.body.quality ?? ""),
      start: record.period.start,
    })),
    items: upcoming.items,
    previewMode: upcoming.settings?.previewMode ?? "Hide sensitive names",
    privacyMode: journal.preferences.privacyMode,
  });
  // The minute changes the day label's meaning near midnight, so the date is
  // part of the key.
  const summaryKey = JSON.stringify([
    waterMl,
    journal.preferences.waterGoalMl,
    tasksOpen,
    timerMinute,
    extras,
    journal.today,
  ]);

  useEffect(() => {
    if (!journal.ready || !isNative()) return;
    const summary: WidgetSummary = {
      waterMl,
      waterGoalMl: journal.preferences.waterGoalMl,
      tasksOpen,
      timer: timerMinute,
      ...extras,
      updatedAt: new Date().toISOString(),
    };
    void publishWidget(summary).catch(error =>
      console.warn("[widget] could not publish", error)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryKey, journal.ready]);
}
