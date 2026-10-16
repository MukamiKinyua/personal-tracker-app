import { describe, expect, it } from "vitest";
import {
  eventBody,
  leadDays,
  MAX_PLANNED_EVENTS,
  notificationId,
  parseLocal,
  planEventNotifications,
  respectQuietHours,
  type EventNotificationSettings,
  type UpcomingItem,
} from "./eventReminders";

const settings = (
  overrides: Partial<EventNotificationSettings> = {}
): EventNotificationSettings => ({
  previewMode: "Show everything",
  assignments: { enabled: true, timing: "1 day before" },
  documents: { enabled: true, timing: "30 days before" },
  notificationsEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  ...overrides,
});

// Monday 12 Oct 2026, 10:00 local.
const NOW = new Date(2026, 9, 12, 10, 0, 0);

const assignment = (id: string, date: string): UpcomingItem => ({
  id,
  source: "assignment",
  title: `Essay ${id}`,
  date,
});

describe("timing", () => {
  it("reads the lead time out of the wording the page uses", () => {
    expect(leadDays("1 day before")).toBe(1);
    expect(leadDays("Day before")).toBe(1);
    expect(leadDays("30 days before")).toBe(30);
    expect(leadDays("Day of estimate")).toBe(0);
    expect(leadDays("1 week before")).toBe(7);
    expect(leadDays("something unreadable")).toBe(1);
  });

  it("parses a bare date and a date with a clock time", () => {
    expect(parseLocal("2026-10-15")).toEqual({ y: 2026, m: 10, d: 15, time: undefined });
    expect(parseLocal("2026-10-15T17:30")?.time).toEqual({ hour: 17, minute: 30 });
    expect(parseLocal("not a date")).toBeNull();
  });
});

describe("planning", () => {
  it("schedules the day before and the day itself for an assignment", () => {
    const plan = planEventNotifications({
      items: [assignment("a", "2026-10-15")],
      settings: settings(),
      now: NOW,
    });
    expect(plan).toHaveLength(2);
    expect(plan[0].at).toEqual(new Date(2026, 9, 14, 9, 0));
    expect(plan[0].body).toBe("Due soon: Essay a");
    expect(plan[1].at).toEqual(new Date(2026, 9, 15, 8, 0));
    expect(plan[1].body).toBe("Due today: Essay a");
  });

  it("schedules only the day itself when the lead time is zero", () => {
    const plan = planEventNotifications({
      items: [assignment("a", "2026-10-15")],
      settings: settings({ assignments: { enabled: true, timing: "Day of" } }),
      now: NOW,
    });
    expect(plan.map(p => p.at.getDate())).toEqual([15]);
  });

  it("never schedules the past or beyond the horizon", () => {
    const plan = planEventNotifications({
      items: [
        assignment("past", "2026-10-01"),
        assignment("far", "2026-12-25"),
        assignment("soon", "2026-10-13"),
      ],
      settings: settings(),
      now: NOW,
    });
    expect(plan.every(p => p.body.includes("soon"))).toBe(true);
    expect(plan.length).toBeGreaterThan(0);
  });

  it("does nothing for an area the person switched off or when notifications are off", () => {
    const items = [assignment("a", "2026-10-15")];
    expect(
      planEventNotifications({
        items,
        settings: settings({ assignments: { enabled: false, timing: "1 day before" } }),
        now: NOW,
      })
    ).toEqual([]);
    expect(
      planEventNotifications({
        items,
        settings: settings({ notificationsEnabled: false }),
        now: NOW,
      })
    ).toEqual([]);
  });

  it("looks ahead by the document's own lead time", () => {
    const plan = planEventNotifications({
      items: [
        { id: "p", source: "document", title: "Passport", date: "2026-10-30" },
      ],
      settings: settings({ documents: { enabled: true, timing: "30 days before" } }),
      now: NOW,
      horizonDays: 30,
    });
    // 30 days before is already past, so only the day itself remains.
    expect(plan).toHaveLength(1);
    expect(plan[0].body).toBe("Review today: Passport");
  });

  it("fires a reminder the person set at its exact moment, ignoring quiet hours and the master switch", () => {
    const at = new Date(2026, 9, 13, 23, 30).getTime();
    const plan = planEventNotifications({
      items: [{ id: "r", source: "reminder", title: "Call the bank", date: "", atMs: at }],
      settings: settings({ notificationsEnabled: false }),
      now: NOW,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].at.getTime()).toBe(at);
    expect(plan[0].body).toBe("Call the bank");
  });

  it("is capped, soonest first", () => {
    const items = Array.from({ length: 80 }, (_, index) => ({
      id: `r${index}`,
      source: "reminder" as const,
      title: "x",
      date: "",
      atMs: NOW.getTime() + (index + 1) * 60_000,
    }));
    const plan = planEventNotifications({ items, settings: settings(), now: NOW });
    expect(plan).toHaveLength(MAX_PLANNED_EVENTS);
    expect(plan[0].at.getTime()).toBeLessThan(plan[1].at.getTime());
  });
});

describe("per-item timing", () => {
  it("uses the item's own lead time over the area default", () => {
    const plan = planEventNotifications({
      items: [
        {
          id: "p",
          source: "document",
          title: "Visa",
          date: "2026-10-20",
          timing: "3 days before",
        },
      ],
      settings: settings({ documents: { enabled: true, timing: "30 days before" } }),
      now: NOW,
    });
    expect(plan.map(p => p.at.getDate())).toEqual([17, 20]);
  });
});

describe("quiet hours", () => {
  it("moves a notification to when quiet hours end instead of dropping it", () => {
    expect(
      respectQuietHours(new Date(2026, 9, 12, 23, 0), "22:00", "07:00")
    ).toEqual(new Date(2026, 9, 13, 7, 0));
    expect(
      respectQuietHours(new Date(2026, 9, 12, 3, 0), "22:00", "07:00")
    ).toEqual(new Date(2026, 9, 12, 7, 0));
    expect(
      respectQuietHours(new Date(2026, 9, 12, 12, 0), "22:00", "07:00")
    ).toEqual(new Date(2026, 9, 12, 12, 0));
  });

  it("applies to the morning notifications when quiet hours run late", () => {
    const plan = planEventNotifications({
      items: [assignment("a", "2026-10-15")],
      settings: settings({ quietHoursStart: "07:30", quietHoursEnd: "10:00" }),
      now: NOW,
    });
    expect(plan[0].at).toEqual(new Date(2026, 9, 14, 10, 0));
    expect(plan[1].at).toEqual(new Date(2026, 9, 15, 10, 0));
  });
});

describe("what a notification reveals", () => {
  it("follows the chosen preview mode and never leaks the title when hidden", () => {
    expect(eventBody("Hide all reminder previews", "assignment", "Secret", "lead")).toBe(
      "Reminder due"
    );
    expect(eventBody("Show a general reminder only", "document", "Secret", "lead")).toBe(
      "You have a private reminder"
    );
    expect(eventBody("Hide sensitive names", "assignment", "Secret", "lead")).toBe(
      "Assignment reminder"
    );
    expect(eventBody("Hide sensitive names", "document", "Secret", "today")).toBe(
      "Document reminder"
    );
    for (const mode of [
      "Hide all reminder previews",
      "Show a general reminder only",
      "Hide sensitive names",
    ]) {
      expect(eventBody(mode, "reminder", "Secret", "exact")).not.toContain("Secret");
    }
  });

  it("always titles the notification with the app, whatever the mode", () => {
    const plan = planEventNotifications({
      items: [assignment("a", "2026-10-15")],
      settings: settings(),
      now: NOW,
    });
    expect(new Set(plan.map(p => p.title))).toEqual(new Set(["Personal Tracker"]));
  });
});

describe("ids", () => {
  it("are stable, distinct per notification and clear of the daily reminders", () => {
    expect(notificationId("assignment:a:lead")).toBe(notificationId("assignment:a:lead"));
    expect(notificationId("assignment:a:lead")).not.toBe(notificationId("assignment:a:today"));
    expect(notificationId("x")).toBeGreaterThanOrEqual(100_000);
    expect(notificationId("x")).toBeLessThan(2 ** 31);
  });
});
