/**
 * Setup preferences and the unit conversions that depend on them.
 *
 * Requirement 2.1 asks setup to collect only what improves the experience and
 * to let the user skip all of it and change it later. Every field here is
 * therefore optional in `PreferenceInput` and resolved against a default, so a
 * user who skips onboarding entirely still gets a coherent application rather
 * than a half-configured one.
 */

import { detectTimeZone } from "./datetime";

export type VolumeUnit = "ml" | "l" | "oz" | "cup";
export type MeasurementSystem = "metric" | "imperial";

/** The areas 2.1 lets the user choose to track. Nothing is forced on. */
export type TrackedArea =
  | "movement"
  | "workouts"
  | "nutrition"
  | "water"
  | "sleep"
  | "period"
  | "wellbeing"
  | "habits"
  | "focus"
  | "digital-life"
  | "education"
  | "tasks"
  | "finances"
  | "learning"
  | "goals"
  | "relationships"
  | "home";

export type Preferences = {
  displayName: string;
  timezone: string;
  locale: string;
  measurement: MeasurementSystem;
  volumeUnit: VolumeUnit;
  currency: string;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: number;
  /** Wall clock times, used to offer sensible defaults and never enforced. */
  typicalBedTime?: string;
  typicalWakeTime?: string;
  /** The user's own targets, so pages measure against them rather than a norm. */
  sleepGoalHours: number;
  waterGoalMl: number;
  areas: TrackedArea[];
  notifications: {
    enabled: boolean;
    /** Reminders are suppressed inside this window (3.6, 3.11). */
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  /** Hides personal detail for shared screens (3.1). */
  privacyMode: boolean;
  reducedMotion: "system" | "always" | "never";
  onboardingCompleted: boolean;
};

export type PreferenceInput = Partial<Omit<Preferences, "notifications">> & {
  notifications?: Partial<Preferences["notifications"]>;
};

/**
 * What is tracked before the user chooses. Deliberately broad but not
 * exhaustive: the sensitive areas stay off until deliberately switched on,
 * because 2.8 asks for a specific user action before that kind of data is
 * collected at all.
 */
export const DEFAULT_AREAS: TrackedArea[] = [
  "water",
  "sleep",
  "wellbeing",
  "habits",
  "tasks",
  "movement",
  "focus",
  "goals",
];

export function defaultPreferences(): Preferences {
  return {
    displayName: "",
    timezone: detectTimeZone(),
    locale: typeof navigator !== "undefined" ? navigator.language : "en-GB",
    measurement: "metric",
    volumeUnit: "ml",
    sleepGoalHours: 8,
    waterGoalMl: 2000,
    currency: "KES",
    weekStartsOn: 1,
    areas: [...DEFAULT_AREAS],
    notifications: {
      enabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    },
    privacyMode: false,
    reducedMotion: "system",
    onboardingCompleted: false,
  };
}

/** Merges a saved or partial set over the defaults without losing nesting. */
export function resolvePreferences(input: PreferenceInput = {}): Preferences {
  const base = defaultPreferences();
  return {
    ...base,
    ...input,
    areas: input.areas ?? base.areas,
    notifications: { ...base.notifications, ...input.notifications },
  };
}

export function isTracking(
  preferences: Preferences,
  area: TrackedArea
): boolean {
  return preferences.areas.includes(area);
}

/** Turning an area off never deletes its records — 3.13 is explicit about it. */
export function setAreaTracked(
  preferences: Preferences,
  area: TrackedArea,
  tracked: boolean
): Preferences {
  const areas = tracked
    ? Array.from(new Set([...preferences.areas, area]))
    : preferences.areas.filter(existing => existing !== area);
  return { ...preferences, areas };
}

const ML_PER_UNIT: Record<VolumeUnit, number> = {
  ml: 1,
  l: 1000,
  // US fluid ounce and US customary cup.
  oz: 29.5735,
  cup: 236.588,
};

/**
 * Volumes are stored in millilitres whatever the user types in, so a history
 * spanning a change of unit still totals correctly. The export documents this
 * so the numbers are not a mystery outside the app either (2.8).
 */
export function toMilliliters(amount: number, unit: VolumeUnit): number {
  return Math.round(amount * ML_PER_UNIT[unit]);
}

export function fromMilliliters(ml: number, unit: VolumeUnit): number {
  const value = ml / ML_PER_UNIT[unit];
  // Litres, ounces and cups need a decimal to stay useful; millilitres do not.
  return unit === "ml" ? Math.round(value) : Math.round(value * 10) / 10;
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  return `${fromMilliliters(ml, unit)} ${unit}`;
}

/**
 * Whether a reminder may be delivered now. 3.6 and 3.11 both require quiet
 * hours to be respected; a window that wraps past midnight is the normal case
 * here rather than the edge case.
 */
export function isWithinQuietHours(
  time: string,
  quietStart: string,
  quietEnd: string
): boolean {
  const minutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const now = minutes(time);
  const start = minutes(quietStart);
  const end = minutes(quietEnd);

  return start <= end ? now >= start && now < end : now >= start || now < end;
}

export function mayNotify(preferences: Preferences, time: string): boolean {
  if (!preferences.notifications.enabled) return false;
  return !isWithinQuietHours(
    time,
    preferences.notifications.quietHoursStart,
    preferences.notifications.quietHoursEnd
  );
}
