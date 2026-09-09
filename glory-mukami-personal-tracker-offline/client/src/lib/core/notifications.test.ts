import { describe, expect, it } from "vitest";
import {
  activeReminders,
  createReminder,
  isDueSoon,
  markActedOn,
  markSent,
  MAX_IGNORED_BEFORE_PAUSE,
  needsReview,
  pausedPrompt,
  REMINDER_COPY,
  shouldSend,
  type ReminderSetting,
} from "./notifications";
import { resolvePreferences } from "./preferences";

const TODAY = "2026-03-14";

const on = resolvePreferences({ notifications: { enabled: true } });
const off = resolvePreferences();

function reminder(over: Partial<ReminderSetting> = {}): ReminderSetting {
  return { ...createReminder("water", "09:00", true), ...over };
}

describe("the wording", () => {
  it("asks rather than commands or accuses", () => {
    for (const copy of Object.values(REMINDER_COPY)) {
      const text = `${copy.title} ${copy.body}`.toLowerCase();
      // No shouting, no blame, no streak talk.
      expect(text).not.toMatch(
        /!|you haven't|you didn't|don't forget|missed|streak|failed|lazy/
      );
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });

  it("phrases the water reminder as the requirement asks", () => {
    expect(REMINDER_COPY.water.body).toBe("Want to record today's water?");
  });
});

describe("whether to send", () => {
  it("stays silent while notifications are switched off globally", () => {
    const decision = shouldSend({
      reminder: reminder(),
      preferences: off,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision.send).toBe(false);
  });

  it("stays silent for a reminder the user switched off", () => {
    const decision = shouldSend({
      reminder: reminder({ enabled: false }),
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toMatchObject({ send: false });
  });

  it("never speaks inside quiet hours", () => {
    const decision = shouldSend({
      reminder: reminder({ at: "23:30" }),
      preferences: on,
      now: "23:30",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toMatchObject({
      send: false,
      reason: "Inside quiet hours.",
    });
  });

  it("does not remind someone to do what they have already done", () => {
    const decision = shouldSend({
      reminder: reminder(),
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: true,
    });
    expect(decision).toMatchObject({
      send: false,
      reason: "Already recorded today.",
    });
  });

  it("sends once a day at most", () => {
    const decision = shouldSend({
      reminder: reminder({ lastSentOn: TODAY }),
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toMatchObject({
      send: false,
      reason: "Already sent today.",
    });
  });

  it("waits until the time the user chose", () => {
    const decision = shouldSend({
      reminder: reminder({ at: "18:00" }),
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toMatchObject({ send: false, reason: "Not yet due." });
  });

  it("sends the gentle copy when everything lines up", () => {
    const decision = shouldSend({
      reminder: reminder(),
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toEqual({
      send: true,
      title: "A small check-in",
      body: "Want to record today's water?",
    });
  });
});

describe("backing off when ignored", () => {
  it("pauses after being ignored enough times", () => {
    let setting = reminder();
    for (let index = 0; index < MAX_IGNORED_BEFORE_PAUSE; index += 1) {
      setting = markSent(
        setting,
        `2026-03-${String(index + 1).padStart(2, "0")}`
      );
    }

    expect(needsReview(setting)).toBe(true);
    const decision = shouldSend({
      reminder: setting,
      preferences: on,
      now: "10:00",
      today: TODAY,
      alreadyLogged: false,
    });
    expect(decision).toMatchObject({
      send: false,
      reason: "Paused after being ignored several times.",
    });
  });

  it("asks the user what to do rather than silently disabling it", () => {
    const prompt = pausedPrompt(reminder({ ignoredCount: 5 }));
    expect(prompt).toContain("Keep it, change the time, or turn it off?");
  });

  it("clears the count once the reminder is acted on", () => {
    const acted = markActedOn(reminder({ ignoredCount: 4 }));
    expect(acted.ignoredCount).toBe(0);
    expect(needsReview(acted)).toBe(false);
  });
});

describe("defaults and settings", () => {
  it("starts switched off, so the app decides nothing for the user", () => {
    expect(createReminder("water", "09:00").enabled).toBe(false);
  });

  it("lists nothing active while notifications are globally off", () => {
    expect(activeReminders([reminder()], off)).toEqual([]);
    expect(activeReminders([reminder()], on)).toHaveLength(1);
  });
});

describe("date-based reminders", () => {
  it("fires inside the window before the date", () => {
    expect(isDueSoon({ targetDay: "2026-03-16", today: TODAY })).toBe(true);
    expect(isDueSoon({ targetDay: TODAY, today: TODAY })).toBe(true);
  });

  it("does not fire too early or after the date has passed", () => {
    expect(isDueSoon({ targetDay: "2026-03-30", today: TODAY })).toBe(false);
    expect(isDueSoon({ targetDay: "2026-03-13", today: TODAY })).toBe(false);
  });
});
