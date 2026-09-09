/**
 * The focus timer state machine.
 *
 * The requirement is a countdown that pauses, resets, and logs completed
 * blocks — and, from the acceptance criteria, one that survives the browser
 * tab being backgrounded and returns the correct elapsed time.
 *
 * That last point decides the whole design: elapsed time is *derived* from
 * timestamps, never accumulated by a tick. Browsers throttle timers in
 * background tabs, so any design that counts intervals silently loses minutes.
 * A render loop may still tick once a second, but only to re-read the clock.
 */

export type TimerPhase =
  /** Nothing started. */
  | "idle"
  /** A focus block is counting down. */
  | "focus"
  /** A break is counting down. */
  | "break"
  /** Stopped mid-block, resumable. */
  | "paused"
  /** The block ran to zero and is waiting to be logged or continued. */
  | "finished";

export type FocusTimer = {
  phase: TimerPhase;
  /**
   * Whether the current or most recent block is focus or break.
   *
   * Stored rather than inferred from the phase. Once a block is paused or
   * finished the phase no longer says which kind it was, and inferring it made
   * a finished break report the focus length as its remaining time.
   */
  blockKind: "focus" | "break";
  focusMinutes: number;
  breakMinutes: number;
  /** Epoch ms the current run segment began. Absent while paused or idle. */
  segmentStartedAt?: number;
  /** Completed ms from earlier segments of this same block. */
  carriedMs: number;
  /** Completed focus blocks since the last reset. */
  completedBlocks: number;
  /** What the session is attributed to (task, project, or course). */
  attribution?: { kind: string; id: string; label: string };
};

export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;

export function createTimer(
  focusMinutes = DEFAULT_FOCUS_MINUTES,
  breakMinutes = DEFAULT_BREAK_MINUTES
): FocusTimer {
  return {
    phase: "idle",
    blockKind: "focus",
    focusMinutes,
    breakMinutes,
    carriedMs: 0,
    completedBlocks: 0,
  };
}

/** How long the current block is meant to run. */
export function blockDurationMs(timer: FocusTimer): number {
  const minutes =
    timer.blockKind === "break" ? timer.breakMinutes : timer.focusMinutes;
  return minutes * 60_000;
}

/**
 * Elapsed ms in the current block, read from the clock rather than counted.
 * This is what makes a backgrounded tab return the right number.
 */
export function elapsedMs(timer: FocusTimer, now: number): number {
  if (timer.segmentStartedAt === undefined) return timer.carriedMs;
  return timer.carriedMs + Math.max(0, now - timer.segmentStartedAt);
}

export function remainingMs(timer: FocusTimer, now: number): number {
  return Math.max(0, blockDurationMs(timer) - elapsedMs(timer, now));
}

/** True once the block has run its full length. */
export function isExpired(timer: FocusTimer, now: number): boolean {
  if (timer.phase !== "focus" && timer.phase !== "break") return false;
  return remainingMs(timer, now) === 0;
}

export function start(
  timer: FocusTimer,
  now: number,
  attribution?: FocusTimer["attribution"]
): FocusTimer {
  return {
    ...timer,
    phase: "focus",
    blockKind: "focus",
    segmentStartedAt: now,
    carriedMs: 0,
    attribution: attribution ?? timer.attribution,
  };
}

export function pause(timer: FocusTimer, now: number): FocusTimer {
  if (timer.phase !== "focus" && timer.phase !== "break") return timer;
  return {
    ...timer,
    phase: "paused",
    // Bank what has run so far; the segment clock stops here.
    carriedMs: elapsedMs(timer, now),
    segmentStartedAt: undefined,
  };
}

export function resume(timer: FocusTimer, now: number): FocusTimer {
  if (timer.phase !== "paused") return timer;
  return {
    ...timer,
    // Back to whichever kind of block was interrupted.
    phase: timer.blockKind,
    segmentStartedAt: now,
  };
}

export function reset(timer: FocusTimer): FocusTimer {
  return {
    ...createTimer(timer.focusMinutes, timer.breakMinutes),
    attribution: timer.attribution,
  };
}

/**
 * Ends the current block early and moves on. The elapsed time is returned so
 * the caller can still log the partial session — skipping a block is not the
 * same as it never happening.
 */
export function skip(
  timer: FocusTimer,
  now: number
): { timer: FocusTimer; loggedMinutes: number } {
  const ran = Math.round(elapsedMs(timer, now) / 60_000);
  const wasFocus = timer.blockKind === "focus";

  return {
    timer: {
      ...timer,
      phase: "idle",
      segmentStartedAt: undefined,
      carriedMs: 0,
      completedBlocks: timer.completedBlocks,
    },
    loggedMinutes: wasFocus ? ran : 0,
  };
}

/**
 * Marks the block finished. Called when the countdown reaches zero, and safe
 * to call late — a tab woken after 40 minutes still logs the block length
 * rather than the wall time since it started.
 */
export function complete(
  timer: FocusTimer,
  now: number
): { timer: FocusTimer; loggedMinutes: number } {
  const wasFocus = timer.blockKind === "focus";
  const ran = elapsedMs(timer, now);
  const capped = Math.min(ran, blockDurationMs(timer));

  return {
    timer: {
      ...timer,
      phase: "finished",
      segmentStartedAt: undefined,
      carriedMs: capped,
      completedBlocks: wasFocus
        ? timer.completedBlocks + 1
        : timer.completedBlocks,
    },
    loggedMinutes: wasFocus ? Math.round(capped / 60_000) : 0,
  };
}

/** Moves from a finished focus block into its break. */
export function startBreak(timer: FocusTimer, now: number): FocusTimer {
  return {
    ...timer,
    phase: "break",
    blockKind: "break",
    segmentStartedAt: now,
    carriedMs: 0,
  };
}

/** mm:ss for the countdown display. */
export function formatRemaining(timer: FocusTimer, now: number): string {
  const total = Math.ceil(remainingMs(timer, now) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The state named plainly. The requirements ask the current state to be
 * unmistakable rather than inferred from whether a number is moving.
 */
export function phaseLabel(timer: FocusTimer): string {
  switch (timer.phase) {
    case "idle":
      return "Ready";
    case "focus":
      return "Focusing";
    case "break":
      return "On a break";
    case "paused":
      return timer.blockKind === "break" ? "Break paused" : "Paused";
    case "finished":
      return timer.blockKind === "break" ? "Break finished" : "Block finished";
    default:
      return "";
  }
}

/**
 * Restores a timer read back from storage. A block that expired while the app
 * was closed is surfaced as finished rather than as a countdown showing a
 * large negative number.
 */
export function rehydrate(timer: FocusTimer, now: number): FocusTimer {
  if (timer.phase !== "focus" && timer.phase !== "break") return timer;
  if (!isExpired(timer, now)) return timer;
  return complete(timer, now).timer;
}
