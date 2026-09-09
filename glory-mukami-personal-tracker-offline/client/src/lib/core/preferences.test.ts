import { describe, expect, it } from "vitest";
import {
  DEFAULT_AREAS,
  defaultPreferences,
  formatVolume,
  fromMilliliters,
  isTracking,
  isWithinQuietHours,
  mayNotify,
  resolvePreferences,
  setAreaTracked,
  toMilliliters,
} from "./preferences";

describe("setup preferences", () => {
  it("gives a user who skipped onboarding a complete configuration", () => {
    const prefs = resolvePreferences();
    expect(prefs.timezone).toBeTruthy();
    expect(prefs.weekStartsOn).toBe(1);
    expect(prefs.areas).toEqual(DEFAULT_AREAS);
    expect(prefs.onboardingCompleted).toBe(false);
  });

  it("merges a partial set without dropping nested defaults", () => {
    const prefs = resolvePreferences({
      displayName: "Glory",
      notifications: { enabled: true },
    });
    expect(prefs.displayName).toBe("Glory");
    expect(prefs.notifications.enabled).toBe(true);
    expect(prefs.notifications.quietHoursStart).toBe("22:00");
  });

  it("leaves the sensitive areas off until deliberately switched on", () => {
    const prefs = defaultPreferences();
    expect(isTracking(prefs, "period")).toBe(false);
    expect(isTracking(prefs, "finances")).toBe(false);
    expect(isTracking(prefs, "relationships")).toBe(false);
    expect(isTracking(prefs, "water")).toBe(true);
  });

  it("turns an area on and off without touching anything else", () => {
    const on = setAreaTracked(defaultPreferences(), "finances", true);
    expect(isTracking(on, "finances")).toBe(true);

    const off = setAreaTracked(on, "water", false);
    expect(isTracking(off, "water")).toBe(false);
    expect(isTracking(off, "finances")).toBe(true);
  });

  it("does not add an area twice", () => {
    const prefs = setAreaTracked(defaultPreferences(), "water", true);
    expect(prefs.areas.filter(area => area === "water")).toHaveLength(1);
  });
});

describe("volume units", () => {
  it("stores every unit as millilitres", () => {
    expect(toMilliliters(250, "ml")).toBe(250);
    expect(toMilliliters(1.5, "l")).toBe(1500);
    expect(toMilliliters(8, "oz")).toBe(237);
    expect(toMilliliters(2, "cup")).toBe(473);
  });

  it("converts back for display without rounding away the meaning", () => {
    expect(fromMilliliters(1500, "l")).toBe(1.5);
    expect(fromMilliliters(250, "ml")).toBe(250);
    expect(formatVolume(2000, "l")).toBe("2 l");
  });

  it("survives a round trip closely enough to show the same number", () => {
    expect(fromMilliliters(toMilliliters(1.5, "l"), "l")).toBe(1.5);
    expect(fromMilliliters(toMilliliters(250, "ml"), "ml")).toBe(250);
  });
});

describe("quiet hours", () => {
  it("handles a window that wraps past midnight", () => {
    expect(isWithinQuietHours("23:30", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours("02:00", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours("06:59", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours("07:00", "22:00", "07:00")).toBe(false);
    expect(isWithinQuietHours("13:00", "22:00", "07:00")).toBe(false);
  });

  it("handles a window inside a single day", () => {
    expect(isWithinQuietHours("13:30", "13:00", "14:00")).toBe(true);
    expect(isWithinQuietHours("12:59", "13:00", "14:00")).toBe(false);
  });

  it("never notifies while notifications are switched off", () => {
    expect(mayNotify(resolvePreferences(), "12:00")).toBe(false);
  });

  it("notifies only outside quiet hours once enabled", () => {
    const prefs = resolvePreferences({ notifications: { enabled: true } });
    expect(mayNotify(prefs, "12:00")).toBe(true);
    expect(mayNotify(prefs, "23:00")).toBe(false);
  });
});
