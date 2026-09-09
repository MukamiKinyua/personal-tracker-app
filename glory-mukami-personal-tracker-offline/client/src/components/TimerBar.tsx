/**
 * The timer you can see from anywhere.
 *
 * Deliberately small and out of the way when one timer is running, and only
 * expanding when asked. A rest between sets is glanced at, not read.
 *
 * It shows nothing at all when no timer is running, because a persistent
 * empty widget is furniture — it teaches the eye to skip the corner it lives
 * in, which is exactly the corner that needs to be noticed later.
 */

import { useTimers } from "@/contexts/TimersContext";
import { formatTimer } from "@/lib/core/timers";
import { useState } from "react";

const PRESETS = [
  { label: "Rest", minutes: 1.5, kind: "rest" as const },
  { label: "Focus", minutes: 25, kind: "focus" as const },
  { label: "Study", minutes: 45, kind: "study" as const },
];

export function TimerBar() {
  const timers = useTimers();
  const [open, setOpen] = useState(false);

  const { primary, running, now } = timers;
  const others = running.filter(timer => timer.id !== primary?.id).length;

  if (!primary && !open) {
    return (
      <button
        type="button"
        className="timer-bar-launch"
        onClick={() => setOpen(true)}
      >
        Timer
      </button>
    );
  }

  return (
    <div className="timer-bar" role="status" aria-live="polite">
      {primary ? (
        <div className="timer-bar-primary">
          <b>{formatTimer(primary, now)}</b>
          <span>{primary.label}</span>
          {others > 0 ? <small>+{others} more</small> : null}

          <button
            type="button"
            onClick={() =>
              primary.phase === "paused"
                ? timers.resume(primary.id)
                : timers.pause(primary.id)
            }
          >
            {primary.phase === "paused" ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => timers.finish(primary.id)}>
            Stop
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="timer-bar-toggle"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {open ? "Close" : "More"}
      </button>

      {open ? (
        <div className="timer-bar-panel">
          <div className="timer-bar-presets">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  timers.start({
                    label: preset.label,
                    minutes: preset.minutes,
                    kind: preset.kind,
                  })
                }
              >
                {preset.label}
                <small>
                  {preset.minutes < 1
                    ? `${preset.minutes * 60}s`
                    : `${preset.minutes}m`}
                </small>
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                timers.start({ label: "Stopwatch", minutes: 0, countUp: true })
              }
            >
              Stopwatch
              <small>counts up</small>
            </button>
          </div>

          {timers.timers.length > 0 ? (
            <ul className="timer-bar-list">
              {timers.timers.map(timer => (
                <li key={timer.id}>
                  <span className="timer-bar-time">
                    {formatTimer(timer, now)}
                  </span>
                  <span>{timer.label}</span>
                  <small>
                    {timer.phase === "finished"
                      ? "done"
                      : timer.phase === "paused"
                        ? "paused"
                        : "running"}
                  </small>
                  {timer.phase !== "finished" ? (
                    <button
                      type="button"
                      onClick={() => timers.pin(timer.id)}
                      aria-label={`Show ${timer.label} in the bar`}
                    >
                      Pin
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => timers.remove(timer.id)}
                    aria-label={`Remove ${timer.label}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="timer-bar-empty">No timers yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
