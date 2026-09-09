/**
 * Many timers at once.
 *
 * A focus block, a rest between sets, a pot on the stove and a study session
 * can all be running together, and none of them may interfere with another.
 * The existing `focusTimer` models one Pomodoro cycle with phases; this is the
 * general registry that lets any number of independent countdowns coexist.
 *
 * Every timer derives its remaining time from `startedAt` and the clock, never
 * from a tick. That is what makes several timers cheap — the app can run one
 * render loop for all of them instead of one interval each — and it is the
 * only way any of them survives a backgrounded tab, a locked phone, or the app
 * being closed and reopened.
 */

export type TimerKind = "focus" | "rest" | "break" | "study" | "custom";

export type TimerPhase = "running" | "paused" | "finished";

export type Timer = {
  id: string;
  kind: TimerKind;
  label: string;
  /** How long the countdown runs for. */
  durationMs: number;
  phase: TimerPhase;
  /** Epoch ms the current run segment began. Absent while paused. */
  startedAt?: number;
  /** Banked ms from earlier segments. */
  carriedMs: number;
  /** Counts up instead of down — a stopwatch has no duration to reach. */
  countUp?: boolean;
  /** What the timer is for, so a finished alert can name it. */
  linkedKind?: string;
  linkedId?: string;
  /** Whether this one is shown in the floating/compact display. */
  pinned?: boolean;
  createdAt: number;
};

export type TimerRegistry = {
  timers: Record<string, Timer>;
  /** Insertion order, so the list does not reshuffle as timers change state. */
  order: string[];
};

export function createRegistry(): TimerRegistry {
  return { timers: {}, order: [] };
}

let counter = 0;

export function createTimer({
  kind = "custom",
  label,
  durationMs,
  countUp = false,
  linkedKind,
  linkedId,
  now,
}: {
  kind?: TimerKind;
  label: string;
  durationMs: number;
  countUp?: boolean;
  linkedKind?: string;
  linkedId?: string;
  now: number;
}): Timer {
  counter += 1;
  return {
    id: `t${now.toString(36)}${counter.toString(36)}`,
    kind,
    label,
    durationMs: Math.max(0, Math.round(durationMs)),
    phase: "running",
    startedAt: now,
    carriedMs: 0,
    countUp,
    linkedKind,
    linkedId,
    createdAt: now,
  };
}

/** Elapsed ms, read from the clock rather than counted. */
export function elapsedMs(timer: Timer, now: number): number {
  if (timer.startedAt === undefined) return timer.carriedMs;
  return timer.carriedMs + Math.max(0, now - timer.startedAt);
}

export function remainingMs(timer: Timer, now: number): number {
  if (timer.countUp) return 0;
  return Math.max(0, timer.durationMs - elapsedMs(timer, now));
}

export function isExpired(timer: Timer, now: number): boolean {
  if (timer.countUp) return false;
  return timer.phase === "running" && remainingMs(timer, now) === 0;
}

export function addTimer(registry: TimerRegistry, timer: Timer): TimerRegistry {
  return {
    timers: { ...registry.timers, [timer.id]: timer },
    order: [...registry.order, timer.id],
  };
}

export function removeTimer(
  registry: TimerRegistry,
  id: string
): TimerRegistry {
  const { [id]: _removed, ...timers } = registry.timers;
  return { timers, order: registry.order.filter(existing => existing !== id) };
}

/**
 * Changes one timer and leaves every other alone.
 *
 * This is the whole safety property of the module: pausing the rest timer must
 * not touch the focus timer, so every operation goes through here rather than
 * rebuilding the registry.
 */
function update(
  registry: TimerRegistry,
  id: string,
  change: (timer: Timer) => Timer
): TimerRegistry {
  const timer = registry.timers[id];
  if (!timer) return registry;
  return { ...registry, timers: { ...registry.timers, [id]: change(timer) } };
}

export function pauseTimer(
  registry: TimerRegistry,
  id: string,
  now: number
): TimerRegistry {
  return update(registry, id, timer =>
    timer.phase !== "running"
      ? timer
      : {
          ...timer,
          phase: "paused",
          carriedMs: elapsedMs(timer, now),
          startedAt: undefined,
        }
  );
}

export function resumeTimer(
  registry: TimerRegistry,
  id: string,
  now: number
): TimerRegistry {
  return update(registry, id, timer =>
    timer.phase !== "paused"
      ? timer
      : { ...timer, phase: "running", startedAt: now }
  );
}

export function resetTimer(
  registry: TimerRegistry,
  id: string,
  now: number
): TimerRegistry {
  return update(registry, id, timer => ({
    ...timer,
    phase: "running",
    startedAt: now,
    carriedMs: 0,
  }));
}

/** Ends a timer, reporting the time it actually ran for so it can be logged. */
export function finishTimer(
  registry: TimerRegistry,
  id: string,
  now: number
): { registry: TimerRegistry; ranMs: number } {
  const timer = registry.timers[id];
  if (!timer) return { registry, ranMs: 0 };

  const ran = timer.countUp
    ? elapsedMs(timer, now)
    : Math.min(elapsedMs(timer, now), timer.durationMs);

  return {
    registry: update(registry, id, current => ({
      ...current,
      phase: "finished",
      carriedMs: ran,
      startedAt: undefined,
    })),
    ranMs: ran,
  };
}

export function allTimers(registry: TimerRegistry): Timer[] {
  return registry.order
    .map(id => registry.timers[id])
    .filter((timer): timer is Timer => Boolean(timer));
}

export function runningTimers(registry: TimerRegistry): Timer[] {
  return allTimers(registry).filter(timer => timer.phase === "running");
}

/**
 * Timers whose countdown has reached zero but which have not been closed off
 * yet. Returned so the caller can alert once per timer — including for ones
 * that ran out while the app was closed.
 */
export function expiredTimers(registry: TimerRegistry, now: number): Timer[] {
  return allTimers(registry).filter(timer => isExpired(timer, now));
}

/**
 * The timer the compact display should show.
 *
 * A pinned timer wins. Otherwise it is whichever running countdown finishes
 * soonest, because that is the one about to need attention. Stopwatches never
 * take the slot from a countdown — they are not waiting on anything.
 */
export function primaryTimer(
  registry: TimerRegistry,
  now: number
): Timer | null {
  const running = runningTimers(registry);
  if (running.length === 0) return null;

  const pinned = running.find(timer => timer.pinned);
  if (pinned) return pinned;

  const countdowns = running.filter(timer => !timer.countUp);
  if (countdowns.length === 0) return running[0];

  return countdowns.reduce((soonest, timer) =>
    remainingMs(timer, now) < remainingMs(soonest, now) ? timer : soonest
  );
}

export function pinTimer(registry: TimerRegistry, id: string): TimerRegistry {
  return {
    ...registry,
    timers: Object.fromEntries(
      Object.entries(registry.timers).map(([timerId, timer]) => [
        timerId,
        // Only one at a time; pinning a second unpins the first.
        { ...timer, pinned: timerId === id },
      ])
    ),
  };
}

/** mm:ss, or h:mm:ss once it passes an hour. */
export function formatTimer(timer: Timer, now: number): string {
  const ms = timer.countUp ? elapsedMs(timer, now) : remainingMs(timer, now);
  const total = timer.countUp ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Restores timers read back from storage.
 *
 * Anything that ran out while the app was closed comes back finished, holding
 * its real duration — not a countdown showing a large negative number, and not
 * a session inflated to the hours the app happened to be shut.
 */
export function rehydrate(registry: TimerRegistry, now: number): TimerRegistry {
  let next = registry;
  for (const timer of allTimers(registry)) {
    if (isExpired(timer, now)) {
      next = finishTimer(next, timer.id, now).registry;
    }
  }
  return next;
}

/** Clears finished timers, leaving anything still running or paused. */
export function clearFinished(registry: TimerRegistry): TimerRegistry {
  let next = registry;
  for (const timer of allTimers(registry)) {
    if (timer.phase === "finished") next = removeTimer(next, timer.id);
  }
  return next;
}

/** A line for the compact display when several are going at once. */
export function registrySummary(registry: TimerRegistry, now: number): string {
  const running = runningTimers(registry);
  if (running.length === 0) return "No timers running";
  if (running.length === 1) {
    return `${running[0].label} · ${formatTimer(running[0], now)}`;
  }
  const primary = primaryTimer(registry, now);
  const others = running.length - 1;
  return `${primary?.label} · ${primary ? formatTimer(primary, now) : ""} · +${others} more`;
}
