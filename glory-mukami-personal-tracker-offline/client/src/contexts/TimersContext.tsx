/**
 * Timers that outlive the page you started them on.
 *
 * A rest timer that stops when you navigate away is worse than no rest timer,
 * because you trusted it. So the registry lives above the router, is persisted,
 * and is restored on load — a countdown that ran out while the app was closed
 * comes back finished rather than as a large negative number.
 *
 * Nothing here counts ticks. Every remaining time is derived from the clock, so
 * one interval drives any number of timers and each of them survives a phone
 * locking, a tab sleeping, or the app being killed outright.
 */

import { openStore, type JournalStore } from "@/lib/core/storage";
import {
  addTimer,
  allTimers,
  clearFinished,
  createRegistry,
  createTimer,
  expiredTimers,
  finishTimer,
  pauseTimer,
  pinTimer,
  primaryTimer,
  rehydrate,
  removeTimer,
  resetTimer,
  resumeTimer,
  type Timer,
  type TimerKind,
  type TimerRegistry,
} from "@/lib/core/timers";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "timers";

type TimersValue = {
  timers: Timer[];
  running: Timer[];
  primary: Timer | null;
  /** Re-rendered once a second so countdowns move. */
  now: number;
  start: (input: {
    label: string;
    minutes: number;
    kind?: TimerKind;
    countUp?: boolean;
  }) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  reset: (id: string) => void;
  finish: (id: string) => void;
  remove: (id: string) => void;
  pin: (id: string) => void;
  clearDone: () => void;
};

const TimersContext = createContext<TimersValue | null>(null);

export function TimersProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<TimerRegistry>(() =>
    createRegistry()
  );
  const [now, setNow] = useState(() => Date.now());

  const storeRef = useRef<JournalStore | null>(null);
  const registryRef = useRef(registry);
  const announced = useRef(new Set<string>());

  const commit = useCallback((next: TimerRegistry) => {
    registryRef.current = next;
    setRegistry(next);
    void storeRef.current?.set(STORAGE_KEY, next);
  }, []);

  // Restore anything that was running when the app was last closed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = await openStore();
      if (cancelled) return;
      storeRef.current = store;

      const saved = await store.get<TimerRegistry>(STORAGE_KEY);
      if (cancelled || !saved) return;

      // Anything that ran out while the app was shut comes back finished,
      // holding its real length rather than the hours the app was closed.
      const restored = rehydrate(saved, Date.now());
      registryRef.current = restored;
      setRegistry(restored);
    })().catch(() => {
      // A timer that cannot be restored is not worth blocking the app for.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * One interval for every timer.
   *
   * It only re-renders; it never advances a count. That is what keeps a
   * throttled background tab from losing time — the clock is read fresh each
   * tick rather than being incremented.
   */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Announce a countdown reaching zero, once per timer.
  useEffect(() => {
    for (const timer of expiredTimers(registryRef.current, now)) {
      if (announced.current.has(timer.id)) continue;
      announced.current.add(timer.id);
      toast(`${timer.label} is up`);
      commit(finishTimer(registryRef.current, timer.id, now).registry);
    }
  }, [commit, now]);

  const value: TimersValue = {
    timers: allTimers(registry),
    running: allTimers(registry).filter(timer => timer.phase === "running"),
    primary: primaryTimer(registry, now),
    now,
    start: ({ label, minutes, kind = "custom", countUp = false }) =>
      commit(
        addTimer(
          registryRef.current,
          createTimer({
            kind,
            label,
            durationMs: minutes * 60_000,
            countUp,
            now: Date.now(),
          })
        )
      ),
    pause: id => commit(pauseTimer(registryRef.current, id, Date.now())),
    resume: id => commit(resumeTimer(registryRef.current, id, Date.now())),
    reset: id => {
      announced.current.delete(id);
      commit(resetTimer(registryRef.current, id, Date.now()));
    },
    finish: id =>
      commit(finishTimer(registryRef.current, id, Date.now()).registry),
    remove: id => {
      announced.current.delete(id);
      commit(removeTimer(registryRef.current, id));
    },
    pin: id => commit(pinTimer(registryRef.current, id)),
    clearDone: () => commit(clearFinished(registryRef.current)),
  };

  return (
    <TimersContext.Provider value={value}>{children}</TimersContext.Provider>
  );
}

export function useTimers(): TimersValue {
  const value = useContext(TimersContext);
  if (!value) {
    throw new Error("useTimers must be used inside a TimersProvider.");
  }
  return value;
}
