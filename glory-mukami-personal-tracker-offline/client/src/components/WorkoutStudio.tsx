/**
 * What you actually lifted, as opposed to what the routine suggested.
 *
 * The routine page above answers "what should I do"; this answers "what did I
 * do", which is the only half that can show progress. Everything here is
 * computed from logged sets and nothing else — there is no calorie estimate,
 * because turning reps into calories needs body data this app does not ask for.
 *
 * One record per set, rather than one per session holding an array of them.
 * A set is a thing that happened, so logging is an append: two devices at the
 * same gym session can both log and both survive, where rewriting a session's
 * array on every set would mean whichever synced second erased the other.
 */

import { useRecordStore } from "@/contexts/RecordStoreContext";
import { useTimers } from "@/contexts/TimersContext";
import { shiftDayKey, weekStartKey, type DayKey } from "@/lib/core/datetime";
import {
  DEFAULT_REST_SECONDS,
  describeRest,
  describeSession,
  loadComparison,
  personalRecordMessage,
  sessionLoad,
  totalLoad,
  updatePersonalRecord,
  type LoggedExercise,
  type PersonalRecord,
} from "@/lib/core/workoutLoad";
import { useState } from "react";

const SCOPE = "workout-set";

/**
 * "Back Squat" and "back squat " are the same lift, and a personal record that
 * split across two spellings would silently never be beaten.
 */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export function positive(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * The sets logged on one day, grouped into the exercises they belong to.
 *
 * Takes only the `body` of each record, so it can be reasoned about — and
 * tested — without a whole sync envelope around it.
 */
export function exercisesFrom(
  records: Array<{ body: Record<string, unknown> }>
): LoggedExercise[] {
  const grouped = new Map<string, LoggedExercise>();

  for (const record of records) {
    const name = String(record.body.name ?? "").trim();
    if (!name) continue;

    const exerciseId = String(record.body.exerciseId ?? exerciseKey(name));
    const existing = grouped.get(exerciseId) ?? {
      exerciseId,
      name,
      sets: [],
    };

    existing.sets.push({
      reps: Math.max(0, Math.round(Number(record.body.reps) || 0)),
      weightKg: positive(record.body.weightKg),
    });

    // An exercise's effort is the hardest any of its sets felt. Averaging would
    // let one brutal final set disappear into three easy ones.
    const effort = positive(record.body.effort);
    if (effort !== undefined) {
      existing.effort = Math.max(existing.effort ?? 0, effort);
    }

    grouped.set(exerciseId, existing);
  }

  return Array.from(grouped.values());
}

export function WorkoutStudio() {
  const journal = useRecordStore();
  const timers = useTimers();

  const [name, setName] = useState("");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [effort, setEffort] = useState("");
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST_SECONDS);
  const [pr, setPr] = useState<string>();

  const byDay = journal.byDay(SCOPE);
  const todaysSets = journal.onDay(SCOPE, journal.today);
  const todaysExercises = exercisesFrom(todaysSets);
  const today = sessionLoad(todaysExercises);

  /*
   * Records are folded day by day in order, so `achievedOn` is the day the
   * best was actually set rather than the day it was last looked at.
   */
  const history = new Map<string, PersonalRecord>();
  const past = Array.from(byDay.keys())
    .filter(day => day < journal.today)
    .sort();
  for (const day of past) {
    for (const exercise of exercisesFrom(byDay.get(day) ?? [])) {
      const { record } = updatePersonalRecord(
        history.get(exercise.exerciseId),
        exercise,
        day
      );
      history.set(exercise.exerciseId, record);
    }
  }

  /*
   * The board shows bests including today. `history` stays separate because
   * beating a record means beating a previous day: comparing today against a
   * board that already contains today could never find anything.
   */
  const board = new Map(history);
  for (const exercise of todaysExercises) {
    const { record } = updatePersonalRecord(
      board.get(exercise.exerciseId),
      exercise,
      journal.today
    );
    board.set(exercise.exerciseId, record);
  }

  const beatenToday = todaysExercises
    .map(exercise =>
      personalRecordMessage(
        exercise,
        updatePersonalRecord(
          history.get(exercise.exerciseId),
          exercise,
          journal.today
        ).beaten
      )
    )
    .filter((message): message is string => message !== null);

  function weekLoad(weekStart: DayKey) {
    const days: DayKey[] = Array.from({ length: 7 }, (_, index) =>
      shiftDayKey(weekStart, index)
    );
    return totalLoad(
      days.map(day => sessionLoad(exercisesFrom(byDay.get(day) ?? [])))
    );
  }

  const thisWeekStart = weekStartKey(journal.today);
  const thisWeek = weekLoad(thisWeekStart);
  const comparison = loadComparison(
    thisWeek,
    [1, 2, 3].map(back => weekLoad(shiftDayKey(thisWeekStart, -7 * back)))
  );

  function logSet() {
    const trimmed = name.trim();
    const repCount = positive(reps);
    if (!trimmed || repCount === undefined) return;

    const exerciseId = exerciseKey(trimmed);
    const weightKg = positive(weight);
    const rated = positive(effort);

    journal.add({
      scope: SCOPE,
      body: {
        exerciseId,
        name: trimmed,
        reps: Math.round(repCount),
        ...(weightKg === undefined ? {} : { weightKg }),
        ...(rated === undefined ? {} : { effort: rated }),
      },
      undoLabel: `Logged ${trimmed}`,
    });

    /*
     * The rest goes to the shared timers, not to a countdown owned by this
     * page: rest runs while you put the weights back, walk away, and check
     * something else, so a timer that died on navigation would be useless.
     */
    timers.start({
      kind: "rest",
      label: `${describeRest(restSeconds)} · ${trimmed}`,
      minutes: restSeconds / 60,
    });

    /*
     * Measured against the best up to and including the sets already logged
     * today — `board`, not `history`. Comparing against history alone would
     * re-announce a record on every lighter set that followed the one which
     * actually set it.
     */
    const justLogged: LoggedExercise = {
      exerciseId,
      name: trimmed,
      sets: [{ reps: Math.round(repCount), weightKg }],
    };
    setPr(
      personalRecordMessage(
        justLogged,
        updatePersonalRecord(board.get(exerciseId), justLogged, journal.today)
          .beaten
      ) ?? undefined
    );

    // The name, weight and rest carry to the next set: the common case is
    // another set of the same thing, not a different exercise.
  }

  const records = Array.from(board.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="workout-studio">
      <div className="studio-heading">
        <b>What you lifted</b>
        <small>
          {today.exercises === 0
            ? "Nothing logged today."
            : describeSession(today)}
        </small>
      </div>

      <div className="studio-log">
        <input
          value={name}
          placeholder="Exercise"
          onChange={event => setName(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") logSet();
          }}
        />
        <label>
          Reps
          <input
            type="number"
            min={1}
            value={reps}
            onChange={event => setReps(event.target.value)}
          />
        </label>
        <label>
          kg
          <input
            type="number"
            min={0}
            step="0.5"
            value={weight}
            placeholder="—"
            onChange={event => setWeight(event.target.value)}
          />
        </label>
        <label>
          Effort
          <select
            value={effort}
            onChange={event => setEffort(event.target.value)}
          >
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={logSet}>
          Log set
        </button>
      </div>

      <p className="studio-note">
        Weight is optional. Bodyweight sets count their reps and add no volume,
        so a press-up session does not read as no session at all.
      </p>

      <div className="studio-rest">
        <span>{describeRest(restSeconds)} after each set</span>
        <button
          type="button"
          onClick={() => setRestSeconds(value => Math.max(15, value - 15))}
          aria-label="Shorten rest by 15 seconds"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setRestSeconds(value => Math.min(600, value + 15))}
          aria-label="Lengthen rest by 15 seconds"
        >
          +
        </button>
      </div>

      {pr ? (
        <p className="studio-pr" role="status">
          {pr}
        </p>
      ) : null}

      {todaysSets.length > 0 ? (
        <ul className="studio-sets">
          {todaysSets.map(record => {
            const setWeight = positive(record.body.weightKg);
            return (
              <li key={record.id}>
                <span>
                  <b>{String(record.body.name ?? "")}</b>{" "}
                  {Number(record.body.reps) || 0} reps
                  {setWeight === undefined ? " (bodyweight)" : ` × ${setWeight} kg`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    journal.remove(record.id, "Removed a set")
                  }
                  aria-label={`Remove this set of ${String(record.body.name ?? "")}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {beatenToday.length > 0 ? (
        <div className="studio-beaten">
          {beatenToday.map(message => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="studio-week">
        <b>This week</b>
        <small>{describeSession(thisWeek)}</small>
        {/* Stated as an observation. Reading a training load back as advice
            would be a health claim this app has no standing to make. */}
        <small>{comparison.note}</small>
      </div>

      {records.length > 0 ? (
        <div className="studio-records">
          <b>Your bests</b>
          <ul>
            {records.map(record => (
              <li key={record.exerciseId}>
                <span>{record.name}</span>
                <small>
                  {[
                    record.bestWeightKg === undefined
                      ? null
                      : `${record.bestWeightKg} kg`,
                    record.bestReps === undefined
                      ? null
                      : `${record.bestReps} reps`,
                    record.bestSetVolumeKg === undefined
                      ? null
                      : `${Math.round(record.bestSetVolumeKg)} kg in a set`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
