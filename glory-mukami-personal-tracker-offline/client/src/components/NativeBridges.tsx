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
import {
  isNative,
  publishWidget,
  scheduleDaily,
  showNow,
  type WidgetSummary,
} from "@/lib/native";
import { dueNow, planDailyReminders } from "@/lib/reminders";
import { useEffect, useRef } from "react";

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
  const planKey = JSON.stringify([
    preferences.notifications,
    preferences.reminders.map(r => [r.kind, r.enabled, r.at, r.ignoredCount]),
    today,
  ]);
  useEffect(() => {
    if (!ready || !isNative()) return;
    void scheduleDaily(planDailyReminders(preferences, today)).catch(error =>
      console.warn("[reminders] could not schedule", error)
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
  const summaryKey = JSON.stringify([
    waterMl,
    journal.preferences.waterGoalMl,
    tasksOpen,
    timerMinute,
  ]);

  useEffect(() => {
    if (!journal.ready || !isNative()) return;
    const summary: WidgetSummary = {
      waterMl,
      waterGoalMl: journal.preferences.waterGoalMl,
      tasksOpen,
      timer: timerMinute,
      updatedAt: new Date().toISOString(),
    };
    void publishWidget(summary).catch(error =>
      console.warn("[widget] could not publish", error)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryKey, journal.ready]);
}
