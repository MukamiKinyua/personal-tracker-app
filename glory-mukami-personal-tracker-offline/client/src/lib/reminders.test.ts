import { describe, expect, it } from "vitest";
import { resolvePreferences } from "@/lib/core/preferences";
import { dueNow, parseTime, planDailyReminders } from "./reminders";

const TODAY = "2026-09-14";

function prefs(overrides: Parameters<typeof resolvePreferences>[0] = {}) {
  return resolvePreferences({
    notifications: { enabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" },
    ...overrides,
  });
}

describe("parseTime", () => {
  it("reads HH:mm and rejects what is not a time", () => {
    expect(parseTime("08:30")).toEqual({ hour: 8, minute: 30 });
    expect(parseTime("8:05")).toEqual({ hour: 8, minute: 5 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("09:60")).toBeNull();
    expect(parseTime("soon")).toBeNull();
  });
});

describe("planDailyReminders", () => {
  it("schedules nothing while notifications are off", () => {
    const off = prefs({ notifications: { enabled: false } });
    off.reminders[0].enabled = true;
    expect(planDailyReminders(off, TODAY)).toEqual([]);
  });

  it("schedules only reminders that are switched on", () => {
    const p = prefs();
    p.reminders = p.reminders.map(reminder =>
      reminder.kind === "water" ? { ...reminder, enabled: true } : reminder
    );
    const plan = planDailyReminders(p, TODAY);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 11, minute: 0 });
    expect(plan[0].body).toBe("Want to record today's water?");
  });

  it("never schedules a reminder set inside quiet hours", () => {
    const p = prefs();
    p.reminders = p.reminders.map(reminder =>
      reminder.kind === "journal"
        ? { ...reminder, enabled: true, at: "23:00" }
        : reminder
    );
    expect(planDailyReminders(p, TODAY)).toEqual([]);
  });

  it("still schedules a reminder that already fired today", () => {
    // A repeating schedule is for tomorrow as much as today.
    const p = prefs();
    p.reminders = p.reminders.map(reminder =>
      reminder.kind === "mood"
        ? { ...reminder, enabled: true, lastSentOn: TODAY }
        : reminder
    );
    expect(planDailyReminders(p, TODAY)).toHaveLength(1);
  });

  it("leaves out a reminder that has been ignored into a pause", () => {
    const p = prefs();
    p.reminders = p.reminders.map(reminder =>
      reminder.kind === "habit"
        ? { ...reminder, enabled: true, ignoredCount: 5 }
        : reminder
    );
    expect(planDailyReminders(p, TODAY)).toEqual([]);
  });

  it("gives each kind a stable id so rescheduling replaces, not duplicates", () => {
    const p = prefs();
    p.reminders = p.reminders.map(reminder => ({ ...reminder, enabled: true }));
    const ids = planDailyReminders(p, TODAY).map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(planDailyReminders(p, TODAY).map(item => item.id));
  });
});

describe("dueNow", () => {
  it("fires at the minute, once, and not when already logged", () => {
    const p = prefs();
    p.reminders = p.reminders.map(reminder =>
      reminder.kind === "water" ? { ...reminder, enabled: true } : reminder
    );

    expect(
      dueNow({ preferences: p, now: "10:59", today: TODAY, isLogged: () => false })
    ).toEqual([]);

    const due = dueNow({
      preferences: p,
      now: "11:00",
      today: TODAY,
      isLogged: () => false,
    });
    expect(due).toHaveLength(1);
    expect(due[0].reminder.kind).toBe("water");

    expect(
      dueNow({
        preferences: p,
        now: "11:00",
        today: TODAY,
        isLogged: scope => scope === "water",
      })
    ).toEqual([]);
  });
});
